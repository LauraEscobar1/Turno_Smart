import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon } from './Icon';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Algo salió mal',
  message,
  onRetry,
  retryLabel = 'Reintentar',
}: ErrorStateProps) {
  return (
    <View style={styles.contenedor}>
      <View style={styles.icono}>
        <Icon name="alert-circle-outline" size={32} color={colors.tones.error.solid} />
      </View>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText
        color="textSecondary"
        align="center"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        {message}
      </AppText>
      {onRetry ? <Button title={retryLabel} variant="primary" onPress={onRetry} /> : null}
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
    backgroundColor: colors.tones.error.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
