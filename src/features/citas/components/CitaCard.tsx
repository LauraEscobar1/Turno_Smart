import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { ESTADOS_CITA } from '@/constants/estados';
import { spacing } from '@/theme';
import type { Cita } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export interface CitaCardProps {
  cita: Cita;
}

export function CitaCard({ cita }: CitaCardProps) {
  const estado = ESTADOS_CITA[cita.estado];
  return (
    <Card>
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {cita.especialidad}
        </AppText>
        <Badge {...estado} />
      </View>
      <AppText color="textSecondary">{cita.profesional}</AppText>
      <AppText variant="bodyStrong">{formatearFechaHora(cita.fechaHora)}</AppText>
      <AppText variant="caption" color="textSecondary">
        {cita.sede}
      </AppText>
      {cita.recuperada ? <Badge label="Cupo recuperado" tone="primary" /> : null}
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
