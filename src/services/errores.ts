/**
 * Errores de servicio tipados. Cualquier implementación (simulada o Supabase)
 * debe traducir sus errores a `ServiceError` con uno de estos códigos.
 */

export type CodigoError =
  | 'sin_conexion'
  | 'no_autenticado'
  | 'credenciales_invalidas'
  | 'email_en_uso'
  | 'no_encontrado'
  | 'prohibido'
  | 'validacion'
  | 'transicion_invalida'
  | 'oferta_expirada'
  | 'oferta_ya_respondida'
  | 'cupo_no_disponible'
  | 'solicitud_duplicada'
  | 'cita_ya_comenzo'
  | 'cita_no_comenzo'
  | 'desconocido';

export class ServiceError extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError, mensajeTecnico?: string) {
    super(mensajeTecnico ?? codigo);
    this.name = 'ServiceError';
    this.codigo = codigo;
  }
}

export function esServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}

export function codigoDeError(error: unknown): CodigoError {
  return esServiceError(error) ? error.codigo : 'desconocido';
}

const MENSAJES: Record<CodigoError, string> = {
  sin_conexion: 'No pudimos conectarnos. Revisa tu conexión e inténtalo de nuevo.',
  no_autenticado: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  credenciales_invalidas: 'El correo o la contraseña no son correctos.',
  email_en_uso: 'Ya existe una cuenta con este correo.',
  no_encontrado: 'No encontramos lo que buscabas. Es posible que ya no esté disponible.',
  prohibido: 'No tienes permiso para realizar esta acción.',
  validacion: 'Revisa los datos ingresados.',
  transicion_invalida: 'Esta acción ya no está disponible para el estado actual.',
  oferta_expirada: 'Esta oferta ya expiró. Te avisaremos cuando se libere otro cupo.',
  oferta_ya_respondida: 'Esta oferta ya fue respondida.',
  cupo_no_disponible: 'Este cupo ya no está disponible.',
  solicitud_duplicada: 'Ya estás en la lista de espera de esta especialidad.',
  cita_ya_comenzo: 'La cita ya comenzó: regístrala como inasistencia si el paciente no llegó.',
  cita_no_comenzo: 'Solo puedes registrar una inasistencia cuando la cita ya comenzó.',
  desconocido: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
};

/** Mensaje comprensible para la persona usuaria, en español. */
export function mensajeDeError(error: unknown): string {
  return MENSAJES[codigoDeError(error)];
}

/** Errores transitorios: tiene sentido reintentar automáticamente. */
export function esErrorReintentable(error: unknown): boolean {
  return codigoDeError(error) === 'sin_conexion';
}
