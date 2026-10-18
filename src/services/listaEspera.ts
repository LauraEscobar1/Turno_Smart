import type { SolicitudDetalle } from '@/types';

/** Lista de espera del paciente autenticado. */
export interface ListaEsperaService {
  /** Todas sus solicitudes (activas y cerradas), de la más reciente a la más antigua. */
  listarSolicitudes(): Promise<SolicitudDetalle[]>;
  /** @throws ServiceError `solicitud_duplicada` si ya tiene una activa en esa especialidad. */
  unirse(especialidadId: string): Promise<SolicitudDetalle>;
  /** Cancela la solicitud. @throws ServiceError `transicion_invalida` si ya no está activa. */
  salir(solicitudId: string): Promise<SolicitudDetalle>;
}
