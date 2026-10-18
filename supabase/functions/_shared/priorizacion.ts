/**
 * Regla determinista de priorización (Fase 3). Módulo PURO: sin red, sin variables
 * de entorno y sin reloj implícito (`ahora` llega como parámetro), para probarlo con
 * `deno test` y reutilizarlo en la Fase 5, cuando la IA proponga y el backend decida.
 *
 * Reparto de responsabilidades:
 * - Los FILTROS obligatorios (lista de espera o interés, sin oferta pendiente, sin
 *   cruce de citas, antelación, distancia y franjas) los aplica Postgres en
 *   `candidatos_cupo()`. Aquí solo llegan candidatos válidos.
 * - Este módulo calcula el PUNTAJE y la explicación que ve el paciente.
 * - `private.puntuar_candidatos()` aplica la misma regla en SQL como respaldo del
 *   cron. Ambas se prueban con los mismos casos.
 *
 * Puntaje = Σ valor × peso (cada valor entre 0 y 1, redondeado a 3 decimales):
 * - tiempo de espera ........ 0,4  días en la lista / 30 (tope 1); 0 si solo es interés
 * - compatibilidad horaria .. 0,3  1 dentro de una franja; 0,5 sin franjas
 * - distancia ............... 0,2  1 − km / 20 (mínimo 0); 0,5 si no se conoce la zona
 * - historial de respuesta .. 0,1  aceptadas / respondidas; 0,5 sin historial
 * Orden: puntaje ↓; en empate, quien espera hace más tiempo; luego el id (orden total).
 */

export const VERSION_REGLA = 'determinista-v1';

export const PESOS = {
  tiempoEspera: 0.4,
  compatibilidadHoraria: 0.3,
  distancia: 0.2,
  historialRespuesta: 0.1,
} as const;

const DIAS_ESPERA_MAXIMOS = 30;
const DISTANCIA_REFERENCIA_KM = 20;
const MS_DIA = 24 * 60 * 60 * 1000;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Fila de `public.candidatos_cupo()` (snake_case, como la devuelve PostgREST). */
export interface CandidatoValido {
  paciente_id: string;
  /** Solicitud activa de la especialidad; `null` si solo la marcó como interés. */
  solicitud_id: string | null;
  espera_desde: string | null;
  /** Franja que contiene el cupo (hora local del consultorio), si la hay. */
  franja_dia: number | null;
  franja_inicio: string | null;
  franja_fin: string | null;
  tiene_franjas: boolean;
  /** `null` si el paciente no indicó su zona. */
  distancia_km: number | null;
  ofertas_respondidas: number;
  ofertas_aceptadas: number;
}

export interface ContextoCupo {
  especialidad: string;
  consultorio: string;
}

export interface FactorPrioridad {
  valor: number;
  peso: number;
  detalle: string;
}

export interface ExplicacionPrioridad {
  puntaje: number;
  factores: {
    tiempoEspera: FactorPrioridad;
    compatibilidadHoraria: FactorPrioridad;
    distancia: FactorPrioridad;
    historialRespuesta: FactorPrioridad;
  };
  fuente: 'regla_backend';
}

export interface CandidatoPriorizado {
  posicion: number;
  pacienteId: string;
  explicacion: ExplicacionPrioridad;
}

const redondear = (n: number) => Math.round(n * 1000) / 1000;

function factor(valor: number, peso: number, detalle: string): FactorPrioridad {
  return { valor: redondear(Math.min(Math.max(valor, 0), 1)), peso, detalle };
}

/** "1,7 km" o "12 km" (igual que formatearDistancia() de la app). */
export function formatearDistancia(km: number): string {
  const redondeado = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${redondeado.toString().replace('.', ',')} km`;
}

/** Postgres devuelve `time` como "08:00:00". */
const hora = (valor: string) => valor.slice(0, 5);

export function explicarCandidato(
  candidato: CandidatoValido,
  contexto: ContextoCupo,
  ahora: Date,
): ExplicacionPrioridad {
  const enLista = candidato.solicitud_id !== null && candidato.espera_desde !== null;
  const diasEspera = enLista
    ? Math.max((ahora.getTime() - new Date(candidato.espera_desde as string).getTime()) / MS_DIA, 0)
    : 0;
  const diasEnteros = Math.floor(diasEspera);

  const tiempoEspera = enLista
    ? factor(
        diasEspera / DIAS_ESPERA_MAXIMOS,
        PESOS.tiempoEspera,
        `Llevas ${diasEnteros} ${diasEnteros === 1 ? 'día' : 'días'} en la lista de espera de ${contexto.especialidad}.`,
      )
    : factor(
        0,
        PESOS.tiempoEspera,
        `No estás en la lista de espera de ${contexto.especialidad}, pero la marcaste como especialidad de interés.`,
      );

  const enFranja =
    candidato.franja_dia !== null &&
    candidato.franja_inicio !== null &&
    candidato.franja_fin !== null;
  const compatibilidadHoraria = enFranja
    ? factor(
        1,
        PESOS.compatibilidadHoraria,
        `El cupo está dentro de tu franja del ${DIAS[candidato.franja_dia as number]} de ${hora(candidato.franja_inicio as string)} a ${hora(candidato.franja_fin as string)}.`,
      )
    : factor(
        0.5,
        PESOS.compatibilidadHoraria,
        'No indicaste franjas horarias, así que tomamos cualquier horario como posible.',
      );

  const distancia =
    candidato.distancia_km !== null
      ? factor(
          1 - candidato.distancia_km / DISTANCIA_REFERENCIA_KM,
          PESOS.distancia,
          `${contexto.consultorio} está a unos ${formatearDistancia(candidato.distancia_km)} de tu zona.`,
        )
      : factor(0.5, PESOS.distancia, 'No conocemos tu zona, así que la distancia no influyó.');

  const historialRespuesta =
    candidato.ofertas_respondidas === 0
      ? factor(0.5, PESOS.historialRespuesta, 'Es tu primera oferta: aún no hay historial.')
      : factor(
          candidato.ofertas_aceptadas / candidato.ofertas_respondidas,
          PESOS.historialRespuesta,
          `Aceptaste ${candidato.ofertas_aceptadas} de tus ${candidato.ofertas_respondidas} ofertas anteriores.`,
        );

  const factores = { tiempoEspera, compatibilidadHoraria, distancia, historialRespuesta };
  const puntaje = redondear(
    Object.values(factores).reduce((total, f) => total + f.valor * f.peso, 0),
  );
  return { puntaje, factores, fuente: 'regla_backend' };
}

/** Candidatos ordenados del más al menos prioritario, con su explicación. */
export function priorizarCandidatos(
  candidatos: readonly CandidatoValido[],
  contexto: ContextoCupo,
  ahora: Date,
): CandidatoPriorizado[] {
  return candidatos
    .map((candidato) => ({
      candidato,
      explicacion: explicarCandidato(candidato, contexto, ahora),
      esperaDesde:
        candidato.solicitud_id !== null && candidato.espera_desde !== null
          ? new Date(candidato.espera_desde).getTime()
          : Number.POSITIVE_INFINITY,
    }))
    .sort(
      (a, b) =>
        b.explicacion.puntaje - a.explicacion.puntaje ||
        a.esperaDesde - b.esperaDesde ||
        (a.candidato.paciente_id < b.candidato.paciente_id ? -1 : 1),
    )
    .map((item, indice) => ({
      posicion: indice + 1,
      pacienteId: item.candidato.paciente_id,
      explicacion: item.explicacion,
    }));
}
