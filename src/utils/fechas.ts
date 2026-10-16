import type { FechaISO } from '@/types';

const LOCALE = 'es-CO';

/** "mar, 21 oct · 9:30 a. m." a partir de una fecha ISO. */
export function formatearFechaHora(iso: FechaISO): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';
  const dia = fecha.toLocaleDateString(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const hora = fecha.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

/** Fecha ISO desplazada `horas` desde `desde` (útil para datos ficticios relativos a hoy). */
export function enHoras(horas: number, desde: Date = new Date()): FechaISO {
  return new Date(desde.getTime() + horas * 60 * 60 * 1000).toISOString();
}
