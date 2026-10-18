import { createContext, useContext, type ReactNode } from 'react';

import { servicios as serviciosPorDefecto, type Servicios } from '@/services';

const ServiciosContext = createContext<Servicios>(serviciosPorDefecto);

export interface ServiciosProviderProps {
  children: ReactNode;
  /** Permite inyectar otra implementación (pruebas o Supabase en la Fase 4). */
  servicios?: Servicios;
}

export function ServiciosProvider({
  children,
  servicios = serviciosPorDefecto,
}: ServiciosProviderProps) {
  return <ServiciosContext.Provider value={servicios}>{children}</ServiciosContext.Provider>;
}

/** Acceso a los servicios desde hooks. Las pantallas no lo usan directamente. */
export function useServicios(): Servicios {
  return useContext(ServiciosContext);
}
