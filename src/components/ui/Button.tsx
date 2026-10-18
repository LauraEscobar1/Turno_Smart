import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface EstiloVariante {
  fondo: string;
  fondoPresionado: string;
  texto: string;
  borde: string;
}

const variantes: Record<ButtonVariant, EstiloVariante> = {
  primary: {
    fondo: colors.primary,
    fondoPresionado: colors.primaryPressed,
    texto: colors.onPrimary,
    borde: colors.primary,
  },
  secondary: {
    fondo: colors.surface,
    fondoPresionado: colors.surfacePressed,
    texto: colors.primary,
    borde: colors.primary,
  },
  ghost: {
    fondo: 'transparent',
    fondoPresionado: colors.surfacePressed,
    texto: colors.primary,
    borde: 'transparent',
  },
  danger: {
    fondo: colors.tones.error.solid,
    fondoPresionado: colors.tones.error.onSoft,
    texto: colors.textInverse,
    borde: colors.tones.error.solid,
  },
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const inactivo = Boolean(disabled) || loading;
  const apagado = Boolean(disabled) && !loading;
  const v = variantes[variant];
  const colorTexto = apagado ? colors.onDisabled : v.texto;
  const fondoApagado = variant === 'ghost' ? 'transparent' : colors.disabled;

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      disabled={inactivo}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: apagado ? fondoApagado : pressed ? v.fondoPresionado : v.fondo,
          borderColor: apagado ? fondoApagado : v.borde,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={colorTexto}
          importantForAccessibility="no"
          testID="button-spinner"
        />
      ) : null}
      <AppText variant="bodyStrong" align="center" style={[styles.texto, { color: colorTexto }]}>
        {title}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.controlHeight,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  // Sin límite de líneas: con fuentes grandes o pantallas estrechas el texto baja de línea.
  texto: {
    flexShrink: 1,
  },
});
