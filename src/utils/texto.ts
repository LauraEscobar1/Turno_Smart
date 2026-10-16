/** Iniciales (máximo 2) para avatares: "Ana María Pérez" → "AP". */
export function obtenerIniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  const primera = partes[0]?.charAt(0) ?? '';
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.charAt(0) ?? '') : '';
  return (primera + ultima).toLocaleUpperCase('es');
}
