import type { CitaDetalle } from '@/types';

/** Citas del paciente autenticado. */
export interface CitasService {
  listar(): Promise<CitaDetalle[]>;
  /**
   * Cancela una cita futura y libera su cupo (una cita libera como máximo un cupo).
   * @throws ServiceError `transicion_invalida` · `cita_ya_comenzo`
   */
  cancelar(id: string): Promise<CitaDetalle>;
}
