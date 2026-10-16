/**
 * DATOS FICTICIOS — solo para visualizar las pantallas en las Fases 1 y 2.
 */
import type { Cita } from '@/types';
import { enHoras } from '@/utils/fechas';

export const CITAS_FICTICIAS: Cita[] = [
  {
    id: 'cita-ficticia-1',
    especialidad: 'Odontología',
    profesional: 'Dr. Andrés Mejía (ficticio)',
    sede: 'Sede Norte',
    fechaHora: enHoras(26),
    estado: 'confirmada',
    recuperada: true,
  },
  {
    id: 'cita-ficticia-2',
    especialidad: 'Medicina general',
    profesional: 'Dra. Valentina Ruiz (ficticia)',
    sede: 'Sede Centro',
    fechaHora: enHoras(24 * 6),
    estado: 'programada',
    recuperada: false,
  },
];
