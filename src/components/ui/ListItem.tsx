import { Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** Fila de lista; si recibe `onPress` se comporta como botón y muestra un chevron. */
export function ListItem({ title, subtitle, icon, onPress, accessibilityHint }: ListItemProps) {
  const contenido = (
    <>
      {icon ? <Icon name={icon} size={22} color={colors.primary} /> : null}
      <View style={styles.textos}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onPress ? <Icon name="chevron-forward" size={20} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.fila}
        accessible
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      >
        {contenido}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [styles.fila, pressed && styles.presionada]}
    >
      {contenido}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    minHeight: layout.controlHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  presionada: {
    backgroundColor: colors.surfacePressed,
  },
  textos: {
    flex: 1,
    gap: spacing.xxs,
  },
});
