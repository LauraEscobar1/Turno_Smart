import { StyleSheet, View } from 'react-native';

import { AppText, Card, Icon, type IconName } from '@/components/ui';
import { colors, spacing } from '@/theme';

export interface MetricaCardProps {
  etiqueta: string;
  valor: string;
  icono: IconName;
}

export function MetricaCard({ etiqueta, valor, icono }: MetricaCardProps) {
  return (
    <View style={styles.celda} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Card style={styles.card}>
        <Icon name={icono} size={22} color={colors.primary} />
        <AppText variant="display">{valor}</AppText>
        <AppText variant="caption" color="textSecondary">
          {etiqueta}
        </AppText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  celda: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  card: {
    flex: 1,
    gap: spacing.xs,
  },
});
