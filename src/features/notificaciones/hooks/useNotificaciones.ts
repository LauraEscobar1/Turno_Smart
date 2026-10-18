import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';

export function useNotificaciones() {
  const { notificaciones } = useServicios();
  return useQuery({
    queryKey: claves.notificaciones.lista,
    queryFn: () => notificaciones.listar(),
  });
}

/** Contador de la pestaña. Se consulta cada 15 s (en la Fase 4 llega por Realtime). */
export function useConteoNoLeidas(habilitado = true) {
  const { notificaciones } = useServicios();
  return useQuery({
    queryKey: claves.notificaciones.noLeidas,
    queryFn: () => notificaciones.contarNoLeidas(),
    refetchInterval: 15_000,
    enabled: habilitado,
  });
}

function useInvalidarNotificaciones() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: claves.notificaciones.todas });
}

export function useMarcarLeida() {
  const { notificaciones } = useServicios();
  const invalidar = useInvalidarNotificaciones();
  return useMutation({
    mutationFn: (id: string) => notificaciones.marcarLeida(id),
    onSettled: invalidar,
  });
}

export function useMarcarTodasLeidas() {
  const { notificaciones } = useServicios();
  const invalidar = useInvalidarNotificaciones();
  return useMutation({
    mutationFn: () => notificaciones.marcarTodasLeidas(),
    onSettled: invalidar,
  });
}
