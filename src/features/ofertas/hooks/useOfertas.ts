import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useServicios } from '@/context/ServiciosContext';
import type { RespuestaOferta } from '@/services';
import { claves } from '@/services/claves';
import type { OfertaDetalle } from '@/types';

/** Todas las ofertas del paciente. Se refresca cada 30 s (en la Fase 4, Realtime). */
export function useOfertas() {
  const { ofertas } = useServicios();
  return useQuery({
    queryKey: claves.ofertas.lista,
    queryFn: () => ofertas.listar(),
    refetchInterval: 30_000,
  });
}

export function useOferta(id: string) {
  const { ofertas } = useServicios();
  return useQuery({
    queryKey: claves.ofertas.detalle(id),
    queryFn: () => ofertas.obtener(id),
  });
}

export function useResponderOferta() {
  const { ofertas } = useServicios();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, respuesta }: { id: string; respuesta: RespuestaOferta }) =>
      ofertas.responder(id, respuesta),
    onSuccess: (oferta) => cliente.setQueryData(claves.ofertas.detalle(oferta.id), oferta),
    // Éxito o error (p. ej. expirada): todo lo relacionado puede haber cambiado.
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claves.ofertas.todas }),
        cliente.invalidateQueries({ queryKey: claves.citas }),
        cliente.invalidateQueries({ queryKey: claves.notificaciones.todas }),
        cliente.invalidateQueries({ queryKey: claves.listaEspera }),
      ]),
  });
}

/** Pide al servidor el estado real cuando una cuenta regresiva llega a cero. */
export function useRefrescarOfertas() {
  const cliente = useQueryClient();
  return useCallback(
    () => void cliente.invalidateQueries({ queryKey: claves.ofertas.todas }),
    [cliente],
  );
}

/** Pendientes (por vencimiento) y el historial: respondidas, expiradas o canceladas. */
export function separarOfertas(ofertas: readonly OfertaDetalle[]) {
  return {
    activas: ofertas.filter((o) => o.estado === 'pendiente'),
    historial: ofertas.filter((o) => o.estado !== 'pendiente'),
  };
}
