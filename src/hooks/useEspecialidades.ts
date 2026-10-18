import { useQuery } from '@tanstack/react-query';

import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';

/** Catálogo de especialidades (cambia muy poco: se cachea 10 minutos). */
export function useEspecialidades() {
  const { especialidades } = useServicios();
  return useQuery({
    queryKey: claves.especialidades,
    queryFn: () => especialidades.listar(),
    staleTime: 10 * 60_000,
  });
}
