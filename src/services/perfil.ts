import type { Perfil } from '@/types';

/** Perfil de la persona autenticada. */
export interface PerfilService {
  obtenerPerfil(): Promise<Perfil>;
}
