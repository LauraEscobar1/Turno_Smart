import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, ConfirmDialog, EmptyState } from '@/components/ui';
import { ESTADOS_CITA, ESTADOS_CITA_ACTIVOS } from '@/constants/estados';
import { useToast } from '@/context/ToastContext';
import { useAhora } from '@/hooks/useAhora';
import { mensajeDeError } from '@/services';
import { spacing } from '@/theme';
import type { CitaAgenda } from '@/types';
import { agruparPorDia, etiquetaDia, formatearFechaHora, formatearHora } from '@/utils/fechas';

import { useRegistrarCancelacion, useRegistrarInasistencia } from '../hooks/usePanel';
import { RiesgoInasistencia } from './RiesgoInasistencia';

type Accion = 'cancelacion' | 'inasistencia';

const TEXTOS: Record<Accion, { titulo: string; mensaje: string; boton: string; exito: string }> = {
  cancelacion: {
    titulo: '¿Registrar cancelación?',
    mensaje: 'La cita se cancelará y el cupo se ofrecerá a la lista de espera.',
    boton: 'Sí, registrar cancelación',
    exito: 'Cancelación registrada. El cupo se está ofreciendo.',
  },
  inasistencia: {
    titulo: '¿Registrar inasistencia?',
    mensaje: 'El paciente no llegó. Quedará en su historial de asistencia.',
    boton: 'Sí, registrar inasistencia',
    exito: 'Inasistencia registrada.',
  },
};

export function AgendaStaff({ citas }: { citas: CitaAgenda[] }) {
  const ahora = useAhora(60_000);
  const toast = useToast();
  const cancelar = useRegistrarCancelacion();
  const inasistencia = useRegistrarInasistencia();
  const [pendiente, setPendiente] = useState<{ cita: CitaAgenda; accion: Accion } | null>(null);
  const [dialogoVisible, setDialogoVisible] = useState(false);
  const enviando = cancelar.isPending || inasistencia.isPending;

  if (citas.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="Sin citas en los próximos días"
        description="Las citas de tu consultorio para hoy y la próxima semana aparecerán aquí."
      />
    );
  }

  const pedir = (cita: CitaAgenda, accion: Accion) => {
    setPendiente({ cita, accion });
    setDialogoVisible(true);
  };

  const confirmar = () => {
    if (!pendiente) return;
    const mutacion = pendiente.accion === 'cancelacion' ? cancelar : inasistencia;
    mutacion.mutate(pendiente.cita.id, {
      onSuccess: () => toast.mostrar(TEXTOS[pendiente.accion].exito, 'exito'),
      onError: (error) => toast.mostrar(mensajeDeError(error), 'error'),
      onSettled: () => setDialogoVisible(false),
    });
  };

  const textos = TEXTOS[pendiente?.accion ?? 'cancelacion'];

  return (
    <View style={styles.contenedor}>
      {agruparPorDia(citas, (c) => c.fechaHora).map(({ dia, elementos }) => (
        <View key={dia} style={styles.dia}>
          <AppText variant="subtitle" accessibilityRole="header">
            {etiquetaDia(dia, ahora)}
          </AppText>
          {elementos.map((cita) => {
            const activa = ESTADOS_CITA_ACTIVOS.includes(cita.estado);
            const comenzo = new Date(cita.fechaHora) <= ahora;
            return (
              <Card key={cita.id}>
                <View style={styles.cabecera}>
                  <AppText variant="subtitle" style={styles.flex}>
                    {formatearHora(cita.fechaHora)}
                  </AppText>
                  <Badge {...ESTADOS_CITA[cita.estado]} />
                </View>
                <AppText variant="bodyStrong">
                  {cita.especialidad.nombre} · {cita.profesional.nombre}
                </AppText>
                <AppText
                  color="textSecondary"
                  accessibilityLabel={`Paciente ${cita.paciente.iniciales}, código ${cita.paciente.codigo}`}
                >
                  Paciente {cita.paciente.iniciales} · {cita.paciente.codigo}
                  {cita.origen === 'cupo_recuperado' ? ' · Cupo recuperado' : ''}
                </AppText>
                {cita.riesgo ? <RiesgoInasistencia riesgo={cita.riesgo} /> : null}
                {activa ? (
                  comenzo ? (
                    <Button
                      title="Registrar inasistencia"
                      variant="secondary"
                      onPress={() => pedir(cita, 'inasistencia')}
                      disabled={enviando}
                    />
                  ) : (
                    <Button
                      title="Registrar cancelación"
                      variant="secondary"
                      onPress={() => pedir(cita, 'cancelacion')}
                      disabled={enviando}
                    />
                  )
                ) : null}
              </Card>
            );
          })}
        </View>
      ))}

      <ConfirmDialog
        visible={dialogoVisible}
        title={textos.titulo}
        message={
          pendiente
            ? `${pendiente.cita.especialidad.nombre}, ${formatearFechaHora(pendiente.cita.fechaHora)}, paciente ${pendiente.cita.paciente.iniciales}. ${textos.mensaje}`
            : ''
        }
        confirmLabel={textos.boton}
        tone="danger"
        loading={enviando}
        onConfirm={confirmar}
        onCancel={() => setDialogoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.xl,
  },
  dia: {
    gap: spacing.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
