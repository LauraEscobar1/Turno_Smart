/** Escala de espaciado en múltiplos de 4. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

/** Medidas de interacción y accesibilidad. */
export const layout = {
  /** Área táctil mínima recomendada (WCAG 2.5.5 / Apple HIG). */
  minTouchTarget: 44,
  controlHeight: 48,
  screenPadding: spacing.lg,
  maxContentWidth: 640,
} as const;

export type Spacing = keyof typeof spacing;
export type Radius = keyof typeof radius;
