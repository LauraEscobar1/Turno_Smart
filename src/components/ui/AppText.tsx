import { Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

const coloresTexto = {
  text: colors.text,
  textSecondary: colors.textSecondary,
  textMuted: colors.textMuted,
  textInverse: colors.textInverse,
  primary: colors.primary,
  success: colors.tones.success.solid,
  warning: colors.tones.warning.solid,
  error: colors.tones.error.solid,
  info: colors.tones.info.solid,
} as const;

export type ColorTexto = keyof typeof coloresTexto;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorTexto;
  align?: 'left' | 'center' | 'right';
}

/** Texto con la escala tipográfica y los colores del tema. Respeta el tamaño de fuente del sistema. */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  accessibilityRole,
  ...rest
}: AppTextProps) {
  const esTitulo = variant === 'display' || variant === 'title';
  return (
    <Text
      {...rest}
      accessibilityRole={accessibilityRole ?? (esTitulo ? 'header' : undefined)}
      style={[typography[variant], { color: coloresTexto[color], textAlign: align }, style]}
    />
  );
}
