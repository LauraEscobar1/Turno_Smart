import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando…' }: LoadingStateProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityState={{ busy: true }}
      accessibilityLiveRegion="polite"
      style={styles.contenedor}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText color="textSecondary" align="center">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
});
