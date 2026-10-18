import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { esErrorReintentable } from '@/services';

/** Cliente de react-query con las políticas de la app. */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Solo los errores de red merecen un reintento automático.
        retry: (intentos, error) => esErrorReintentable(error) && intentos < 1,
        staleTime: 15_000,
      },
      mutations: { retry: false },
    },
  });
}

export interface ConsultasProviderProps {
  children: ReactNode;
  cliente?: QueryClient;
}

export function ConsultasProvider({ children, cliente }: ConsultasProviderProps) {
  const [clientePorDefecto] = useState(crearClienteConsultas);

  // En móvil no hay "foco de ventana": se refresca al volver la app a primer plano.
  useEffect(() => {
    focusManager.setEventListener((alCambiarFoco) => {
      const suscripcion = AppState.addEventListener('change', (estado) =>
        alCambiarFoco(estado === 'active'),
      );
      return () => suscripcion.remove();
    });
  }, []);

  return (
    <QueryClientProvider client={cliente ?? clientePorDefecto}>{children}</QueryClientProvider>
  );
}
