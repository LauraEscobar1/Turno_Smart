import { obtenerIniciales } from '@/utils/texto';

describe('obtenerIniciales', () => {
  it.each([
    ['Ana María Pérez', 'AP'],
    ['laura', 'L'],
    ['  Juan   Gómez  ', 'JG'],
    ['álvaro ñúñez', 'ÁÑ'],
    ['', '?'],
    ['   ', '?'],
  ])('"%s" → "%s"', (nombre, esperado) => {
    expect(obtenerIniciales(nombre)).toBe(esperado);
  });
});
