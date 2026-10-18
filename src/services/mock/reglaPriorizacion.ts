/**
 * ⚠️ SIMULACIÓN (Fase 2). Regla provisional y deliberadamente simple para elegir
 * a quién ofrecer un cupo. La regla real la implementa el backend en la Fase 3, y
 * en la Fase 5 la IA la complementa (la IA recomienda; el backend decide).
 *
 * 1. Filtros obligatorios. Un paciente es candidato si:
 *    - tiene una solicitud activa en la lista de espera de la especialidad, o la
 *      marcó como "especialidad de interés" en sus preferencias;
 *    - no es quien canceló la cita original y no recibió antes una oferta de este cupo;
 *    - no tiene otra oferta pendiente (una a la vez);
 *    - no tiene otra cita activa que se cruce con el horario del cupo;
 *    - el cupo respeta su antelación mínima, su distancia máxima (si la conocemos)
 *      y sus franjas horarias (si las definió).
 * 2. Puntaje = Σ valor × peso (cada valor entre 0 y 1):
 *    - tiempo de espera ........ 0,4  (días en lista / 30, tope 1; 0 si solo es interés)
 *    - compatibilidad horaria .. 0,3  (1 dentro de una franja; 0,5 sin franjas)
 *    - distancia ............... 0,2  (1 − km / 20, tope 0; 0,5 si no la conocemos)
 *    - historial de respuesta .. 0,1  (aceptadas / respondidas; 0,5 sin historial)
 * 3. Gana el puntaje más alto; en empate, quien lleva más tiempo esperando.
 */
import type {
  Cita,
  Consultorio,
  CupoLiberado,
  Especialidad,
  ExplicacionPrioridad,
  FactorPrioridad,
  Oferta,
  Perfil,
  PreferenciasPaciente,
  SolicitudEspera,
} from '@/types';
import { DIAS_SEMANA, ESTADOS_CITA_ACTIVOS } from '@/constants/estados';
import { citaDentroDeFranja, horasEntre } from '@/utils/fechas';
import { distanciaKm, formatearDistancia } from '@/utils/geo';

export const PESOS_SIMULADOS = {
  tiempoEspera: 0.4,
  compatibilidadHoraria: 0.3,
  distancia: 0.2,
  historialRespuesta: 0.1,
} as const;

const DIAS_ESPERA_MAXIMOS = 30;
const DISTANCIA_REFERENCIA_KM = 20;
const MS_DIA = 24 * 60 * 60 * 1000;

export interface ContextoPriorizacion {
  cupo: CupoLiberado;
  especialidad: Especialidad;
  consultorio: Consultorio;
  /** Paciente de la cita cancelada que liberó el cupo. */
  pacienteOrigenId: string;
  pacientes: readonly Perfil[];
  preferencias: ReadonlyMap<string, PreferenciasPaciente>;
  solicitudes: readonly SolicitudEspera[];
  citas: readonly Cita[];
  ofertas: readonly Oferta[];
  ahora: Date;
}

export interface Candidato {
  pacienteId: string;
  solicitudId: string | null;
  explicacion: ExplicacionPrioridad;
  /** Desde cuándo espera (para desempatar). */
  esperaDesde: number;
}

const redondear = (n: number) => Math.round(n * 1000) / 1000;

function factor(valor: number, peso: number, detalle: string): FactorPrioridad {
  return { valor: redondear(Math.min(Math.max(valor, 0), 1)), peso, detalle };
}

function seCruzan(inicioA: Date, minA: number, inicioB: Date, minB: number): boolean {
  const finA = inicioA.getTime() + minA * 60_000;
  const finB = inicioB.getTime() + minB * 60_000;
  return inicioA.getTime() < finB && inicioB.getTime() < finA;
}

/** Candidatos que pasan los filtros, ordenados del más al menos prioritario. */
export function evaluarCandidatos(ctx: ContextoPriorizacion): Candidato[] {
  const { cupo, especialidad, consultorio, ahora } = ctx;
  const inicioCupo = new Date(cupo.fechaHora);
  const horasHastaCupo = horasEntre(ahora, inicioCupo);

  const candidatos: Candidato[] = [];

  for (const paciente of ctx.pacientes) {
    if (paciente.rol !== 'paciente' || paciente.id === ctx.pacienteOrigenId) continue;

    const preferencias = ctx.preferencias.get(paciente.id);
    const solicitud = ctx.solicitudes.find(
      (s) =>
        s.pacienteId === paciente.id &&
        s.especialidadId === cupo.especialidadId &&
        s.estado === 'activa',
    );
    const interesado = preferencias?.especialidadIds.includes(cupo.especialidadId) ?? false;
    if (!solicitud && !interesado) continue;

    const ofertasPaciente = ctx.ofertas.filter((o) => o.pacienteId === paciente.id);
    if (ofertasPaciente.some((o) => o.cupoId === cupo.id || o.estado === 'pendiente')) continue;

    const tieneCruce = ctx.citas.some(
      (c) =>
        c.pacienteId === paciente.id &&
        ESTADOS_CITA_ACTIVOS.includes(c.estado) &&
        seCruzan(new Date(c.fechaHora), c.duracionMin, inicioCupo, cupo.duracionMin),
    );
    if (tieneCruce) continue;

    if (preferencias && horasHastaCupo < preferencias.antelacionMinHoras) continue;

    const km = paciente.ubicacionAproximada
      ? distanciaKm(paciente.ubicacionAproximada, consultorio.coordenadas)
      : null;
    if (km !== null && preferencias?.distanciaMaxKm != null && km > preferencias.distanciaMaxKm) {
      continue;
    }

    const franjas = preferencias?.franjas ?? [];
    const franjaCompatible = franjas.find((f) =>
      citaDentroDeFranja(inicioCupo, cupo.duracionMin, f),
    );
    if (franjas.length > 0 && !franjaCompatible) continue;

    // ── Factores ──
    const diasEspera = solicitud
      ? Math.max((ahora.getTime() - new Date(solicitud.creadaEn).getTime()) / MS_DIA, 0)
      : 0;
    const tiempoEspera = solicitud
      ? factor(
          diasEspera / DIAS_ESPERA_MAXIMOS,
          PESOS_SIMULADOS.tiempoEspera,
          `Llevas ${Math.floor(diasEspera)} ${Math.floor(diasEspera) === 1 ? 'día' : 'días'} en la lista de espera de ${especialidad.nombre}.`,
        )
      : factor(
          0,
          PESOS_SIMULADOS.tiempoEspera,
          `No estás en la lista de espera de ${especialidad.nombre}, pero la marcaste como especialidad de interés.`,
        );

    const compatibilidadHoraria = franjaCompatible
      ? factor(
          1,
          PESOS_SIMULADOS.compatibilidadHoraria,
          `El cupo está dentro de tu franja del ${DIAS_SEMANA[franjaCompatible.diaSemana].largo.toLowerCase()} de ${franjaCompatible.horaInicio} a ${franjaCompatible.horaFin}.`,
        )
      : factor(
          0.5,
          PESOS_SIMULADOS.compatibilidadHoraria,
          'No indicaste franjas horarias, así que tomamos cualquier horario como posible.',
        );

    const distancia =
      km !== null
        ? factor(
            1 - km / DISTANCIA_REFERENCIA_KM,
            PESOS_SIMULADOS.distancia,
            `${consultorio.nombre} está a unos ${formatearDistancia(km)} de tu zona.`,
          )
        : factor(
            0.5,
            PESOS_SIMULADOS.distancia,
            'No conocemos tu zona, así que la distancia no influyó.',
          );

    const respondidas = ofertasPaciente.filter((o) =>
      (['aceptada', 'rechazada', 'expirada'] as const).some((e) => e === o.estado),
    );
    const aceptadas = respondidas.filter((o) => o.estado === 'aceptada').length;
    const historialRespuesta =
      respondidas.length === 0
        ? factor(
            0.5,
            PESOS_SIMULADOS.historialRespuesta,
            'Es tu primera oferta: aún no hay historial.',
          )
        : factor(
            aceptadas / respondidas.length,
            PESOS_SIMULADOS.historialRespuesta,
            `Aceptaste ${aceptadas} de tus ${respondidas.length} ofertas anteriores.`,
          );

    const factores = { tiempoEspera, compatibilidadHoraria, distancia, historialRespuesta };
    const puntaje = redondear(
      Object.values(factores).reduce((total, f) => total + f.valor * f.peso, 0),
    );

    candidatos.push({
      pacienteId: paciente.id,
      solicitudId: solicitud?.id ?? null,
      explicacion: { puntaje, factores, fuente: 'regla_simulada' },
      esperaDesde: solicitud ? new Date(solicitud.creadaEn).getTime() : Number.POSITIVE_INFINITY,
    });
  }

  return candidatos.sort(
    (a, b) => b.explicacion.puntaje - a.explicacion.puntaje || a.esperaDesde - b.esperaDesde,
  );
}
