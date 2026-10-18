import type { Coordenadas } from '@/types';

const RADIO_TIERRA_KM = 6371;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia en línea recta (fórmula de haversine), en kilómetros. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.sqrt(h));
}

/** "1,8 km" o "12 km". */
export function formatearDistancia(km: number): string {
  const redondeado = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${redondeado.toLocaleString('es-CO')} km`;
}
