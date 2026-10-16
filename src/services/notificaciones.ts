import type { Notificacion } from '@/types';

/** Notificaciones dentro de la app (Supabase Realtime en la Fase 4). */
export interface NotificacionesService {
  listar(): Promise<Notificacion[]>;
  marcarLeida(id: string): Promise<void>;
  /** Suscribe a notificaciones nuevas; devuelve la función para cancelar. */
  suscribirse(oyente: (notificacion: Notificacion) => void): () => void;
}
