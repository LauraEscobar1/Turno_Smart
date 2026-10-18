import { evaluarCandidatos, type ContextoPriorizacion } from '@/services/mock/reglaPriorizacion';
import { estimarRiesgoFicticio } from '@/services/mock/riesgoFicticio';
import type { Cita, Perfil, PreferenciasPaciente } from '@/types';

const AHORA = new Date(2026, 9, 20, 9, 0); // martes 09:00
const DIA = 24 * 60 * 60 * 1000;

const paciente = (id: string, ubicacion: Perfil['ubicacionAproximada'] = null): Perfil => ({
  id,
  nombre: `Paciente ${id}`,
  email: `${id}@correo.co`,
  telefono: null,
  rol: 'paciente',
  consultorioId: null,
  ubicacionAproximada: ubicacion,
  creadoEn: AHORA.toISOString(),
});

const preferencias = (
  pacienteId: string,
  extra: Partial<PreferenciasPaciente> = {},
): [string, PreferenciasPaciente] => [
  pacienteId,
  {
    pacienteId,
    especialidadIds: [],
    franjas: [],
    distanciaMaxKm: null,
    antelacionMinHoras: 1,
    actualizadoEn: AHORA.toISOString(),
    ...extra,
  },
];

const solicitud = (pacienteId: string, diasEsperando: number) => ({
  id: `sol-${pacienteId}`,
  pacienteId,
  especialidadId: 'esp-mg',
  estado: 'activa' as const,
  creadaEn: new Date(AHORA.getTime() - diasEsperando * DIA).toISOString(),
  cerradaEn: null,
});

function contexto(extra: Partial<ContextoPriorizacion> = {}): ContextoPriorizacion {
  return {
    cupo: {
      id: 'cupo-1',
      citaOrigenId: 'cita-origen',
      consultorioId: 'cons-1',
      profesionalId: 'prof-1',
      especialidadId: 'esp-mg',
      fechaHora: new Date(2026, 9, 20, 14, 0).toISOString(),
      duracionMin: 20,
      estado: 'disponible',
      canceladaPor: 'paciente',
      rondaActual: 0,
      citaAsignadaId: null,
      creadoEn: AHORA.toISOString(),
    },
    especialidad: { id: 'esp-mg', nombre: 'Medicina general' },
    consultorio: {
      id: 'cons-1',
      nombre: 'Sede',
      direccion: '',
      coordenadas: { lat: 4.6, lng: -74.07 },
    },
    pacienteOrigenId: 'origen',
    pacientes: [paciente('a'), paciente('b'), paciente('origen')],
    preferencias: new Map([preferencias('a'), preferencias('b'), preferencias('origen')]),
    solicitudes: [solicitud('a', 3), solicitud('b', 20), solicitud('origen', 40)],
    citas: [],
    ofertas: [],
    ahora: AHORA,
    ...extra,
  };
}

describe('regla de priorización simulada', () => {
  it('prioriza a quien más tiempo lleva esperando y excluye a quien canceló', () => {
    const candidatos = evaluarCandidatos(contexto());
    expect(candidatos.map((c) => c.pacienteId)).toEqual(['b', 'a']);
  });

  it('el puntaje es la suma de valor × peso y viene explicado', () => {
    const [primero] = evaluarCandidatos(contexto());
    const { factores, puntaje } = primero!.explicacion;
    const suma = Object.values(factores).reduce((t, f) => t + f.valor * f.peso, 0);
    expect(puntaje).toBeCloseTo(suma, 3);
    expect(factores.tiempoEspera.detalle).toBe(
      'Llevas 20 días en la lista de espera de Medicina general.',
    );
  });

  it('excluye a quien ya tiene una oferta pendiente o ya recibió este cupo', () => {
    const oferta = (pacienteId: string, cupoId: string, estado: 'pendiente' | 'rechazada') => ({
      id: `of-${pacienteId}`,
      cupoId,
      pacienteId,
      ronda: 1,
      estado,
      creadaEn: AHORA.toISOString(),
      expiraEn: AHORA.toISOString(),
      respondidaEn: null,
      explicacion: {
        puntaje: 0,
        factores: evaluarCandidatos(contexto())[0]!.explicacion.factores,
        fuente: 'regla_simulada' as const,
      },
    });
    const candidatos = evaluarCandidatos(
      contexto({
        ofertas: [oferta('b', 'otro-cupo', 'pendiente'), oferta('a', 'cupo-1', 'rechazada')],
      }),
    );
    expect(candidatos).toEqual([]);
  });

  it('respeta franjas, antelación y distancia máxima', () => {
    const lejos = { lat: 4.8, lng: -74.07 }; // ~22 km
    const candidatos = evaluarCandidatos(
      contexto({
        pacientes: [paciente('a'), paciente('b', lejos), paciente('c')],
        solicitudes: [solicitud('a', 3), solicitud('b', 20), solicitud('c', 10)],
        preferencias: new Map([
          // Franja del martes de 08:00 a 12:00: el cupo de las 14:00 no le sirve.
          preferencias('a', { franjas: [{ diaSemana: 2, horaInicio: '08:00', horaFin: '12:00' }] }),
          preferencias('b', { distanciaMaxKm: 10 }),
          // Pide 12 h de antelación y el cupo es en 5 h.
          preferencias('c', { antelacionMinHoras: 12 }),
        ]),
      }),
    );
    expect(candidatos).toEqual([]);
  });

  it('excluye a quien tiene otra cita que se cruza con el cupo', () => {
    const cita: Cita = {
      id: 'cita-b',
      pacienteId: 'b',
      profesionalId: 'otro',
      especialidadId: 'esp-x',
      consultorioId: 'cons-1',
      fechaHora: new Date(2026, 9, 20, 14, 10).toISOString(),
      duracionMin: 30,
      estado: 'confirmada',
      origen: 'agenda',
      cupoOrigenId: null,
      creadaEn: AHORA.toISOString(),
      canceladaEn: null,
    };
    expect(evaluarCandidatos(contexto({ citas: [cita] })).map((c) => c.pacienteId)).toEqual(['a']);
  });

  it('incluye a quien solo marcó la especialidad como interés, con espera 0', () => {
    const candidatos = evaluarCandidatos(
      contexto({
        pacientes: [paciente('x')],
        solicitudes: [],
        preferencias: new Map([preferencias('x', { especialidadIds: ['esp-mg'] })]),
      }),
    );
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]!.explicacion.factores.tiempoEspera.valor).toBe(0);
  });
});

describe('riesgo de inasistencia ficticio', () => {
  const cita = (id: string, estado: Cita['estado'], diasDesdeHoy: number): Cita => ({
    id,
    pacienteId: 'p',
    profesionalId: 'prof',
    especialidadId: 'esp',
    consultorioId: 'cons',
    fechaHora: new Date(AHORA.getTime() + diasDesdeHoy * DIA).toISOString(),
    duracionMin: 20,
    estado,
    origen: 'agenda',
    cupoOrigenId: null,
    creadaEn: AHORA.toISOString(),
    canceladaEn: null,
  });

  it('es alto con varias inasistencias y la cita sin confirmar', () => {
    const proxima = cita('proxima', 'programada', 1);
    const historial = [
      cita('h1', 'inasistencia', -30),
      cita('h2', 'inasistencia', -20),
      cita('h3', 'asistida', -10),
    ];
    const riesgo = estimarRiesgoFicticio(proxima, historial, AHORA);
    expect(riesgo).toMatchObject({ nivel: 'alto', fuente: 'estimacion_ficticia' });
    expect(riesgo.explicacion).toBe(
      '2 inasistencias en sus últimas 3 citas; la cita aún no está confirmada.',
    );
  });

  it('es bajo con buen historial y la cita confirmada', () => {
    const riesgo = estimarRiesgoFicticio(
      cita('proxima', 'confirmada', 1),
      [cita('h1', 'asistida', -10)],
      AHORA,
    );
    expect(riesgo.nivel).toBe('bajo');
    expect(riesgo.recomendacion).toBe('Sin acción adicional.');
  });
});
