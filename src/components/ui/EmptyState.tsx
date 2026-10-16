import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.contenedor}>
      <View style={styles.icono}>
        <Icon name={icon} size={32} color={colors.primary} />
      </View>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      {description ? (
        <AppText color="textSecondary" align="center">
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} variant="secondary" onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.tones.primary.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
