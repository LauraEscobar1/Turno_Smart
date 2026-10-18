import type { PreferenciasPaciente } from '@/types';
import type { DatosPreferencias } from '@/validacion/preferencias';

/** Preferencias del paciente autenticado. */
export interface PreferenciasService {
  obtener(): Promise<PreferenciasPaciente>;
  /** El backend vuelve a validar los datos. @throws ServiceError `validacion` */
  guardar(datos: DatosPreferencias): Promise<PreferenciasPaciente>;
}
