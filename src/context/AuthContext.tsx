import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { crearDemoAuthService, esDemoAuthService } from '@/features/auth/demoAuthService';
import type { AuthService, Credenciales, DatosRegistro } from '@/services';
import type { Rol, Usuario } from '@/types';

export interface AuthContextValue {
  usuario: Usuario | null;
  /** true mientras se restaura la sesión al abrir la app. */
  cargando: boolean;
  /** true si la sesión es simulada (Fase 1). */
  modoDemo: boolean;
  iniciarSesion(credenciales: Credenciales): Promise<void>;
  registrar(datos: DatosRegistro): Promise<void>;
  cerrarSesion(): Promise<void>;
  /** Solo existe en modo demo. */
  entrarComoDemo: ((rol: Rol) => Promise<void>) | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Servicio por defecto. En la Fase 4 este es el único punto que cambia:
 * se sustituye por el servicio de Supabase Auth y las pantallas no se tocan.
 */
const servicioPorDefecto: AuthService = crearDemoAuthService();

export interface AuthProviderProps {
  children: ReactNode;
  /** Permite inyectar otra implementación (pruebas o Supabase). */
  servicio?: AuthService;
}

export function AuthProvider({ children, servicio = servicioPorDefecto }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    servicio
      .obtenerSesion()
      .then((restaurado) => {
        if (activo) setUsuario(restaurado);
      })
      .catch(() => {
        if (activo) setUsuario(null);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    const cancelar = servicio.suscribirse(setUsuario);
    return () => {
      activo = false;
      cancelar();
    };
  }, [servicio]);

  const iniciarSesion = useCallback(
    async (credenciales: Credenciales) => {
      setUsuario(await servicio.iniciarSesion(credenciales));
    },
    [servicio],
  );

  const registrar = useCallback(
    async (datos: DatosRegistro) => {
      setUsuario(await servicio.registrar(datos));
    },
    [servicio],
  );

  const cerrarSesion = useCallback(async () => {
    await servicio.cerrarSesion();
    setUsuario(null);
  }, [servicio]);

  const entrarComoDemo = useMemo(() => {
    if (!esDemoAuthService(servicio)) return null;
    return async (rol: Rol) => {
      setUsuario(await servicio.entrarComo(rol));
    };
  }, [servicio]);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      modoDemo: entrarComoDemo !== null,
      iniciarSesion,
      registrar,
      cerrarSesion,
      entrarComoDemo,
    }),
    [usuario, cargando, iniciarSesion, registrar, cerrarSesion, entrarComoDemo],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return contexto;
}
