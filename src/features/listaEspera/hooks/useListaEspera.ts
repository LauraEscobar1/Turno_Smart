import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';

export function useSolicitudes() {
  const { listaEspera } = useServicios();
  return useQuery({
    queryKey: claves.listaEspera,
    queryFn: () => listaEspera.listarSolicitudes(),
  });
}

function useInvalidarTrasCambio() {
  const cliente = useQueryClient();
  // Unirse o salir puede generar o cancelar ofertas al instante.
  return () =>
    Promise.all([
      cliente.invalidateQueries({ queryKey: claves.listaEspera }),
      cliente.invalidateQueries({ queryKey: claves.ofertas.todas }),
      cliente.invalidateQueries({ queryKey: claves.notificaciones.todas }),
    ]);
}

export function useUnirseALista() {
  const { listaEspera } = useServicios();
  const invalidar = useInvalidarTrasCambio();
  return useMutation({
    mutationFn: (especialidadId: string) => listaEspera.unirse(especialidadId),
    onSettled: invalidar,
  });
}

export function useSalirDeLista() {
  const { listaEspera } = useServicios();
  const invalidar = useInvalidarTrasCambio();
  return useMutation({
    mutationFn: (solicitudId: string) => listaEspera.salir(solicitudId),
    onSettled: invalidar,
  });
}
