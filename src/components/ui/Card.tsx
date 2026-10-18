import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

export interface CardProps {
  children: ReactNode;
  /** Si se define, la tarjeta completa es un botón. */
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Sin relleno interno: para tarjetas que contienen filas de lista. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  flush = false,
  style,
  testID,
}: CardProps) {
  if (!onPress) {
    return (
      <View style={[styles.card, flush && styles.flush, style]} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      testID={testID}
      style={({ pressed }) => [
        styles.card,
        flush && styles.flush,
        pressed && styles.presionada,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  flush: {
    padding: 0,
    gap: 0,
    overflow: 'hidden',
  },
  presionada: {
    backgroundColor: colors.surfacePressed,
  },
});
