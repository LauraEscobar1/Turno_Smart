/**
 * ⚠️ DATOS FICTICIOS — solo para el modo demo (Fase 2).
 * Personas, sedes, direcciones, coordenadas y horarios inventados. Las fechas
 * se generan relativas al momento de arrancar, para que nunca caduquen.
 */
import type {
  Cita,
  Consultorio,
  CupoLiberado,
  Especialidad,
  EventoOferta,
  ExplicacionPrioridad,
  FechaISO,
  Notificacion,
  Oferta,
  Perfil,
  PreferenciasPaciente,
  Profesional,
  SolicitudEspera,
} from '@/types';
import { PESOS_SIMULADOS } from './reglaPriorizacion';

export interface CredencialSimulada {
  perfilId: string;
  /** Texto plano SOLO en la simulación. Supabase Auth guarda hashes. */
  password: string;
}

export interface BaseDeDatos {
  perfiles: Perfil[];
  /** Clave: correo en minúsculas. */
  credenciales: Map<string, CredencialSimulada>;
  especialidades: Especialidad[];
  consultorios: Consultorio[];
  profesionales: Profesional[];
  /** Clave: id del paciente. */
  preferencias: Map<string, PreferenciasPaciente>;
  solicitudes: SolicitudEspera[];
  citas: Cita[];
  cupos: CupoLiberado[];
  ofertas: Oferta[];
  eventos: EventoOferta[];
  notificaciones: Notificacion[];
}

/** Cancelaciones que el servidor ejecuta al arrancar para generar ofertas "en vivo". */
export interface CancelacionInicial {
  citaId: string;
  por: 'paciente' | 'staff';
}

export const PASSWORD_DEMO = 'demo1234';

export const CUENTAS_DEMO = {
  paciente: { email: 'paciente@demo.turnosmart.co', password: PASSWORD_DEMO },
  staff: { email: 'staff@demo.turnosmart.co', password: PASSWORD_DEMO },
  staffNorte: { email: 'staff.norte@demo.turnosmart.co', password: PASSWORD_DEMO },
  otroPaciente: { email: 'carlos@demo.turnosmart.co', password: PASSWORD_DEMO },
} as const;

export const IDS = {
  pacienteDemo: 'pac-demo',
  carlos: 'pac-carlos',
  ana: 'pac-ana',
  jorge: 'pac-jorge',
  lucia: 'pac-lucia',
  pedro: 'pac-pedro',
  staffCentro: 'staff-centro',
  staffNorte: 'staff-norte',
  centro: 'cons-centro',
  norte: 'cons-norte',
  medicinaGeneral: 'esp-medicina-general',
  odontologia: 'esp-odontologia',
  pediatria: 'esp-pediatria',
  dermatologia: 'esp-dermatologia',
  /** Cita próxima del paciente demo (se puede cancelar). */
  citaDemoProxima: 'cita-a5',
  /** Cita que ya comenzó en la Sede Centro (para registrar inasistencia). */
  citaComenzada: 'cita-a4',
  /** Cita futura de la Sede Norte. */
  citaNorte: 'cita-n1',
  /** Cancelada al arrancar: genera la oferta pendiente del paciente demo. */
  citaVivaDemo: 'cita-viva-1',
  /** Cancelada al arrancar por el staff: genera una oferta para Pedro. */
  citaVivaPediatria: 'cita-viva-2',
} as const;

const MS_MIN = 60_000;
const MS_HORA = 60 * MS_MIN;
const MS_DIA = 24 * MS_HORA;

const ISO = (fecha: Date): FechaISO => fecha.toISOString();

const mismoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function enDia(base: Date, dias: number, hora: string): Date {
  const [h, m] = hora.split(':').map(Number);
  const fecha = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias);
  fecha.setHours(h ?? 0, m ?? 0, 0, 0);
  return fecha;
}

function redondearA30(fecha: Date, hacia: 'arriba' | 'abajo'): Date {
  const paso = 30 * MS_MIN;
  const t = fecha.getTime();
  return new Date(hacia === 'arriba' ? Math.ceil(t / paso) * paso : Math.floor(t / paso) * paso);
}

/**
 * "Dentro de N horas", ajustado al horario de atención (07:00–19:00). Si cae fuera,
 * se mueve al día siguiente a las 08:00 + N horas, para que la agenda sea realista
 * a cualquier hora en que se abra la app.
 */
function horaDeAtencion(horas: number, ahora: Date): Date {
  const base = redondearA30(new Date(ahora.getTime() + horas * MS_HORA), 'arriba');
  const hora = base.getHours();
  if (mismoDia(base, ahora) && hora >= 7 && hora < 19) return base;
  const dias = mismoDia(base, ahora) && hora < 7 ? 0 : 1;
  return enDia(ahora, dias, `${8 + horas}:00`);
}

/** Explicación guardada para ofertas históricas (como la habría producido la regla). */
function explicacionHistorica(
  tiempoEspera: [number, string],
  distancia: [number, string],
  historial: [number, string],
): ExplicacionPrioridad {
  const factores = {
    tiempoEspera: {
      valor: tiempoEspera[0],
      peso: PESOS_SIMULADOS.tiempoEspera,
      detalle: tiempoEspera[1],
    },
    compatibilidadHoraria: {
      valor: 0.5,
      peso: PESOS_SIMULADOS.compatibilidadHoraria,
      detalle: 'No indicaste franjas horarias, así que tomamos cualquier horario como posible.',
    },
    distancia: { valor: distancia[0], peso: PESOS_SIMULADOS.distancia, detalle: distancia[1] },
    historialRespuesta: {
      valor: historial[0],
      peso: PESOS_SIMULADOS.historialRespuesta,
      detalle: historial[1],
    },
  };
  const puntaje = Object.values(factores).reduce((t, f) => t + f.valor * f.peso, 0);
  return { puntaje: Math.round(puntaje * 1000) / 1000, factores, fuente: 'regla_simulada' };
}

export function crearSemilla(ahora: Date): {
  db: BaseDeDatos;
  cancelacionesIniciales: CancelacionInicial[];
} {
  const hace = (dias: number, hora: string) => ISO(enDia(ahora, -dias, hora));
  const en = (dias: number, hora: string) => ISO(enDia(ahora, dias, hora));
  const enHorario = (horas: number) => ISO(horaDeAtencion(horas, ahora));
  const desplazar = (iso: FechaISO, minutos: number) =>
    ISO(new Date(new Date(iso).getTime() + minutos * MS_MIN));

  // ───────────── Catálogo ─────────────
  const especialidades: Especialidad[] = [
    { id: IDS.medicinaGeneral, nombre: 'Medicina general' },
    { id: IDS.odontologia, nombre: 'Odontología' },
    { id: IDS.pediatria, nombre: 'Pediatría' },
    { id: IDS.dermatologia, nombre: 'Dermatología' },
  ];

  const consultorios: Consultorio[] = [
    {
      id: IDS.centro,
      nombre: 'Sede Centro',
      direccion: 'Calle 19 # 5-20 (dirección ficticia)',
      coordenadas: { lat: 4.602, lng: -74.07 },
    },
    {
      id: IDS.norte,
      nombre: 'Sede Norte',
      direccion: 'Carrera 15 # 120-30 (dirección ficticia)',
      coordenadas: { lat: 4.7, lng: -74.045 },
    },
  ];

  const profesionales: Profesional[] = [
    {
      id: 'prof-valentina',
      nombre: 'Dra. Valentina Ruiz',
      especialidadId: IDS.medicinaGeneral,
      consultorioId: IDS.centro,
    },
    {
      id: 'prof-camila',
      nombre: 'Dra. Camila Torres',
      especialidadId: IDS.pediatria,
      consultorioId: IDS.centro,
    },
    {
      id: 'prof-andres',
      nombre: 'Dr. Andrés Mejía',
      especialidadId: IDS.odontologia,
      consultorioId: IDS.norte,
    },
    {
      id: 'prof-felipe',
      nombre: 'Dr. Felipe Cárdenas',
      especialidadId: IDS.dermatologia,
      consultorioId: IDS.norte,
    },
    {
      id: 'prof-julian',
      nombre: 'Dr. Julián Ortiz',
      especialidadId: IDS.medicinaGeneral,
      consultorioId: IDS.norte,
    },
  ];

  // ───────────── Personas ─────────────
  const paciente = (
    id: string,
    nombre: string,
    email: string,
    ubicacion: { lat: number; lng: number },
  ): Perfil => ({
    id,
    nombre,
    email,
    telefono: null,
    rol: 'paciente',
    consultorioId: null,
    ubicacionAproximada: ubicacion,
    creadoEn: hace(90, '08:00'),
  });

  const perfiles: Perfil[] = [
    paciente(IDS.pacienteDemo, 'Mariana Rojas', CUENTAS_DEMO.paciente.email, {
      lat: 4.615,
      lng: -74.075,
    }),
    paciente(IDS.carlos, 'Carlos Pérez', CUENTAS_DEMO.otroPaciente.email, {
      lat: 4.63,
      lng: -74.065,
    }),
    paciente(IDS.ana, 'Ana Martínez', 'ana@demo.turnosmart.co', { lat: 4.69, lng: -74.05 }),
    paciente(IDS.jorge, 'Jorge Ramírez', 'jorge@demo.turnosmart.co', { lat: 4.56, lng: -74.1 }),
    paciente(IDS.lucia, 'Lucía Fernández', 'lucia@demo.turnosmart.co', { lat: 4.61, lng: -74.08 }),
    paciente(IDS.pedro, 'Pedro Salazar', 'pedro@demo.turnosmart.co', { lat: 4.6, lng: -74.065 }),
    {
      id: IDS.staffCentro,
      nombre: 'Recepción Sede Centro',
      email: CUENTAS_DEMO.staff.email,
      telefono: null,
      rol: 'staff',
      consultorioId: IDS.centro,
      ubicacionAproximada: null,
      creadoEn: hace(120, '08:00'),
    },
    {
      id: IDS.staffNorte,
      nombre: 'Recepción Sede Norte',
      email: CUENTAS_DEMO.staffNorte.email,
      telefono: null,
      rol: 'staff',
      consultorioId: IDS.norte,
      ubicacionAproximada: null,
      creadoEn: hace(120, '08:00'),
    },
  ];

  const credenciales = new Map<string, CredencialSimulada>(
    perfiles.map((p) => [p.email, { perfilId: p.id, password: PASSWORD_DEMO }]),
  );

  const preferencia = (
    pacienteId: string,
    datos: Partial<Omit<PreferenciasPaciente, 'pacienteId'>>,
  ): [string, PreferenciasPaciente] => [
    pacienteId,
    {
      pacienteId,
      especialidadIds: [],
      franjas: [],
      distanciaMaxKm: null,
      antelacionMinHoras: 2,
      actualizadoEn: hace(30, '08:00'),
      ...datos,
    },
  ];

  const preferencias = new Map<string, PreferenciasPaciente>([
    preferencia(IDS.pacienteDemo, { especialidadIds: [IDS.odontologia], distanciaMaxKm: 10 }),
    preferencia(IDS.carlos, {
      distanciaMaxKm: 5,
      franjas: ([1, 2, 3, 4, 5] as const).map((diaSemana) => ({
        diaSemana,
        horaInicio: '08:00',
        horaFin: '12:00',
      })),
    }),
    preferencia(IDS.ana, { antelacionMinHoras: 1 }),
    preferencia(IDS.jorge, { distanciaMaxKm: 20, antelacionMinHoras: 1 }),
    preferencia(IDS.lucia, { distanciaMaxKm: 10 }),
    preferencia(IDS.pedro, {
      especialidadIds: [IDS.pediatria],
      distanciaMaxKm: 5,
      antelacionMinHoras: 1,
    }),
  ]);

  const solicitudes: SolicitudEspera[] = [
    {
      id: 'sol-demo-mg',
      pacienteId: IDS.pacienteDemo,
      especialidadId: IDS.medicinaGeneral,
      estado: 'activa',
      creadaEn: hace(28, '09:00'),
      cerradaEn: null,
    },
    {
      id: 'sol-demo-derma',
      pacienteId: IDS.pacienteDemo,
      especialidadId: IDS.dermatologia,
      estado: 'cancelada',
      creadaEn: hace(45, '10:00'),
      cerradaEn: hace(33, '18:00'),
    },
    {
      id: 'sol-carlos-mg',
      pacienteId: IDS.carlos,
      especialidadId: IDS.medicinaGeneral,
      estado: 'activa',
      creadaEn: hace(10, '08:30'),
      cerradaEn: null,
    },
    {
      id: 'sol-ana-odonto',
      pacienteId: IDS.ana,
      especialidadId: IDS.odontologia,
      estado: 'activa',
      creadaEn: hace(8, '11:00'),
      cerradaEn: null,
    },
    {
      id: 'sol-jorge-mg',
      pacienteId: IDS.jorge,
      especialidadId: IDS.medicinaGeneral,
      estado: 'activa',
      creadaEn: hace(5, '16:00'),
      cerradaEn: null,
    },
    {
      id: 'sol-lucia-ped',
      pacienteId: IDS.lucia,
      especialidadId: IDS.pediatria,
      estado: 'activa',
      creadaEn: hace(15, '10:00'),
      cerradaEn: null,
    },
  ];

  // ───────────── Citas ─────────────
  const cita = (
    id: string,
    pacienteId: string,
    profesionalId: string,
    fechaHora: FechaISO,
    estado: Cita['estado'],
    extra: Partial<Cita> = {},
  ): Cita => {
    const profesional = profesionales.find((p) => p.id === profesionalId);
    if (!profesional) throw new Error(`Profesional desconocido: ${profesionalId}`);
    return {
      id,
      pacienteId,
      profesionalId,
      especialidadId: profesional.especialidadId,
      consultorioId: profesional.consultorioId,
      fechaHora,
      duracionMin: profesional.especialidadId === IDS.odontologia ? 30 : 20,
      estado,
      origen: 'agenda',
      cupoOrigenId: null,
      creadaEn: ISO(new Date(new Date(fechaHora).getTime() - 20 * MS_DIA)),
      canceladaEn: null,
      ...extra,
    };
  };

  const cupoH1Creado = hace(3, '08:00');
  const cupoH2Creado = hace(6, '09:00');
  const cupoH3Creado = hace(1, '16:00');
  const comenzada = ISO(redondearA30(new Date(ahora.getTime() - 30 * MS_MIN), 'abajo'));
  const fechaRecuperadaDemo = en(1, '10:30');

  const citas: Cita[] = [
    // Historial de asistencia (alimenta el riesgo ficticio y las métricas).
    cita('cita-p-demo-1', IDS.pacienteDemo, 'prof-valentina', hace(20, '09:00'), 'asistida'),
    cita('cita-p-jorge-1', IDS.jorge, 'prof-valentina', hace(40, '10:00'), 'inasistencia'),
    cita('cita-p-jorge-2', IDS.jorge, 'prof-valentina', hace(25, '11:00'), 'inasistencia'),
    cita('cita-p-jorge-3', IDS.jorge, 'prof-valentina', hace(12, '08:30'), 'asistida'),
    cita('cita-p-carlos-1', IDS.carlos, 'prof-valentina', hace(30, '09:30'), 'asistida'),
    cita('cita-p-carlos-2', IDS.carlos, 'prof-valentina', hace(15, '10:00'), 'inasistencia'),
    cita('cita-p-lucia-1', IDS.lucia, 'prof-camila', hace(20, '14:00'), 'asistida'),
    cita('cita-p-lucia-2', IDS.lucia, 'prof-camila', hace(8, '15:00'), 'asistida'),
    cita('cita-p-ana-1', IDS.ana, 'prof-andres', hace(18, '09:00'), 'asistida'),

    // Citas canceladas que liberaron los cupos históricos.
    cita('cita-h1-origen', IDS.pedro, 'prof-valentina', hace(2, '10:00'), 'cancelada', {
      canceladaEn: cupoH1Creado,
    }),
    cita('cita-h2-origen', IDS.jorge, 'prof-valentina', hace(5, '11:00'), 'cancelada', {
      canceladaEn: cupoH2Creado,
    }),
    cita('cita-h3-origen', IDS.pedro, 'prof-andres', fechaRecuperadaDemo, 'cancelada', {
      canceladaEn: cupoH3Creado,
    }),
    cita('cita-h1-asignada', IDS.carlos, 'prof-valentina', hace(2, '10:00'), 'asistida', {
      origen: 'cupo_recuperado',
      cupoOrigenId: 'cupo-h1',
      creadaEn: hace(3, '08:15'),
    }),
    cita(
      'cita-demo-recuperada',
      IDS.pacienteDemo,
      'prof-andres',
      fechaRecuperadaDemo,
      'confirmada',
      {
        origen: 'cupo_recuperado',
        cupoOrigenId: 'cupo-h3',
        creadaEn: hace(1, '16:12'),
      },
    ),

    // Agenda próxima de la Sede Centro.
    cita('cita-a1', IDS.carlos, 'prof-valentina', enHorario(2), 'programada'),
    cita('cita-a2', IDS.lucia, 'prof-camila', enHorario(3), 'confirmada'),
    cita('cita-a3', IDS.jorge, 'prof-valentina', en(1, '09:00'), 'programada'),
    cita(IDS.citaComenzada, IDS.pedro, 'prof-valentina', comenzada, 'programada'),
    cita(IDS.citaDemoProxima, IDS.pacienteDemo, 'prof-valentina', en(6, '10:00'), 'programada'),
    cita('cita-a6', IDS.ana, 'prof-valentina', en(2, '11:00'), 'programada'),

    // Agenda próxima de la Sede Norte.
    cita(IDS.citaNorte, IDS.carlos, 'prof-felipe', en(1, '15:00'), 'programada'),
    cita('cita-n2', IDS.ana, 'prof-andres', enHorario(4), 'confirmada'),

    // Se cancelan al arrancar para generar ofertas en vivo (ver cancelacionesIniciales).
    cita(IDS.citaVivaDemo, IDS.pedro, 'prof-valentina', enHorario(4), 'programada'),
    cita(IDS.citaVivaPediatria, IDS.lucia, 'prof-camila', enHorario(5), 'programada'),
  ];

  // ───────────── Cupos y ofertas históricos ─────────────
  const cupos: CupoLiberado[] = [
    {
      id: 'cupo-h1',
      citaOrigenId: 'cita-h1-origen',
      consultorioId: IDS.centro,
      profesionalId: 'prof-valentina',
      especialidadId: IDS.medicinaGeneral,
      fechaHora: hace(2, '10:00'),
      duracionMin: 20,
      estado: 'asignado',
      canceladaPor: 'paciente',
      rondaActual: 2,
      citaAsignadaId: 'cita-h1-asignada',
      creadoEn: cupoH1Creado,
    },
    {
      id: 'cupo-h2',
      citaOrigenId: 'cita-h2-origen',
      consultorioId: IDS.centro,
      profesionalId: 'prof-valentina',
      especialidadId: IDS.medicinaGeneral,
      fechaHora: hace(5, '11:00'),
      duracionMin: 20,
      estado: 'expirado',
      canceladaPor: 'staff',
      rondaActual: 2,
      citaAsignadaId: null,
      creadoEn: cupoH2Creado,
    },
    {
      id: 'cupo-h3',
      citaOrigenId: 'cita-h3-origen',
      consultorioId: IDS.norte,
      profesionalId: 'prof-andres',
      especialidadId: IDS.odontologia,
      fechaHora: fechaRecuperadaDemo,
      duracionMin: 30,
      estado: 'asignado',
      canceladaPor: 'paciente',
      rondaActual: 2,
      citaAsignadaId: 'cita-demo-recuperada',
      creadoEn: cupoH3Creado,
    },
  ];

  const oferta = (
    id: string,
    cupoId: string,
    pacienteId: string,
    ronda: number,
    estado: Oferta['estado'],
    creadaEn: FechaISO,
    respondidaTrasMin: number | null,
    explicacion: ExplicacionPrioridad,
  ): Oferta => ({
    id,
    cupoId,
    pacienteId,
    ronda,
    estado,
    creadaEn,
    expiraEn: desplazar(creadaEn, 15),
    respondidaEn: respondidaTrasMin === null ? null : desplazar(creadaEn, respondidaTrasMin),
    explicacion,
  });

  const ofertas: Oferta[] = [
    oferta(
      'oferta-h1-r1',
      'cupo-h1',
      IDS.pacienteDemo,
      1,
      'rechazada',
      cupoH1Creado,
      6,
      explicacionHistorica(
        [0.83, 'Llevabas 25 días en la lista de espera de Medicina general.'],
        [0.92, 'Sede Centro está a unos 1,7 km de tu zona.'],
        [0.5, 'Es tu primera oferta: aún no hay historial.'],
      ),
    ),
    oferta(
      'oferta-h1-r2',
      'cupo-h1',
      IDS.carlos,
      2,
      'aceptada',
      desplazar(cupoH1Creado, 6),
      9,
      explicacionHistorica(
        [0.23, 'Llevabas 7 días en la lista de espera de Medicina general.'],
        [0.84, 'Sede Centro está a unos 3,2 km de tu zona.'],
        [0.5, 'Es tu primera oferta: aún no hay historial.'],
      ),
    ),
    oferta(
      'oferta-h2-r1',
      'cupo-h2',
      IDS.pacienteDemo,
      1,
      'expirada',
      cupoH2Creado,
      null,
      explicacionHistorica(
        [0.73, 'Llevabas 22 días en la lista de espera de Medicina general.'],
        [0.92, 'Sede Centro está a unos 1,7 km de tu zona.'],
        [0.5, 'Es tu primera oferta: aún no hay historial.'],
      ),
    ),
    oferta(
      'oferta-h2-r2',
      'cupo-h2',
      IDS.carlos,
      2,
      'rechazada',
      desplazar(cupoH2Creado, 15),
      5,
      explicacionHistorica(
        [0.13, 'Llevabas 4 días en la lista de espera de Medicina general.'],
        [0.84, 'Sede Centro está a unos 3,2 km de tu zona.'],
        [0.5, 'Es tu primera oferta: aún no hay historial.'],
      ),
    ),
    oferta(
      'oferta-h3-r1',
      'cupo-h3',
      IDS.ana,
      1,
      'rechazada',
      cupoH3Creado,
      4,
      explicacionHistorica(
        [0.23, 'Llevabas 7 días en la lista de espera de Odontología.'],
        [0.94, 'Sede Norte está a unos 1,2 km de tu zona.'],
        [0.5, 'Es tu primera oferta: aún no hay historial.'],
      ),
    ),
    oferta(
      'oferta-h3-r2',
      'cupo-h3',
      IDS.pacienteDemo,
      2,
      'aceptada',
      desplazar(cupoH3Creado, 4),
      8,
      explicacionHistorica(
        [
          0,
          'No estabas en la lista de espera de Odontología, pero la marcaste como especialidad de interés.',
        ],
        [0.52, 'Sede Norte está a unos 9,6 km de tu zona.'],
        [0, 'Aceptaste 0 de tus 2 ofertas anteriores.'],
      ),
    ),
  ];

  const eventos: EventoOferta[] = ofertas.flatMap((o) => {
    const base: EventoOferta = {
      id: `ev-${o.id}-creada`,
      ofertaId: o.id,
      cupoId: o.cupoId,
      tipo: 'creada',
      ronda: o.ronda,
      fecha: o.creadaEn,
    };
    if (o.estado === 'pendiente') return [base];
    const cierre: EventoOferta = {
      id: `ev-${o.id}-${o.estado}`,
      ofertaId: o.id,
      cupoId: o.cupoId,
      tipo: o.estado,
      ronda: o.ronda,
      fecha: o.respondidaEn ?? o.expiraEn,
    };
    return [base, cierre];
  });

  const notificaciones: Notificacion[] = [
    {
      id: 'notif-h2',
      usuarioId: IDS.pacienteDemo,
      tipo: 'oferta_expirada',
      titulo: 'Una oferta expiró',
      cuerpo: 'No alcanzaste a responder el cupo de Medicina general. Te avisaremos del próximo.',
      ofertaId: 'oferta-h2-r1',
      leida: true,
      creadaEn: desplazar(cupoH2Creado, 15),
    },
    {
      id: 'notif-h3-oferta',
      usuarioId: IDS.pacienteDemo,
      tipo: 'oferta_nueva',
      titulo: 'Nuevo cupo disponible',
      cuerpo: 'Se liberó un cupo de Odontología en Sede Norte. Tienes 15 minutos para responder.',
      ofertaId: 'oferta-h3-r2',
      leida: true,
      creadaEn: desplazar(cupoH3Creado, 4),
    },
    {
      id: 'notif-h3-cita',
      usuarioId: IDS.pacienteDemo,
      tipo: 'cita_confirmada',
      titulo: 'Cita confirmada',
      cuerpo: 'Tu cita de Odontología quedó confirmada. La encuentras en Mis citas.',
      ofertaId: 'oferta-h3-r2',
      leida: true,
      creadaEn: desplazar(cupoH3Creado, 12),
    },
  ];

  return {
    db: {
      perfiles,
      credenciales,
      especialidades,
      consultorios,
      profesionales,
      preferencias,
      solicitudes,
      citas,
      cupos,
      ofertas,
      eventos,
      notificaciones,
    },
    cancelacionesIniciales: [
      { citaId: IDS.citaVivaDemo, por: 'paciente' },
      { citaId: IDS.citaVivaPediatria, por: 'staff' },
    ],
  };
}
