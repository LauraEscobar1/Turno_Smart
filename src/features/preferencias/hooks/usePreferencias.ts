import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';
import type { DatosPreferencias } from '@/validacion/preferencias';

export function usePreferencias() {
  const { preferencias } = useServicios();
  return useQuery({ queryKey: claves.preferencias, queryFn: () => preferencias.obtener() });
}

export function useGuardarPreferencias() {
  const { preferencias } = useServicios();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: DatosPreferencias) => preferencias.guardar(datos),
    onSuccess: (guardadas) => cliente.setQueryData(claves.preferencias, guardadas),
    // Nuevas preferencias pueden hacerle candidato a un cupo disponible.
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claves.ofertas.todas }),
        cliente.invalidateQueries({ queryKey: claves.notificaciones.todas }),
      ]),
  });
}
