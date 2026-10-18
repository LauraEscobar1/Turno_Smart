import type { Especialidad } from '@/types';

/** Catálogo de especialidades (lectura). */
export interface EspecialidadesService {
  listar(): Promise<Especialidad[]>;
}
