/**
 * Utilidades HTTP puras de las Edge Functions: validación del cuerpo, traducción de
 * errores de PostgREST y respuestas JSON.
 */

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const CABECERAS_CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

/** `{ "cupoId": "<uuid>" }` → el uuid en minúsculas, o `null` si el cuerpo no es válido. */
export function leerCupoId(cuerpo: unknown): string | null {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) return null;
  const { cupoId } = cuerpo as { cupoId?: unknown };
  return typeof cupoId === 'string' && PATRON_UUID.test(cupoId) ? cupoId.toLowerCase() : null;
}

export interface ErrorHttp {
  estado: number;
  /** Código de `src/services/errores.ts` que la app traduce a ServiceError. */
  codigo: string;
}

/**
 * Las RPC fallan con `message` = código de dominio y `code` = `PTxyz` (estado HTTP xyz).
 * Cualquier otro error es inesperado: 500 `desconocido`.
 */
export function traducirError(error: unknown): ErrorHttp {
  if (typeof error === 'object' && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    if (typeof code === 'string' && /^PT\d{3}$/.test(code) && typeof message === 'string') {
      return { estado: Number(code.slice(2)), codigo: message };
    }
  }
  return { estado: 500, codigo: 'desconocido' };
}

export function responderJson(estado: number, cuerpo: unknown): Response {
  return new Response(cuerpo === null ? null : JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CABECERAS_CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
