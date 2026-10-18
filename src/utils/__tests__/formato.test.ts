import {
  agruparPorDia,
  calcularTiempoRestante,
  citaDentroDeFranja,
  describirTiempoRestante,
  enHoras,
  etiquetaDia,
  formatearCuentaRegresiva,
  formatearFechaHora,
  franjasSeSolapan,
  horaAMinutos,
  minutosAHora,
} from '@/utils/fechas';
import { distanciaKm, formatearDistancia } from '@/utils/geo';
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

describe('fechas', () => {
  const base = new Date(2026, 9, 20, 10, 0, 0); // martes 20 oct 2026, 10:00 local

  it('enHoras desplaza la fecha base', () => {
    expect(enHoras(2, base)).toBe(new Date(2026, 9, 20, 12, 0, 0).toISOString());
  });

  it('formatearFechaHora no rompe con fechas inválidas', () => {
    expect(formatearFechaHora('no-es-fecha')).toBe('Fecha no disponible');
    expect(formatearFechaHora(base.toISOString())).toMatch(/^.+ · .+$/);
  });

  it.each([
    [new Date(2026, 9, 20, 18, 0), 'Hoy'],
    [new Date(2026, 9, 21, 8, 0), 'Mañana'],
    [new Date(2026, 9, 19, 8, 0), 'Ayer'],
  ])('etiquetaDia(%s) → %s', (fecha, esperado) => {
    expect(etiquetaDia(fecha.toISOString(), base)).toBe(esperado);
  });

  it('agrupa por día local conservando el orden', () => {
    const fechas = [
      new Date(2026, 9, 20, 9).toISOString(),
      new Date(2026, 9, 20, 15).toISOString(),
      new Date(2026, 9, 21, 9).toISOString(),
    ];
    const grupos = agruparPorDia(fechas, (f) => f);
    expect(grupos.map((g) => g.elementos.length)).toEqual([2, 1]);
  });
});

describe('cuenta regresiva', () => {
  const ahora = new Date('2026-10-20T15:00:00.000Z');

  it('calcula horas, minutos y segundos restantes', () => {
    const tiempo = calcularTiempoRestante('2026-10-20T16:02:09.000Z', ahora);
    expect(tiempo).toMatchObject({ horas: 1, minutos: 2, segundos: 9, expirado: false });
    expect(formatearCuentaRegresiva(tiempo)).toBe('1:02:09');
    expect(describirTiempoRestante(tiempo)).toBe('1 hora y 2 minutos');
  });

  it('muestra mm:ss cuando falta menos de una hora', () => {
    const tiempo = calcularTiempoRestante('2026-10-20T15:14:05.000Z', ahora);
    expect(formatearCuentaRegresiva(tiempo)).toBe('14:05');
    expect(describirTiempoRestante(tiempo)).toBe('14 minutos');
  });

  it('llega a cero y queda expirada (nunca negativa)', () => {
    const tiempo = calcularTiempoRestante('2026-10-20T14:59:00.000Z', ahora);
    expect(tiempo).toMatchObject({ totalMs: 0, expirado: true });
    expect(formatearCuentaRegresiva(tiempo)).toBe('00:00');
    expect(describirTiempoRestante(tiempo)).toBe('Tiempo agotado');
  });

  it('menos de un minuto se describe sin cero minutos', () => {
    const tiempo = calcularTiempoRestante('2026-10-20T15:00:40.000Z', ahora);
    expect(describirTiempoRestante(tiempo)).toBe('Menos de un minuto');
  });
});

describe('horas y franjas', () => {
  it('convierte entre HH:mm y minutos', () => {
    expect(horaAMinutos('08:30')).toBe(510);
    expect(minutosAHora(510)).toBe('08:30');
    expect(() => horaAMinutos('8:30')).toThrow('Hora no válida');
  });

  it('detecta solapes solo en el mismo día y sin contar el borde', () => {
    const lunes = { diaSemana: 1 as const, horaInicio: '08:00', horaFin: '12:00' };
    expect(franjasSeSolapan(lunes, { ...lunes, horaInicio: '11:00', horaFin: '13:00' })).toBe(true);
    expect(franjasSeSolapan(lunes, { ...lunes, horaInicio: '12:00', horaFin: '13:00' })).toBe(
      false,
    );
    expect(franjasSeSolapan(lunes, { ...lunes, diaSemana: 2 })).toBe(false);
  });

  it('una cita cabe en una franja solo si empieza y termina dentro', () => {
    const martes = { diaSemana: 2 as const, horaInicio: '08:00', horaFin: '12:00' };
    expect(citaDentroDeFranja(new Date(2026, 9, 20, 11, 30), 30, martes)).toBe(true);
    expect(citaDentroDeFranja(new Date(2026, 9, 20, 11, 45), 30, martes)).toBe(false);
    expect(citaDentroDeFranja(new Date(2026, 9, 21, 9, 0), 30, martes)).toBe(false);
  });
});

describe('geo', () => {
  it('calcula distancias aproximadas con haversine', () => {
    const km = distanciaKm({ lat: 4.602, lng: -74.07 }, { lat: 4.7, lng: -74.045 });
    expect(km).toBeGreaterThan(10);
    expect(km).toBeLessThan(12);
    expect(distanciaKm({ lat: 4.6, lng: -74 }, { lat: 4.6, lng: -74 })).toBe(0);
  });

  it('formatea con un decimal por debajo de 10 km', () => {
    expect(formatearDistancia(1.84)).toBe('1,8 km');
    expect(formatearDistancia(12.4)).toBe('12 km');
  });
});
