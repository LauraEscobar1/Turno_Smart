import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { spacing } from '@/theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Acción opcional a la derecha (por ejemplo, un botón o avatar). */
  right?: ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.textos}>
        <AppText variant="title" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textos: {
    flex: 1,
    gap: spacing.xxs,
  },
});
