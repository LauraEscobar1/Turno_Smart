/**
 * Modelo de dominio del cliente. Los nombres siguen la convención que tendrá el
 * esquema de Supabase (Fase 3): una interfaz por tabla, ids `string` (uuid) y
 * fechas ISO 8601. Los tipos `*Detalle` son vistas con los datos ya unidos.
 */

/** Fecha y hora en formato ISO 8601 (UTC). */
export type FechaISO = string;

/** Hora local del consultorio en formato `HH:mm` (24 h). */
export type HoraDelDia = string;

/** 0 = domingo … 6 = sábado (igual que `Date.getDay()`). */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Coordenadas {
  lat: number;
  lng: number;
}

// ───────────── Estados (las transiciones viven en src/constants/estados.ts) ─────────────

export const ESTADOS_OFERTA_VALORES = [
  'pendiente',
  'aceptada',
  'rechazada',
  'expirada',
  'cancelada',
] as const;
export type EstadoOferta = (typeof ESTADOS_OFERTA_VALORES)[number];

export const ESTADOS_CITA_VALORES = [
  'programada',
  'confirmada',
  'cancelada',
  'asistida',
  'inasistencia',
] as const;
export type EstadoCita = (typeof ESTADOS_CITA_VALORES)[number];

export const ESTADOS_CUPO_VALORES = ['disponible', 'ofertando', 'asignado', 'expirado'] as const;
export type EstadoCupo = (typeof ESTADOS_CUPO_VALORES)[number];

export const ESTADOS_SOLICITUD_VALORES = ['activa', 'atendida', 'cancelada'] as const;
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD_VALORES)[number];

// ───────────── Personas y catálogo ─────────────

export type Rol = 'paciente' | 'staff';

/** Perfil del usuario autenticado (tabla `perfiles`, 1:1 con `auth.users`). */
export interface Perfil {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: Rol;
  /** Solo staff: consultorio al que pertenece. Define qué datos puede ver. */
  consultorioId: string | null;
  /**
   * Solo paciente: ubicación aproximada declarada (barrio), nunca GPS.
   * Se usa para la distancia al consultorio; `null` si no la ha indicado.
   */
  ubicacionAproximada: Coordenadas | null;
  creadoEn: FechaISO;
}

export interface Especialidad {
  id: string;
  nombre: string;
}

export interface Consultorio {
  id: string;
  nombre: string;
  direccion: string;
  coordenadas: Coordenadas;
}

export interface Profesional {
  id: string;
  nombre: string;
  especialidadId: string;
  consultorioId: string;
}

// ───────────── Paciente ─────────────

/** Franja de disponibilidad semanal del paciente. `horaInicio` < `horaFin`. */
export interface FranjaHoraria {
  diaSemana: DiaSemana;
  horaInicio: HoraDelDia;
  horaFin: HoraDelDia;
}

export interface PreferenciasPaciente {
  pacienteId: string;
  /** Especialidades de las que quiere recibir cupos aunque no esté en su lista de espera. */
  especialidadIds: string[];
  /** Vacío = disponibilidad abierta (acepta cualquier horario). */
  franjas: FranjaHoraria[];
  /** `null` = sin límite de distancia. */
  distanciaMaxKm: number | null;
  /** Antelación mínima con la que acepta un cupo de último minuto. */
  antelacionMinHoras: number;
  actualizadoEn: FechaISO;
}

/** Inscripción del paciente en la lista de espera de una especialidad. */
export interface SolicitudEspera {
  id: string;
  pacienteId: string;
  especialidadId: string;
  estado: EstadoSolicitud;
  creadaEn: FechaISO;
  /** Cuándo pasó a `atendida` o `cancelada`. */
  cerradaEn: FechaISO | null;
}

// ───────────── Agenda ─────────────

export type OrigenCita = 'agenda' | 'cupo_recuperado';

export interface Cita {
  id: string;
  pacienteId: string;
  profesionalId: string;
  especialidadId: string;
  consultorioId: string;
  fechaHora: FechaISO;
  duracionMin: number;
  estado: EstadoCita;
  origen: OrigenCita;
  /** Si `origen = 'cupo_recuperado'`, el cupo del que salió. */
  cupoOrigenId: string | null;
  creadaEn: FechaISO;
  canceladaEn: FechaISO | null;
}

export type CanceladaPor = 'paciente' | 'staff';

/**
 * Hueco de agenda que dejó una cita cancelada y que se intenta recuperar.
 * Solo se crea si faltan al menos `MARGEN_CIERRE_CUPO_MIN` minutos para la cita.
 */
export interface CupoLiberado {
  id: string;
  /** Cita cancelada que liberó el cupo. Única: una cita libera como máximo un cupo. */
  citaOrigenId: string;
  consultorioId: string;
  profesionalId: string;
  especialidadId: string;
  fechaHora: FechaISO;
  duracionMin: number;
  estado: EstadoCupo;
  canceladaPor: CanceladaPor;
  /** Número de la última ronda de oferta (0 si aún no se ofreció). */
  rondaActual: number;
  /** Cita creada al aceptarse una oferta (`estado = 'asignado'`). */
  citaAsignadaId: string | null;
  creadoEn: FechaISO;
}

// ───────────── Ofertas ─────────────

/** Un factor de priorización, normalizado: `valor` y `peso` entre 0 y 1. */
export interface FactorPrioridad {
  valor: number;
  peso: number;
  /** Explicación en lenguaje claro para el paciente. */
  detalle: string;
}

export interface FactoresPrioridad {
  tiempoEspera: FactorPrioridad;
  compatibilidadHoraria: FactorPrioridad;
  distancia: FactorPrioridad;
  historialRespuesta: FactorPrioridad;
}

export type FuenteExplicacion = 'regla_simulada' | 'regla_backend' | 'ia';

/** Por qué se eligió a este paciente para el cupo. */
export interface ExplicacionPrioridad {
  /** Σ valor × peso, entre 0 y 1. */
  puntaje: number;
  factores: FactoresPrioridad;
  fuente: FuenteExplicacion;
}

export interface Oferta {
  id: string;
  cupoId: string;
  pacienteId: string;
  /** 1 = primer candidato; aumenta cada vez que se pasa al siguiente. */
  ronda: number;
  estado: EstadoOferta;
  creadaEn: FechaISO;
  expiraEn: FechaISO;
  respondidaEn: FechaISO | null;
  explicacion: ExplicacionPrioridad;
}

export type TipoEventoOferta = 'creada' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';

/** Registro de auditoría de una oferta (línea de tiempo del cupo para el staff). */
export interface EventoOferta {
  id: string;
  ofertaId: string;
  cupoId: string;
  tipo: TipoEventoOferta;
  ronda: number;
  fecha: FechaISO;
}

// ───────────── Notificaciones ─────────────

export type TipoNotificacion =
  'oferta_nueva' | 'oferta_expirada' | 'cita_confirmada' | 'cita_cancelada';

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  /** Oferta relacionada, para abrir su detalle. */
  ofertaId: string | null;
  leida: boolean;
  creadaEn: FechaISO;
}

// ───────────── Riesgo de inasistencia ─────────────

export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

export type FuenteRiesgo = 'estimacion_ficticia' | 'ia';

/**
 * Predicción de inasistencia para una cita. Sin datos clínicos ni sensibles:
 * solo historial de asistencia y datos de la cita. La IA recomienda; el staff decide.
 */
export interface RiesgoInasistencia {
  citaId: string;
  nivel: NivelRiesgo;
  /** Entre 0 y 1. */
  puntaje: number;
  explicacion: string;
  recomendacion: string;
  fuente: FuenteRiesgo;
}

// ───────────── Vistas (datos unidos para la interfaz) ─────────────

export interface ContextoCupo {
  especialidad: Especialidad;
  profesional: Profesional;
  consultorio: Consultorio;
  fechaHora: FechaISO;
  duracionMin: number;
}

export type OfertaDetalle = Oferta & ContextoCupo;

export type CitaDetalle = Cita & Omit<ContextoCupo, 'fechaHora' | 'duracionMin'>;

export interface SolicitudDetalle extends SolicitudEspera {
  especialidad: Especialidad;
}

/**
 * Referencia mínima a un paciente para el staff: iniciales y un código corto.
 * El panel no necesita (ni recibe) nombre completo, correo ni teléfono.
 */
export interface ReferenciaPaciente {
  codigo: string;
  iniciales: string;
}

export interface CitaAgenda extends CitaDetalle {
  paciente: ReferenciaPaciente;
  riesgo: RiesgoInasistencia | null;
}

export interface CupoDetalle extends CupoLiberado, Omit<ContextoCupo, 'fechaHora' | 'duracionMin'> {
  /** Oferta pendiente de la ronda actual, si la hay. */
  ofertaVigente: Pick<Oferta, 'id' | 'ronda' | 'expiraEn'> | null;
}

export interface RondaOferta {
  ofertaId: string;
  ronda: number;
  paciente: ReferenciaPaciente;
  estado: EstadoOferta;
  creadaEn: FechaISO;
  expiraEn: FechaISO;
  respondidaEn: FechaISO | null;
}

export interface CupoConLineaDeTiempo extends CupoDetalle {
  rondas: RondaOferta[];
}

export interface OfertaEnCurso {
  ofertaId: string;
  cupoId: string;
  ronda: number;
  paciente: ReferenciaPaciente;
  especialidad: Especialidad;
  profesional: Profesional;
  fechaHora: FechaISO;
  expiraEn: FechaISO;
}

export interface MetricasPanel {
  consultorio: Consultorio;
  periodoDias: number;
  cancelaciones: number;
  inasistencias: number;
  cuposLiberados: number;
  cuposRecuperados: number;
  /** cuposRecuperados / cuposLiberados, entre 0 y 1 (0 si no hubo cupos). */
  tasaRecuperacion: number;
  ofertasPendientes: number;
}
