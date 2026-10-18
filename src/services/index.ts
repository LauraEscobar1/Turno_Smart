/**
 * PUNTO ÚNICO de selección de la implementación de servicios.
 * Fase 2: servidor simulado en memoria (modo demo).
 * Fase 4: reemplazar `crearServiciosMock()` por `crearServiciosSupabase()`.
 * Las pantallas no cambian: consumen los servicios con `useServicios()`.
 */
import { crearServiciosMock } from './mock';
import type { Servicios } from './servicios';

export const servicios: Servicios = crearServiciosMock();

export type { AuthService, Credenciales, DatosRegistro, OyenteSesion } from './auth';
export type { CitasService } from './citas';
export type { EspecialidadesService } from './especialidades';
export {
  codigoDeError,
  esErrorReintentable,
  esServiceError,
  mensajeDeError,
  ServiceError,
  type CodigoError,
} from './errores';
export type { ListaEsperaService } from './listaEspera';
export type { NotificacionesService } from './notificaciones';
export type { OfertasService, RespuestaOferta } from './ofertas';
export type { PanelService, RangoAgenda } from './panel';
export type { PerfilService } from './perfil';
export type { PreferenciasService } from './preferencias';
export type { HerramientasDemo, ModoFallos, Servicios } from './servicios';
