import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { codigoDeError, type Credenciales, type DatosRegistro } from '@/services';
import type { Perfil, Rol } from '@/types';

import { useServicios } from './ServiciosContext';

export interface AuthContextValue {
  usuario: Perfil | null;
  /** true mientras se restaura la sesión guardada al abrir la app. */
  cargando: boolean;
  /** true con el servidor simulado (Fase 2). */
  modoDemo: boolean;
  iniciarSesion(credenciales: Credenciales): Promise<void>;
  registrar(datos: DatosRegistro): Promise<void>;
  cerrarSesion(): Promise<void>;
  /** Accesos rápidos con las cuentas demo; `null` fuera del modo demo. */
  entrarComoDemo: ((rol: Rol) => Promise<void>) | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Sesión de la app. Depende solo del contrato `AuthService`: en la Fase 4 se
 * cambia la implementación en `src/services/index.ts` y este archivo no cambia.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth, demo } = useServicios();
  const clienteConsultas = useQueryClient();
  const [usuario, setUsuario] = useState<Perfil | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    auth
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
    const cancelar = auth.suscribirse((perfil) => {
      if (activo) setUsuario(perfil);
    });
    return () => {
      activo = false;
      cancelar();
    };
  }, [auth]);

  const iniciarSesion = useCallback(
    async (credenciales: Credenciales) => {
      const perfil = await auth.iniciarSesion(credenciales);
      clienteConsultas.clear();
      setUsuario(perfil);
    },
    [auth, clienteConsultas],
  );

  const registrar = useCallback(
    async (datos: DatosRegistro) => {
      const perfil = await auth.registrar(datos);
      clienteConsultas.clear();
      setUsuario(perfil);
    },
    [auth, clienteConsultas],
  );

  const cerrarSesion = useCallback(async () => {
    await auth.cerrarSesion();
    // Nada de la sesión anterior debe quedar en memoria para el siguiente usuario.
    clienteConsultas.clear();
    setUsuario(null);
  }, [auth, clienteConsultas]);

  // Si el servidor dice que la sesión ya no es válida, se cierra.
  useEffect(() => {
    return clienteConsultas.getQueryCache().subscribe((evento) => {
      if (
        evento.type === 'updated' &&
        evento.action.type === 'error' &&
        codigoDeError(evento.action.error) === 'no_autenticado'
      ) {
        void cerrarSesion();
      }
    });
  }, [clienteConsultas, cerrarSesion]);

  const entrarComoDemo = useMemo(() => {
    if (!demo) return null;
    return (rol: Rol) => iniciarSesion(demo.cuentas[rol]);
  }, [demo, iniciarSesion]);

  const valor = useMemo<AuthContextValue>(
    () => ({
      usuario,
      cargando,
      modoDemo: demo !== null,
      iniciarSesion,
      registrar,
      cerrarSesion,
      entrarComoDemo,
    }),
    [usuario, cargando, demo, iniciarSesion, registrar, cerrarSesion, entrarComoDemo],
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
