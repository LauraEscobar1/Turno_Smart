import { useEffect, useRef } from 'react';

import { useAhora } from '@/hooks/useAhora';
import type { FechaISO } from '@/types';
import { calcularTiempoRestante, type TiempoRestante } from '@/utils/fechas';

export interface OpcionesCuentaRegresiva {
  /** false: no hace tictac (oferta ya respondida). */
  activa?: boolean;
  /** Se llama una sola vez al llegar a cero. */
  alExpirar?: () => void;
}

/** Tiempo restante hasta `expiraEn`, actualizado cada segundo. */
export function useCuentaRegresiva(
  expiraEn: FechaISO,
  { activa = true, alExpirar }: OpcionesCuentaRegresiva = {},
): TiempoRestante {
  const ahora = useAhora(1000, activa);
  const tiempo = calcularTiempoRestante(expiraEn, ahora);
  const avisado = useRef(false);

  useEffect(() => {
    if (activa && tiempo.expirado && !avisado.current) {
      avisado.current = true;
      alExpirar?.();
    }
  }, [activa, tiempo.expirado, alExpirar]);

  return tiempo;
}
