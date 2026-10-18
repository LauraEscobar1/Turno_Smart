import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useServicios } from '@/context/ServiciosContext';
import { claves } from '@/services/claves';

export function useMetricas() {
  const { panel } = useServicios();
  return useQuery({ queryKey: claves.panel.metricas, queryFn: () => panel.obtenerMetricas() });
}

/** Agenda de hoy y los próximos 7 días. */
export function useAgenda() {
  const { panel } = useServicios();
  return useQuery({
    queryKey: claves.panel.agenda,
    queryFn: () => panel.listarAgenda({ desdeDias: 0, hastaDias: 7 }),
  });
}

export function useCupos() {
  const { panel } = useServicios();
  return useQuery({ queryKey: claves.panel.cupos, queryFn: () => panel.listarCupos() });
}

export function useCupo(id: string) {
  const { panel } = useServicios();
  return useQuery({ queryKey: claves.panel.cupo(id), queryFn: () => panel.obtenerCupo(id) });
}

export function useOfertasEnCurso() {
  const { panel } = useServicios();
  return useQuery({
    queryKey: claves.panel.ofertasEnCurso,
    queryFn: () => panel.listarOfertasEnCurso(),
    refetchInterval: 30_000,
  });
}

function useInvalidarPanel() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: claves.panel.todo });
}

/** El paciente avisó que no vendrá: cancela la cita y libera el cupo. */
export function useRegistrarCancelacion() {
  const { panel } = useServicios();
  const invalidar = useInvalidarPanel();
  return useMutation({
    mutationFn: (citaId: string) => panel.registrarCancelacion(citaId),
    onSettled: invalidar,
  });
}

export function useRegistrarInasistencia() {
  const { panel } = useServicios();
  const invalidar = useInvalidarPanel();
  return useMutation({
    mutationFn: (citaId: string) => panel.registrarInasistencia(citaId),
    onSettled: invalidar,
  });
}
