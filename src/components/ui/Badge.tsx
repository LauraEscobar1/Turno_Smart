import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, type TonoEstado } from '@/theme';

import { AppText } from './AppText';

export interface BadgeProps {
  label: string;
  tone?: TonoEstado;
  /** Texto para lector de pantalla; por defecto, `label`. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Insignia de estado. El estado se comunica con texto, no solo con color. */
export function Badge({ label, tone = 'neutral', accessibilityLabel, style }: BadgeProps) {
  const { soft, onSoft } = colors.tones[tone];
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.badge, { backgroundColor: soft }, style]}
    >
      <View style={[styles.punto, { backgroundColor: onSoft }]} />
      <AppText variant="label" style={{ color: onSoft }}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
});
