import { StyleSheet, View } from 'react-native';

import { colors, spacing, type Spacing } from '@/theme';

export interface DividerProps {
  /** Margen vertical alrededor de la línea. */
  spacingY?: Spacing;
}

/** Separador decorativo; se oculta a los lectores de pantalla. */
export function Divider({ spacingY = 'md' }: DividerProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.linea, { marginVertical: spacing[spacingY] }]}
    />
  );
}

const styles = StyleSheet.create({
  linea: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
