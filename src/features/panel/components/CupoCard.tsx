import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { ESTADOS_CUPO, MOTIVOS_LIBERACION } from '@/constants/estados';
import { spacing } from '@/theme';
import type { CupoLiberado } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export interface CupoCardProps {
  cupo: CupoLiberado;
}

export function CupoCard({ cupo }: CupoCardProps) {
  return (
    <Card>
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {cupo.especialidad}
        </AppText>
        <Badge {...ESTADOS_CUPO[cupo.estado]} />
      </View>
      <AppText color="textSecondary">{cupo.profesional}</AppText>
      <AppText variant="bodyStrong">{formatearFechaHora(cupo.fechaHora)}</AppText>
      <AppText variant="caption" color="textSecondary">
        {cupo.sede} · {cupo.duracionMin} min · Motivo: {MOTIVOS_LIBERACION[cupo.motivo]}
      </AppText>
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
