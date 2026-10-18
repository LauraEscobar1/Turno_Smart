import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ConfirmDialog, EmptyState, SegmentedControl } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { RUTAS } from '@/features/auth/rutas';
import { useAhora } from '@/hooks/useAhora';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import type { CitaDetalle } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

import { clasificarCitas, puedeCancelarCita, useCancelarCita } from '../hooks/useCitas';
import { CitaCard } from './CitaCard';

type Pestana = 'proximas' | 'historial';

const SEGMENTOS = [
  { valor: 'proximas', etiqueta: 'Próximas' },
  { valor: 'historial', etiqueta: 'Historial' },
] as const;

export function ListaCitas({ citas }: { citas: CitaDetalle[] }) {
  const [pestana, setPestana] = useState<Pestana>('proximas');
  const [porCancelar, setPorCancelar] = useState<CitaDetalle | null>(null);
  const [dialogoVisible, setDialogoVisible] = useState(false);
  const cancelar = useCancelarCita();
  const toast = useToast();
  const ahora = useAhora(60_000);

  const { proximas, historial } = clasificarCitas(citas, ahora);
  const visibles = pestana === 'proximas' ? proximas : historial;

  const confirmarCancelacion = () => {
    if (!porCancelar) return;
    cancelar.mutate(porCancelar.id, {
      onSuccess: () =>
        toast.mostrar('Cita cancelada. El cupo se ofrecerá a otro paciente.', 'exito'),
      onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
      onSettled: () => setDialogoVisible(false),
    });
  };

  return (
    <View style={styles.contenedor}>
      <SegmentedControl
        segmentos={SEGMENTOS}
        valor={pestana}
        onCambiar={setPestana}
        accessibilityLabel="Tipo de citas"
      />

      {visibles.length === 0 ? (
        pestana === 'proximas' ? (
          <EmptyState
            icon="calendar-outline"
            title="No tienes citas próximas"
            description="Las citas que aceptes desde una oferta aparecerán aquí."
            actionLabel="Ver ofertas"
            onAction={() => router.navigate(RUTAS.inicioPaciente)}
          />
        ) : (
          <EmptyState
            icon="time-outline"
            title="Aún no hay historial"
            description="Aquí verás las citas asistidas, canceladas o perdidas."
          />
        )
      ) : (
        visibles.map((cita) => (
          <CitaCard
            key={cita.id}
            cita={cita}
            cancelando={cancelar.isPending}
            onCancelar={
              puedeCancelarCita(cita, ahora)
                ? () => {
                    setPorCancelar(cita);
                    setDialogoVisible(true);
                  }
                : undefined
            }
          />
        ))
      )}

      <ConfirmDialog
        visible={dialogoVisible}
        title="¿Cancelar esta cita?"
        message={
          porCancelar
            ? `${porCancelar.especialidad.nombre}, ${formatearFechaHora(porCancelar.fechaHora)}. El cupo se ofrecerá a otro paciente de la lista de espera y no podrás recuperarlo.`
            : ''
        }
        confirmLabel="Sí, cancelar cita"
        cancelLabel="Mantener cita"
        tone="danger"
        loading={cancelar.isPending}
        onConfirm={confirmarCancelacion}
        onCancel={() => setDialogoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.md,
  },
});
