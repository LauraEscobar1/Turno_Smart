import type { Usuario } from '@/types';

export interface Credenciales {
  email: string;
  password: string;
}

export interface DatosRegistro extends Credenciales {
  nombre: string;
  telefono?: string;
}

export type OyenteSesion = (usuario: Usuario | null) => void;

/**
 * Contrato de autenticación. Fase 1: implementación demo en memoria
 * (`src/features/auth/demoAuthService.ts`). Fase 4: Supabase Auth. Las pantallas
 * solo dependen de `useAuth()`, nunca de una implementación concreta.
 */
export interface AuthService {
  /** Restaura la sesión persistida, si existe. */
  obtenerSesion(): Promise<Usuario | null>;
  iniciarSesion(credenciales: Credenciales): Promise<Usuario>;
  registrar(datos: DatosRegistro): Promise<Usuario>;
  cerrarSesion(): Promise<void>;
  /** Suscribe a cambios de sesión; devuelve la función para cancelar la suscripción. */
  suscribirse(oyente: OyenteSesion): () => void;
}
