/**
 * Paleta sanitaria sobria. Todos los pares texto/fondo usados en la app cumplen
 * WCAG AA (≥ 4.5:1); la prueba `contraste.test.ts` lo verifica.
 */

export type TonoEstado = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ColoresTono {
  /** Color sólido: fondos de botón/indicador o texto sobre superficie clara. */
  solid: string;
  /** Fondo suave para insignias y avisos. */
  soft: string;
  /** Texto e iconos sobre `soft`. */
  onSoft: string;
}

export const colors = {
  primary: '#0B6E6E',
  primaryPressed: '#085656',
  onPrimary: '#FFFFFF',

  background: '#F4F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF0F3',
  surfacePressed: '#E3E9EC',

  text: '#102A35',
  textSecondary: '#3F5560',
  textMuted: '#546873',
  textInverse: '#FFFFFF',

  /** Separadores y bordes decorativos de tarjetas. */
  border: '#D3DDE2',
  /** Bordes de controles interactivos (≥ 3:1 sobre superficie). */
  borderStrong: '#7A8C96',
  focus: '#1F5FAD',

  disabled: '#E3E9EC',
  onDisabled: '#546873',

  /** Velo semitransparente para modales. */
  overlay: 'rgba(16, 42, 53, 0.45)',

  tones: {
    neutral: { solid: '#3F5560', soft: '#E6ECEF', onSoft: '#3F5560' },
    primary: { solid: '#0B6E6E', soft: '#D7F0EE', onSoft: '#075050' },
    success: { solid: '#157347', soft: '#DDF3E6', onSoft: '#0E5233' },
    warning: { solid: '#9A5B00', soft: '#FFF1D6', onSoft: '#6E4100' },
    error: { solid: '#B3261E', soft: '#FDE3E1', onSoft: '#8C1D18' },
    info: { solid: '#1F5FAD', soft: '#DFEBFA', onSoft: '#164682' },
  } satisfies Record<TonoEstado, ColoresTono>,
} as const;

export type Colors = typeof colors;
