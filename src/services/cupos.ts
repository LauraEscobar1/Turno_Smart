import type { CupoLiberado, FechaISO, MotivoLiberacion, OfertaCupo } from '@/types';

export interface DatosLiberacion {
  citaId: string;
  motivo: MotivoLiberacion;
  registradaEn?: FechaISO;
}

/** Operaciones del staff sobre la agenda del consultorio. */
export interface CuposService {
  listarCupos(): Promise<CupoLiberado[]>;
  /** Registra una cancelación o inasistencia y libera el cupo correspondiente. */
  registrarLiberacion(datos: DatosLiberacion): Promise<CupoLiberado>;
  /** Ofertas en curso para los cupos liberados. */
  listarOfertasEnCurso(): Promise<OfertaCupo[]>;
}
