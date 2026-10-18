import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card } from '@/components/ui';
import { ESTADOS_CITA } from '@/constants/estados';
import { spacing } from '@/theme';
import type { CitaDetalle } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export interface CitaCardProps {
  cita: CitaDetalle;
  /** Si se define, muestra el botón "Cancelar cita". */
  onCancelar?: () => void;
  cancelando?: boolean;
}

export function CitaCard({ cita, onCancelar, cancelando = false }: CitaCardProps) {
  const estado = ESTADOS_CITA[cita.estado];
  const recuperada = cita.origen === 'cupo_recuperado';
  return (
    <Card>
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {cita.especialidad.nombre}
        </AppText>
        <Badge {...estado} />
      </View>
      <AppText color="textSecondary">{cita.profesional.nombre}</AppText>
      <AppText variant="bodyStrong">{formatearFechaHora(cita.fechaHora)}</AppText>
      <AppText variant="caption" color="textSecondary">
        {cita.consultorio.nombre} · {cita.consultorio.direccion}
      </AppText>
      {recuperada ? (
        <Badge
          label="Cupo recuperado"
          tone="primary"
          accessibilityLabel="Origen: cupo recuperado de una cancelación"
        />
      ) : null}
      {onCancelar ? (
        <Button
          title="Cancelar cita"
          variant="ghost"
          onPress={onCancelar}
          disabled={cancelando}
          accessibilityLabel={`Cancelar la cita de ${cita.especialidad.nombre}`}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
  },
});
