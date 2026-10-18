import type { PreferenciasPaciente } from '@/types';

export interface PreferenciasService {
  obtener(): Promise<PreferenciasPaciente>;
  guardar(preferencias: PreferenciasPaciente): Promise<PreferenciasPaciente>;
}
