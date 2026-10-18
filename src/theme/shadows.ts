import type { ViewStyle } from 'react-native';

/** Sombras con `boxShadow` (soportado en iOS y Android con la Nueva Arquitectura). */
export const shadows = {
  none: {},
  sm: { boxShadow: '0px 1px 2px rgba(16, 42, 53, 0.08)' },
  md: { boxShadow: '0px 2px 8px rgba(16, 42, 53, 0.10)' },
  lg: { boxShadow: '0px 8px 24px rgba(16, 42, 53, 0.14)' },
} as const satisfies Record<string, ViewStyle>;

export type Shadow = keyof typeof shadows;
