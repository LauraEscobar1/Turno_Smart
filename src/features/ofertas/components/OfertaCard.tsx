import { StyleSheet, View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { ESTADOS_OFERTA } from '@/constants/estados';
import { spacing } from '@/theme';
import type { OfertaCupo } from '@/types';
import { formatearFechaHora } from '@/utils/fechas';

export interface OfertaCardProps {
  oferta: OfertaCupo;
  onPress?: () => void;
}

export function OfertaCard({ oferta, onPress }: OfertaCardProps) {
  const estado = ESTADOS_OFERTA[oferta.estado];
  const fecha = formatearFechaHora(oferta.fechaHora);
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${oferta.especialidad}, ${fecha}, ${oferta.sede}. Estado: ${estado.label}`}
      accessibilityHint="Abre el detalle de la oferta"
    >
      <View style={styles.cabecera}>
        <AppText variant="subtitle" style={styles.titulo}>
          {oferta.especialidad}
        </AppText>
        <Badge {...estado} />
      </View>
      <AppText color="textSecondary">{oferta.profesional}</AppText>
      <AppText variant="bodyStrong">{fecha}</AppText>
      <AppText variant="caption" color="textSecondary">
        {oferta.sede} · {oferta.duracionMin} min
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
