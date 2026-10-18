import type { OfertaDetalle } from '@/types';

export type RespuestaOferta = 'aceptar' | 'rechazar';

/** Ofertas de cupos del paciente autenticado (nunca las de otro paciente). */
export interface OfertasService {
  /** Todas sus ofertas: pendientes primero (por vencimiento) y luego el historial. */
  listar(): Promise<OfertaDetalle[]>;
  /** @throws ServiceError `no_encontrado` si no existe o es de otro paciente. */
  obtener(id: string): Promise<OfertaDetalle>;
  /**
   * La decisión final la toma el backend.
   * @throws ServiceError `oferta_expirada` · `oferta_ya_respondida` · `cupo_no_disponible`
   */
  responder(id: string, respuesta: RespuestaOferta): Promise<OfertaDetalle>;
}
