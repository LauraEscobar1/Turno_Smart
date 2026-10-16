/**
 * DATOS FICTICIOS — solo para visualizar el panel del consultorio en las Fases 1 y 2.
 */
import type { CupoLiberado, MetricasPanel } from '@/types';
import { enHoras } from '@/utils/fechas';

export const METRICAS_FICTICIAS: MetricasPanel = {
  cuposLiberados: 12,
  cuposRecuperados: 8,
  ofertasEnCurso: 3,
  tasaRecuperacion: 8 / 12,
};

export const CUPOS_FICTICIOS: CupoLiberado[] = [
  {
    id: 'cupo-ficticio-1',
    especialidad: 'Medicina general',
    profesional: 'Dra. Valentina Ruiz (ficticia)',
    sede: 'Sede Centro',
    fechaHora: enHoras(3),
    duracionMin: 20,
    motivo: 'cancelacion',
    estado: 'ofertado',
  },
  {
    id: 'cupo-ficticio-4',
    especialidad: 'Dermatología',
    profesional: 'Dr. Felipe Cárdenas (ficticio)',
    sede: 'Sede Norte',
    fechaHora: enHoras(5),
    duracionMin: 30,
    motivo: 'inasistencia',
    estado: 'liberado',
  },
  {
    id: 'cupo-ficticio-2',
    especialidad: 'Odontología',
    profesional: 'Dr. Andrés Mejía (ficticio)',
    sede: 'Sede Norte',
    fechaHora: enHoras(26),
    duracionMin: 30,
    motivo: 'cancelacion',
    estado: 'recuperado',
  },
];
