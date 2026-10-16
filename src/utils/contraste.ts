/** Utilidades WCAG 2.x para validar el contraste de la paleta. */

export const CONTRASTE_AA_TEXTO = 4.5;
export const CONTRASTE_AA_COMPONENTE = 3;

function canalLineal(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa de un color `#RRGGBB`. */
export function luminancia(hex: string): number {
  const limpio = /^#([0-9a-f]{6})$/i.exec(hex)?.[1];
  if (!limpio) {
    throw new Error(`Color no válido: "${hex}". Usa el formato #RRGGBB.`);
  }
  const r = canalLineal(parseInt(limpio.slice(0, 2), 16));
  const g = canalLineal(parseInt(limpio.slice(2, 4), 16));
  const b = canalLineal(parseInt(limpio.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre dos colores (de 1 a 21). */
export function razonContraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
