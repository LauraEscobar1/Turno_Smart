/**
 * DATOS FICTICIOS — solo para visualizar las pantallas en las Fases 1 y 2.
 * Profesionales, sedes y horarios inventados; no corresponden a personas reales.
 */
import type { OfertaCupo } from '@/types';
import { enHoras } from '@/utils/fechas';

export const OFERTAS_FICTICIAS: OfertaCupo[] = [
  {
    id: 'oferta-ficticia-1',
    cupoId: 'cupo-ficticio-1',
    especialidad: 'Medicina general',
    profesional: 'Dra. Valentina Ruiz (ficticia)',
    sede: 'Sede Centro',
    fechaHora: enHoras(3),
    duracionMin: 20,
    estado: 'pendiente',
    expiraEn: enHoras(0.5),
  },
  {
    id: 'oferta-ficticia-2',
    cupoId: 'cupo-ficticio-2',
    especialidad: 'Odontología',
    profesional: 'Dr. Andrés Mejía (ficticio)',
    sede: 'Sede Norte',
    fechaHora: enHoras(26),
    duracionMin: 30,
    estado: 'aceptada',
    expiraEn: enHoras(2),
  },
  {
    id: 'oferta-ficticia-3',
    cupoId: 'cupo-ficticio-3',
    especialidad: 'Pediatría',
    profesional: 'Dra. Camila Torres (ficticia)',
    sede: 'Sede Centro',
    fechaHora: enHoras(-20),
    duracionMin: 20,
    estado: 'expirada',
    expiraEn: enHoras(-22),
  },
];
