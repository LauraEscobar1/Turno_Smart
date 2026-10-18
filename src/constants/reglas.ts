/**
 * Reglas de negocio compartidas por la interfaz y el servidor simulado.
 * En la Fase 3 el backend las aplica; la app solo las usa para mostrar y validar.
 */

/** Tiempo que tiene un paciente para responder una oferta. */
export const DURACION_OFERTA_MIN = 15;

/** Un cupo deja de ofrecerse cuando faltan menos de estos minutos para la cita. */
export const MARGEN_CIERRE_CUPO_MIN = 30;

/** Ventana de las métricas del panel. */
export const PERIODO_METRICAS_DIAS = 30;

/** Opciones de distancia máxima (`null` = sin límite). */
export const OPCIONES_DISTANCIA_KM: readonly (number | null)[] = [2, 5, 10, 20, null];

/** Opciones de antelación mínima para aceptar un cupo de último minuto. */
export const OPCIONES_ANTELACION_HORAS: readonly number[] = [1, 2, 4, 12, 24];

/** Rango y paso de las franjas horarias del paciente. */
export const HORARIO_ATENCION = {
  inicio: '06:00',
  fin: '21:00',
  pasoMin: 30,
} as const;

/** Duración por defecto de una franja nueva. */
export const DURACION_FRANJA_POR_DEFECTO_MIN = 4 * 60;
