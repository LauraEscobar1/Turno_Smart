import type { EstadoOferta, OfertaDetalle } from '@/types';
import type { TiempoRestante } from '@/utils/fechas';

import { useCuentaRegresiva } from './useCuentaRegresiva';
import { useRefrescarOfertas } from './useOfertas';

export interface OfertaEnVivo {
  tiempo: TiempoRestante;
  /** Estado a mostrar: una pendiente cuyo plazo llegó a cero se ve como expirada. */
  estado: EstadoOferta;
  puedeResponder: boolean;
}

/**
 * Combina el estado del servidor con la cuenta regresiva local. Al llegar a cero
 * se pide al servidor el estado real (él decide; la interfaz solo lo anticipa).
 */
export function useOfertaEnVivo(oferta: Pick<OfertaDetalle, 'estado' | 'expiraEn'>): OfertaEnVivo {
  const refrescar = useRefrescarOfertas();
  const pendiente = oferta.estado === 'pendiente';
  const tiempo = useCuentaRegresiva(oferta.expiraEn, { activa: pendiente, alExpirar: refrescar });
  const vencida = pendiente && tiempo.expirado;
  return {
    tiempo,
    estado: vencida ? 'expirada' : oferta.estado,
    puedeResponder: pendiente && !tiempo.expirado,
  };
}
