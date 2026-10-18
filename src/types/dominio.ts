/**
 * Tipos de dominio compartidos por la app. En la Fase 3 se alinearán con el
 * esquema de Supabase (los nombres de campos ya siguen esa convención en español).
 */

export type Rol = 'paciente' | 'staff';

export interface Usuario {
  id: string;
  nombre: string;
  rol: Rol;
}

/** Fecha y hora en formato ISO 8601 (UTC). */
export type FechaISO = string;

export type MotivoLiberacion = 'cancelacion' | 'inasistencia';

/** Ciclo de vida de un cupo liberado en la agenda del consultorio. */
export type EstadoCupo = 'liberado' | 'ofertado' | 'recuperado' | 'perdido';

/** Estado de una oferta de cupo enviada a un paciente de la lista de espera. */
export type EstadoOferta = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';

export type EstadoCita = 'programada' | 'confirmada' | 'completada' | 'cancelada' | 'inasistencia';

export interface CupoLiberado {
  id: string;
  especialidad: string;
  profesional: string;
  sede: string;
  fechaHora: FechaISO;
  duracionMin: number;
  motivo: MotivoLiberacion;
  estado: EstadoCupo;
}

export interface OfertaCupo {
  id: string;
  cupoId: string;
  especialidad: string;
  profesional: string;
  sede: string;
  fechaHora: FechaISO;
  duracionMin: number;
  estado: EstadoOferta;
  /** Momento en que la oferta deja de estar disponible para el paciente. */
  expiraEn: FechaISO;
}

export interface Cita {
  id: string;
  especialidad: string;
  profesional: string;
  sede: string;
  fechaHora: FechaISO;
  estado: EstadoCita;
  /** true si la cita se obtuvo a partir de un cupo recuperado. */
  recuperada: boolean;
}

export type TipoNotificacion =
  'oferta_nueva' | 'oferta_expira' | 'cita_confirmada' | 'recordatorio';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  cuerpo: string;
  fecha: FechaISO;
  leida: boolean;
}

export type FranjaHoraria = 'manana' | 'tarde' | 'noche';

export interface PreferenciasPaciente {
  especialidades: string[];
  franjas: FranjaHoraria[];
  /** Anticipación mínima, en horas, para aceptar un cupo de último minuto. */
  anticipacionMinHoras: number;
  notificacionesActivas: boolean;
}

export type NivelRiesgo = 'bajo' | 'medio' | 'alto';

/**
 * Predicción de inasistencia para una cita (Fase 5). Se calcula en el backend
 * sin datos clínicos ni sensibles; la IA recomienda y el staff decide.
 */
export interface RiesgoInasistencia {
  citaId: string;
  nivel: NivelRiesgo;
  /** Entre 0 y 1. */
  puntaje: number;
  explicacion: string;
  recomendacion: string;
}

export interface MetricasPanel {
  cuposLiberados: number;
  cuposRecuperados: number;
  ofertasEnCurso: number;
  /** Entre 0 y 1. */
  tasaRecuperacion: number;
}
