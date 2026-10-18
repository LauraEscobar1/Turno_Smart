/**
 * Máquinas de estado del dominio: FUENTE ÚNICA DE VERDAD del cliente.
 * El servidor simulado (y en la Fase 3, el backend) usa estas mismas reglas.
 *
 * Oferta      pendiente ─┬─▶ aceptada
 *                        ├─▶ rechazada
 *                        ├─▶ expirada    (venció el plazo sin respuesta)
 *                        └─▶ cancelada   (el cupo dejó de estar disponible)
 *
 * Cita        programada ─┬─▶ confirmada ─┬─▶ asistida
 *                         │               ├─▶ inasistencia
 *                         │               └─▶ cancelada
 *                         ├─▶ asistida / inasistencia / cancelada
 *
 * Cupo        disponible ─┬─▶ ofertando ─┬─▶ asignado   (una oferta fue aceptada)
 *                         │              ├─▶ disponible (se agotaron los candidatos)
 *                         │              └─▶ expirado
 *                         └─▶ expirado   (llegó la hora sin asignarse)
 *
 * Solicitud   activa ─┬─▶ atendida  (aceptó un cupo de esa especialidad)
 *                     └─▶ cancelada (salió de la lista)
 */
import type { TonoEstado } from '@/theme';
import type {
  CanceladaPor,
  DiaSemana,
  EstadoCita,
  EstadoCupo,
  EstadoOferta,
  EstadoSolicitud,
  NivelRiesgo,
} from '@/types';

type Transiciones<E extends string> = Readonly<Record<E, readonly E[]>>;

export const TRANSICIONES_OFERTA: Transiciones<EstadoOferta> = {
  pendiente: ['aceptada', 'rechazada', 'expirada', 'cancelada'],
  aceptada: [],
  rechazada: [],
  expirada: [],
  cancelada: [],
};

export const TRANSICIONES_CITA: Transiciones<EstadoCita> = {
  programada: ['confirmada', 'cancelada', 'asistida', 'inasistencia'],
  confirmada: ['cancelada', 'asistida', 'inasistencia'],
  cancelada: [],
  asistida: [],
  inasistencia: [],
};

export const TRANSICIONES_CUPO: Transiciones<EstadoCupo> = {
  disponible: ['ofertando', 'expirado'],
  ofertando: ['asignado', 'disponible', 'expirado'],
  asignado: [],
  expirado: [],
};

export const TRANSICIONES_SOLICITUD: Transiciones<EstadoSolicitud> = {
  activa: ['atendida', 'cancelada'],
  atendida: [],
  cancelada: [],
};

export interface EstadosPorMaquina {
  oferta: EstadoOferta;
  cita: EstadoCita;
  cupo: EstadoCupo;
  solicitud: EstadoSolicitud;
}

export type Maquina = keyof EstadosPorMaquina;

const MAQUINAS: { [M in Maquina]: Transiciones<EstadosPorMaquina[M]> } = {
  oferta: TRANSICIONES_OFERTA,
  cita: TRANSICIONES_CITA,
  cupo: TRANSICIONES_CUPO,
  solicitud: TRANSICIONES_SOLICITUD,
};

/** true si la máquina permite pasar de `desde` a `hacia`. Quedarse igual no es una transición. */
export function puedeTransicionar<M extends Maquina>(
  maquina: M,
  desde: EstadosPorMaquina[M],
  hacia: EstadosPorMaquina[M],
): boolean {
  const destinos: readonly EstadosPorMaquina[M][] = MAQUINAS[maquina][desde];
  return destinos.includes(hacia);
}

/** Un estado terminal no admite más transiciones. */
export function esEstadoTerminal<M extends Maquina>(
  maquina: M,
  estado: EstadosPorMaquina[M],
): boolean {
  const destinos: readonly EstadosPorMaquina[M][] = MAQUINAS[maquina][estado];
  return destinos.length === 0;
}

/** Citas que todavía pueden ocurrir (se muestran en "Próximas" si son futuras). */
export const ESTADOS_CITA_ACTIVOS: readonly EstadoCita[] = ['programada', 'confirmada'];

// ───────────── Presentación (etiqueta + tono para <Badge />) ─────────────

export interface PresentacionEstado {
  label: string;
  tone: TonoEstado;
}

export const ESTADOS_OFERTA: Record<EstadoOferta, PresentacionEstado> = {
  pendiente: { label: 'Pendiente', tone: 'info' },
  aceptada: { label: 'Aceptada', tone: 'success' },
  rechazada: { label: 'Rechazada', tone: 'neutral' },
  expirada: { label: 'Expirada', tone: 'warning' },
  cancelada: { label: 'Cancelada', tone: 'error' },
};

export const ESTADOS_CITA: Record<EstadoCita, PresentacionEstado> = {
  programada: { label: 'Programada', tone: 'info' },
  confirmada: { label: 'Confirmada', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'error' },
  asistida: { label: 'Asistida', tone: 'neutral' },
  inasistencia: { label: 'Inasistencia', tone: 'warning' },
};

export const ESTADOS_CUPO: Record<EstadoCupo, PresentacionEstado> = {
  disponible: { label: 'Disponible', tone: 'warning' },
  ofertando: { label: 'Ofertando', tone: 'info' },
  asignado: { label: 'Asignado', tone: 'success' },
  expirado: { label: 'Expirado', tone: 'error' },
};

export const ESTADOS_SOLICITUD: Record<EstadoSolicitud, PresentacionEstado> = {
  activa: { label: 'Activa', tone: 'info' },
  atendida: { label: 'Atendida', tone: 'success' },
  cancelada: { label: 'Cancelada', tone: 'neutral' },
};

export const NIVELES_RIESGO: Record<NivelRiesgo, PresentacionEstado> = {
  bajo: { label: 'Riesgo bajo', tone: 'success' },
  medio: { label: 'Riesgo medio', tone: 'warning' },
  alto: { label: 'Riesgo alto', tone: 'error' },
};

export const CANCELADA_POR: Record<CanceladaPor, string> = {
  paciente: 'Cancelada por el paciente',
  staff: 'Cancelada por el consultorio',
};

export const DIAS_SEMANA: Record<DiaSemana, { corto: string; largo: string }> = {
  0: { corto: 'Dom', largo: 'Domingo' },
  1: { corto: 'Lun', largo: 'Lunes' },
  2: { corto: 'Mar', largo: 'Martes' },
  3: { corto: 'Mié', largo: 'Miércoles' },
  4: { corto: 'Jue', largo: 'Jueves' },
  5: { corto: 'Vie', largo: 'Viernes' },
  6: { corto: 'Sáb', largo: 'Sábado' },
};

/** Orden de la semana laboral primero (lunes a domingo). */
export const ORDEN_DIAS: readonly DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
