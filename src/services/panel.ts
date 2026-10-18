import type {
  CitaAgenda,
  CupoConLineaDeTiempo,
  CupoDetalle,
  MetricasPanel,
  OfertaEnCurso,
} from '@/types';

export interface RangoAgenda {
  /** Días desde hoy (0 = hoy). */
  desdeDias: number;
  hastaDias: number;
}

/**
 * Panel del consultorio (rol staff). Todo se limita al consultorio del staff
 * autenticado: un cupo o una cita de otro consultorio responde `no_encontrado`.
 */
export interface PanelService {
  obtenerMetricas(): Promise<MetricasPanel>;
  /** Citas del rango con el riesgo de inasistencia estimado. */
  listarAgenda(rango?: RangoAgenda): Promise<CitaAgenda[]>;
  /** El paciente avisó que no asistirá: cancela la cita y libera el cupo. */
  registrarCancelacion(citaId: string): Promise<CitaAgenda>;
  /** La cita ya comenzó y el paciente no llegó. @throws ServiceError `cita_no_comenzo` */
  registrarInasistencia(citaId: string): Promise<CitaAgenda>;
  listarCupos(): Promise<CupoDetalle[]>;
  /** Cupo con todas sus rondas de oferta (pacientes solo por iniciales y código). */
  obtenerCupo(id: string): Promise<CupoConLineaDeTiempo>;
  listarOfertasEnCurso(): Promise<OfertaEnCurso[]>;
}
