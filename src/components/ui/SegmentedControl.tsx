import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export interface Segmento<T extends string> {
  valor: T;
  etiqueta: string;
}

export interface SegmentedControlProps<T extends string> {
  segmentos: readonly Segmento<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  accessibilityLabel: string;
}

/** Pestañas internas de una pantalla (por ejemplo, Próximas / Historial). */
export function SegmentedControl<T extends string>({
  segmentos,
  valor,
  onCambiar,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={styles.contenedor}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {segmentos.map((segmento) => {
        const activo = segmento.valor === valor;
        return (
          <Pressable
            key={segmento.valor}
            onPress={() => onCambiar(segmento.valor)}
            accessibilityRole="tab"
            accessibilityLabel={segmento.etiqueta}
            accessibilityState={{ selected: activo }}
            style={[styles.segmento, activo && styles.segmentoActivo]}
          >
            <AppText
              variant="label"
              style={{ color: activo ? colors.onPrimary : colors.textSecondary }}
            >
              {segmento.etiqueta}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segmento: {
    flex: 1,
    minHeight: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  segmentoActivo: {
    backgroundColor: colors.primary,
  },
});
