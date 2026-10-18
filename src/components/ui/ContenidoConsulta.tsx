import type { ReactNode } from 'react';

import { mensajeDeError } from '@/services/errores';

import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

/** Lo mínimo de una consulta de react-query (sin acoplar la UI a la librería). */
export interface EstadoDeConsulta<T> {
  data: T | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => unknown;
}

export interface ContenidoConsultaProps<T> {
  consulta: EstadoDeConsulta<T>;
  children: (datos: T) => ReactNode;
  /** Si devuelve true se muestra `vacio` en lugar de `children`. */
  esVacio?: (datos: T) => boolean;
  vacio?: ReactNode;
  mensajeCarga?: string;
}

/** Resuelve los cuatro estados de una pantalla con datos: carga, error, vacío y éxito. */
export function ContenidoConsulta<T>({
  consulta,
  children,
  esVacio,
  vacio,
  mensajeCarga,
}: ContenidoConsultaProps<T>) {
  if (consulta.isPending) return <LoadingState message={mensajeCarga} />;
  // Si falla un refresco en segundo plano pero ya hay datos, se siguen mostrando.
  if (consulta.data === undefined) {
    return (
      <ErrorState
        message={mensajeDeError(consulta.error)}
        onRetry={() => void consulta.refetch()}
        retrying={consulta.isFetching}
      />
    );
  }
  if (esVacio?.(consulta.data) && vacio) return <>{vacio}</>;
  return <>{children(consulta.data)}</>;
}
