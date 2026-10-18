import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { useServicios } from '@/context/ServiciosContext';
import { spacing } from '@/theme';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  /** Acción opcional a la derecha (por ejemplo, un botón o avatar). */
  right?: ReactNode;
}

export function Header({ title, subtitle, right }: HeaderProps) {
  const { demo } = useServicios();
  return (
    <View style={styles.header}>
      <View style={styles.textos}>
        <View style={styles.titulo}>
          <AppText variant="title" accessibilityRole="header" style={styles.textoTitulo}>
            {title}
          </AppText>
          {demo ? (
            <Badge label="Demo" tone="warning" accessibilityLabel="Modo demo: datos ficticios" />
          ) : null}
        </View>
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
  titulo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  textoTitulo: {
    flexShrink: 1,
  },
});
