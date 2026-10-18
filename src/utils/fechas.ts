import type { DiaSemana, FechaISO, FranjaHoraria, HoraDelDia } from '@/types';

const LOCALE = 'es-CO';
const MS_MINUTO = 60 * 1000;
const MS_HORA = 60 * MS_MINUTO;
const MS_DIA = 24 * MS_HORA;

const esFechaValida = (fecha: Date) => !Number.isNaN(fecha.getTime());

/** "mar, 21 oct · 9:30 a. m." a partir de una fecha ISO. */
export function formatearFechaHora(iso: FechaISO): string {
  const fecha = new Date(iso);
  if (!esFechaValida(fecha)) return 'Fecha no disponible';
  return `${formatearDia(fecha)} · ${formatearHora(iso)}`;
}

/** "mar, 21 oct". */
function formatearDia(fecha: Date): string {
  return fecha.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** "9:30 a. m." */
export function formatearHora(iso: FechaISO): string {
  const fecha = new Date(iso);
  if (!esFechaValida(fecha)) return '—';
  return fecha.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
}

/** Fecha ISO desplazada `horas` desde `desde` (útil para datos ficticios relativos a hoy). */
export function enHoras(horas: number, desde: Date = new Date()): FechaISO {
  return new Date(desde.getTime() + horas * MS_HORA).toISOString();
}

export function enMinutos(minutos: number, desde: Date = new Date()): FechaISO {
  return new Date(desde.getTime() + minutos * MS_MINUTO).toISOString();
}

/** Inicio del día local (00:00) de una fecha. */
export function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Días naturales entre dos fechas (negativo si `b` es anterior a `a`). */
export function diasCalendarioEntre(a: Date, b: Date): number {
  return Math.round((inicioDelDia(b).getTime() - inicioDelDia(a).getTime()) / MS_DIA);
}

/** "Hoy", "Mañana", "Ayer" o "lunes, 21 de octubre". */
export function etiquetaDia(iso: FechaISO, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (!esFechaValida(fecha)) return 'Fecha no disponible';
  const diferencia = diasCalendarioEntre(ahora, fecha);
  if (diferencia === 0) return 'Hoy';
  if (diferencia === 1) return 'Mañana';
  if (diferencia === -1) return 'Ayer';
  return fecha.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Agrupa elementos por día local, en orden de aparición. */
export function agruparPorDia<T>(
  elementos: readonly T[],
  obtenerFecha: (elemento: T) => FechaISO,
): { dia: string; elementos: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const elemento of elementos) {
    const clave = inicioDelDia(new Date(obtenerFecha(elemento))).toISOString();
    const grupo = grupos.get(clave);
    if (grupo) grupo.push(elemento);
    else grupos.set(clave, [elemento]);
  }
  return [...grupos.entries()].map(([dia, items]) => ({ dia, elementos: items }));
}

// ───────────── Cuenta regresiva ─────────────

export interface TiempoRestante {
  totalMs: number;
  horas: number;
  minutos: number;
  segundos: number;
  expirado: boolean;
}

export function calcularTiempoRestante(
  expiraEn: FechaISO,
  ahora: Date = new Date(),
): TiempoRestante {
  const fin = new Date(expiraEn).getTime();
  const totalMs = Number.isNaN(fin) ? 0 : Math.max(fin - ahora.getTime(), 0);
  const totalSegundos = Math.floor(totalMs / 1000);
  return {
    totalMs,
    horas: Math.floor(totalSegundos / 3600),
    minutos: Math.floor((totalSegundos % 3600) / 60),
    segundos: totalSegundos % 60,
    expirado: totalMs === 0,
  };
}

const dosDigitos = (n: number) => n.toString().padStart(2, '0');

/** Formato visual: "14:05" o "1:02:09". */
export function formatearCuentaRegresiva(tiempo: TiempoRestante): string {
  const base = `${dosDigitos(tiempo.minutos)}:${dosDigitos(tiempo.segundos)}`;
  return tiempo.horas > 0 ? `${tiempo.horas}:${base}` : base;
}

/** Formato para lector de pantalla, sin segundos: "14 minutos", "1 hora y 2 minutos". */
export function describirTiempoRestante(tiempo: TiempoRestante): string {
  if (tiempo.expirado) return 'Tiempo agotado';
  const partes: string[] = [];
  if (tiempo.horas > 0) partes.push(`${tiempo.horas} ${tiempo.horas === 1 ? 'hora' : 'horas'}`);
  if (tiempo.minutos > 0) {
    partes.push(`${tiempo.minutos} ${tiempo.minutos === 1 ? 'minuto' : 'minutos'}`);
  }
  if (partes.length === 0) return 'Menos de un minuto';
  return partes.join(' y ');
}

// ───────────── Horas del día y franjas ─────────────

const PATRON_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esHoraValida(hora: string): hora is HoraDelDia {
  return PATRON_HORA.test(hora);
}

/** "08:30" → 510. */
export function horaAMinutos(hora: HoraDelDia): number {
  const coincidencia = PATRON_HORA.exec(hora);
  if (!coincidencia) throw new Error(`Hora no válida: "${hora}". Usa el formato HH:mm.`);
  return Number(coincidencia[1]) * 60 + Number(coincidencia[2]);
}

/** 510 → "08:30". */
export function minutosAHora(minutos: number): HoraDelDia {
  const acotado = Math.min(Math.max(Math.round(minutos), 0), 23 * 60 + 59);
  return `${dosDigitos(Math.floor(acotado / 60))}:${dosDigitos(acotado % 60)}`;
}

/** true si dos franjas del mismo día se solapan (tocarse en el borde no es solape). */
export function franjasSeSolapan(a: FranjaHoraria, b: FranjaHoraria): boolean {
  if (a.diaSemana !== b.diaSemana) return false;
  return (
    horaAMinutos(a.horaInicio) < horaAMinutos(b.horaFin) &&
    horaAMinutos(b.horaInicio) < horaAMinutos(a.horaFin)
  );
}

/** true si la cita (inicio y fin, en hora local) cabe completa dentro de la franja. */
export function citaDentroDeFranja(
  inicio: Date,
  duracionMin: number,
  franja: FranjaHoraria,
): boolean {
  if ((inicio.getDay() as DiaSemana) !== franja.diaSemana) return false;
  const minutoInicio = inicio.getHours() * 60 + inicio.getMinutes();
  return (
    minutoInicio >= horaAMinutos(franja.horaInicio) &&
    minutoInicio + duracionMin <= horaAMinutos(franja.horaFin)
  );
}

/** Horas completas entre dos fechas (puede ser negativo). */
export function horasEntre(desde: Date, hasta: Date): number {
  return (hasta.getTime() - desde.getTime()) / MS_HORA;
}
