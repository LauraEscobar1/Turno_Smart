/** 0.6667 → "67 %". Los valores fuera de [0, 1] se acotan. */
export function formatearPorcentaje(valor: number): string {
  const acotado = Math.min(Math.max(valor, 0), 1);
  return `${Math.round(acotado * 100)} %`;
}
