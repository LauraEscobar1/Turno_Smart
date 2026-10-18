import type { Cita } from '@/types';

/** Citas del paciente autenticado (próximas e historial). */
export interface CitasService {
  listarProximas(): Promise<Cita[]>;
  listarHistorial(): Promise<Cita[]>;
  cancelarCita(id: string): Promise<Cita>;
}
