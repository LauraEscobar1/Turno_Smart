import type { OfertaCupo } from '@/types';

/** Ofertas de cupos para el paciente autenticado. */
export interface OfertasService {
  listarOfertas(): Promise<OfertaCupo[]>;
  obtenerOferta(id: string): Promise<OfertaCupo | null>;
  /** La asignación final la valida el backend (el cupo pudo tomarlo otra persona). */
  aceptarOferta(id: string): Promise<OfertaCupo>;
  rechazarOferta(id: string): Promise<OfertaCupo>;
}
