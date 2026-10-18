import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ESTADOS_CITA_ACTIVOS } from '@/constants/estados';
import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';
import type { CitaDetalle } from '@/types';

export function useCitas() {
  const { citas } = useServicios();
  return useQuery({ queryKey: claves.citas, queryFn: () => citas.listar() });
}

export function useCancelarCita() {
  const { citas } = useServicios();
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => citas.cancelar(id),
    onSettled: () =>
      Promise.all([
        cliente.invalidateQueries({ queryKey: claves.citas }),
        cliente.invalidateQueries({ queryKey: claves.notificaciones.todas }),
      ]),
  });
}

const finDeCita = (cita: CitaDetalle) =>
  new Date(cita.fechaHora).getTime() + cita.duracionMin * 60_000;

/**
 * Próximas: activas que aún no terminan (de la más cercana a la más lejana).
 * Historial: el resto (de la más reciente a la más antigua).
 */
export function clasificarCitas(citas: readonly CitaDetalle[], ahora: Date) {
  const esProxima = (c: CitaDetalle) =>
    ESTADOS_CITA_ACTIVOS.includes(c.estado) && finDeCita(c) >= ahora.getTime();
  return {
    proximas: citas.filter(esProxima).sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
    historial: citas
      .filter((c) => !esProxima(c))
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
  };
}

/** Solo se cancela una cita activa que todavía no empieza. */
export function puedeCancelarCita(cita: CitaDetalle, ahora: Date): boolean {
  return ESTADOS_CITA_ACTIVOS.includes(cita.estado) && new Date(cita.fechaHora) > ahora;
}
