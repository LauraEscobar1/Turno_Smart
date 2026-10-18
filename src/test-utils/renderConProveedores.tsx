/** Utilidades de prueba: servicios aislados y todos los proveedores de la app. */
import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/context/AuthContext';
import { ConsultasProvider } from '@/context/ConsultasProvider';
import { ServiciosProvider } from '@/context/ServiciosContext';
import { ToastProvider } from '@/context/ToastContext';
import type { Servicios } from '@/services';
import { crearServiciosMock } from '@/services/mock';
import { crearAlmacenamientoEnMemoria } from '@/services/mock/almacenamientoSesion';
import { ServidorSimulado, type OpcionesServidor } from '@/services/mock/servidorSimulado';

/** Servidor simulado propio de la prueba (sin latencia salvo que se pida). */
export function crearEntornoPrueba(opciones: OpcionesServidor = {}) {
  const servidor = new ServidorSimulado({ latenciaMs: { min: 0, max: 0 }, ...opciones });
  const servicios = crearServiciosMock({
    servidor,
    almacenamiento: crearAlmacenamientoEnMemoria(),
  });
  return { servidor, servicios };
}

export function renderConProveedores(ui: ReactElement, servicios: Servicios) {
  // gcTime infinito: sin temporizadores de limpieza que mantengan vivo a Jest al terminar.
  const cliente = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
  return render(
    <SafeAreaProvider>
      <ServiciosProvider servicios={servicios}>
        <ConsultasProvider cliente={cliente}>
          <AuthProvider>
            <ToastProvider>{ui}</ToastProvider>
          </AuthProvider>
        </ConsultasProvider>
      </ServiciosProvider>
    </SafeAreaProvider>,
  );
}
