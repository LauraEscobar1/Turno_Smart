import type { ReactElement, ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView. */
  scroll?: boolean;
  /**
   * Bordes con área segura. Por defecto, arriba y a los lados: dentro de las pestañas
   * la barra inferior ya respeta el borde inferior. Las pantallas sin pestañas
   * deben incluir `'bottom'`; las que tienen cabecera nativa pueden omitir `'top'`.
   */
  edges?: Edge[];
  /** Aplica el margen lateral estándar. */
  padded?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactElement<RefreshControlProps>;
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  padded = true,
  contentContainerStyle,
  refreshControl,
  testID,
}: ScreenProps) {
  return (
    <SafeAreaView edges={edges} style={styles.raiz} testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            styles.contenido,
            padded && styles.padded,
            styles.scroll,
            contentContainerStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[styles.contenido, padded && styles.padded, styles.fijo, contentContainerStyle]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  raiz: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    gap: spacing.lg,
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  fijo: {
    flex: 1,
  },
});
