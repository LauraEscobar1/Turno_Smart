/**
 * MODO DEMO — sesión simulada en memoria (Fase 1).
 * No valida credenciales, no persiste nada y se pierde al recargar la app.
 * En la Fase 4 se reemplaza por la implementación con Supabase Auth.
 */
import type { AuthService, OyenteSesion } from '@/services';
import type { Rol, Usuario } from '@/types';

export const USUARIOS_DEMO: Record<Rol, Usuario> = {
  paciente: { id: 'demo-paciente', nombre: 'Paciente Demo', rol: 'paciente' },
  staff: { id: 'demo-staff', nombre: 'Recepción Demo', rol: 'staff' },
};

export class ErrorModoDemo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorModoDemo';
  }
}

export interface DemoAuthService extends AuthService {
  entrarComo(rol: Rol): Promise<Usuario>;
}

export function esDemoAuthService(servicio: AuthService): servicio is DemoAuthService {
  return 'entrarComo' in servicio;
}

export function crearDemoAuthService(): DemoAuthService {
  let actual: Usuario | null = null;
  const oyentes = new Set<OyenteSesion>();

  const emitir = () => {
    oyentes.forEach((oyente) => oyente(actual));
  };

  return {
    async obtenerSesion() {
      return actual;
    },
    async entrarComo(rol) {
      actual = USUARIOS_DEMO[rol];
      emitir();
      return actual;
    },
    async iniciarSesion() {
      throw new ErrorModoDemo(
        'El inicio de sesión con correo estará disponible en la Fase 4. Usa los accesos de demostración.',
      );
    },
    async registrar() {
      throw new ErrorModoDemo(
        'El registro estará disponible en la Fase 4, cuando la app se conecte a Supabase.',
      );
    },
    async cerrarSesion() {
      actual = null;
      emitir();
    },
    suscribirse(oyente) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
  };
}
