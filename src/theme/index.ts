import { colors } from './colors';
import { shadows } from './shadows';
import { layout, radius, spacing } from './spacing';
import { typography } from './typography';

export { colors, layout, radius, shadows, spacing, typography };
export type { Colors, ColoresTono, TonoEstado } from './colors';
export type { Shadow } from './shadows';
export type { Radius, Spacing } from './spacing';
export type { TypographyVariant } from './typography';

export const theme = { colors, spacing, radius, layout, typography, shadows } as const;
export type Theme = typeof theme;
