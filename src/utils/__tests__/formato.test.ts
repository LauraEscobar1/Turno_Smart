import { enHoras, formatearFechaHora } from '@/utils/fechas';
import { formatearPorcentaje } from '@/utils/numeros';

describe('formatearPorcentaje', () => {
  it.each([
    [8 / 12, '67 %'],
    [0, '0 %'],
    [1, '100 %'],
    [1.4, '100 %'],
    [-0.2, '0 %'],
  ])('%p → %s', (valor, esperado) => {
    expect(formatearPorcentaje(valor)).toBe(esperado);
  });
});

describe('enHoras', () => {
  it('desplaza la fecha base las horas indicadas', () => {
    const base = new Date('2026-10-16T10:00:00.000Z');
    expect(enHoras(2, base)).toBe('2026-10-16T12:00:00.000Z');
    expect(enHoras(-0.5, base)).toBe('2026-10-16T09:30:00.000Z');
  });
});

describe('formatearFechaHora', () => {
  it('incluye día y hora separados por "·"', () => {
    expect(formatearFechaHora('2026-10-20T14:30:00.000Z')).toMatch(/^.+ · .+$/);
  });

  it('no rompe con fechas inválidas', () => {
    expect(formatearFechaHora('no-es-fecha')).toBe('Fecha no disponible');
  });
});
