import type { Perfil } from '@/types';

export interface Credenciales {
  email: string;
  password: string;
}

export interface DatosRegistro extends Credenciales {
  nombre: string;
  telefono: string | null;
}

export type OyenteSesion = (perfil: Perfil | null) => void;

/**
 * Autenticación. Fase 2: servidor simulado + AsyncStorage. Fase 4: Supabase Auth.
 * Las pantallas nunca lo usan directamente: pasan por `useAuth()`.
 */
export interface AuthService {
  /** Restaura la sesión persistida, si sigue siendo válida. */
  obtenerSesion(): Promise<Perfil | null>;
  /** @throws ServiceError `credenciales_invalidas` */
  iniciarSesion(credenciales: Credenciales): Promise<Perfil>;
  /** Crea una cuenta de paciente e inicia sesión. @throws ServiceError `email_en_uso` */
  registrar(datos: DatosRegistro): Promise<Perfil>;
  cerrarSesion(): Promise<void>;
  /** Suscribe a cambios de sesión; devuelve la función para cancelar la suscripción. */
  suscribirse(oyente: OyenteSesion): () => void;
}
