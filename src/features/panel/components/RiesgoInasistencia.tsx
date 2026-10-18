import { StyleSheet, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { NIVELES_RIESGO } from '@/constants/estados';
import { colors, radius, spacing } from '@/theme';
import type { RiesgoInasistencia as Riesgo } from '@/types';

const ETIQUETA_FUENTE = {
  estimacion_ficticia: 'Estimación ficticia · la IA llega en la Fase 5',
  ia: 'Estimación de IA · la decisión es del staff',
} as const;

/** Riesgo de inasistencia con su explicación y recomendación. Siempre indica su fuente. */
export function RiesgoInasistencia({ riesgo }: { riesgo: Riesgo }) {
  const presentacion = NIVELES_RIESGO[riesgo.nivel];
  return (
    <View
      style={styles.contenedor}
      accessible
      accessibilityLabel={`${presentacion.label}. ${riesgo.explicacion} Recomendación: ${riesgo.recomendacion} ${ETIQUETA_FUENTE[riesgo.fuente]}.`}
    >
      <Badge {...presentacion} />
      <AppText variant="caption" color="textSecondary">
        {riesgo.explicacion} {riesgo.recomendacion}
      </AppText>
      <AppText variant="caption" color="textSecondary" style={styles.fuente}>
        {ETIQUETA_FUENTE[riesgo.fuente]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  fuente: {
    fontStyle: 'italic',
  },
});
