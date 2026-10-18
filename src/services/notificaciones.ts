import type { Notificacion } from '@/types';

/** Notificaciones dentro de la app (en la Fase 4 llegan por Supabase Realtime). */
export interface NotificacionesService {
  /** De la más reciente a la más antigua. */
  listar(): Promise<Notificacion[]>;
  contarNoLeidas(): Promise<number>;
  marcarLeida(id: string): Promise<Notificacion>;
  /** Devuelve cuántas se marcaron. */
  marcarTodasLeidas(): Promise<number>;
}
