import type { TonoEstado } from '@/theme';
import type {
  EstadoCita,
  EstadoCupo,
  EstadoOferta,
  FranjaHoraria,
  MotivoLiberacion,
} from '@/types';

export interface PresentacionEstado {
  label: string;
  tone: TonoEstado;
}

/** Etiqueta y tono de cada estado; se pasan directamente a `<Badge {...} />`. */
export const ESTADOS_OFERTA: Record<EstadoOferta, PresentacionEstado> = {
  pendiente: { label: 'Pendiente', tone: 'info' },
  aceptada: { label: 'Aceptada', tone: 'success' },
  rechazada: { label: 'Rechazada', tone: 'neutral' },
  expirada: { label: 'Expirada', tone: 'warning' },
};

export const ESTADOS_CITA: Record<EstadoCita, PresentacionEstado> = {
  programada: { label: 'Programada', tone: 'info' },
  confirmada: { label: 'Confirmada', tone: 'success' },
  completada: { label: 'Completada', tone: 'neutral' },
  cancelada: { label: 'Cancelada', tone: 'error' },
  inasistencia: { label: 'Inasistencia', tone: 'warning' },
};

export const ESTADOS_CUPO: Record<EstadoCupo, PresentacionEstado> = {
  liberado: { label: 'Liberado', tone: 'warning' },
  ofertado: { label: 'Ofertado', tone: 'info' },
  recuperado: { label: 'Recuperado', tone: 'success' },
  perdido: { label: 'Perdido', tone: 'error' },
};

export const MOTIVOS_LIBERACION: Record<MotivoLiberacion, string> = {
  cancelacion: 'Cancelación',
  inasistencia: 'Inasistencia',
};

export const FRANJAS_HORARIAS: Record<FranjaHoraria, string> = {
  manana: 'Mañana (7:00–12:00)',
  tarde: 'Tarde (12:00–18:00)',
  noche: 'Noche (18:00–21:00)',
};
