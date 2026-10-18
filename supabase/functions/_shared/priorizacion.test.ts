/**
 * Regla determinista de priorización. Los cuatro candidatos y sus resultados son los
 * MISMOS que comprueba supabase/tests/database/04_priorizacion.test.sql sobre la regla
 * SQL: así las dos implementaciones no pueden separarse sin que falle una prueba.
 */
import { assertAlmostEquals, assertEquals, assertNotStrictEquals } from 'jsr:@std/assert@1.0.19';

import {
  type CandidatoValido,
  explicarCandidato,
  formatearDistancia,
  PESOS,
  priorizarCandidatos,
  VERSION_REGLA,
} from './priorizacion.ts';

const AHORA = new Date('2026-10-18T15:00:00.000Z');
const MS_DIA = 24 * 60 * 60 * 1000;
const haceDias = (dias: number) => new Date(AHORA.getTime() - dias * MS_DIA).toISOString();
const CONTEXTO = { especialidad: 'Prueba general', consultorio: 'Sede Prueba Uno' };

function candidato(datos: Partial<CandidatoValido> & { paciente_id: string }): CandidatoValido {
  return {
    solicitud_id: null,
    espera_desde: null,
    franja_dia: null,
    franja_inicio: null,
    franja_fin: null,
    tiene_franjas: false,
    distancia_km: null,
    ofertas_respondidas: 0,
    ofertas_aceptadas: 0,
    ...datos,
  };
}

// Mismo escenario que supabase/tests/utilidades/escenario.psql.
const ANA = candidato({
  paciente_id: '00000000-0000-4000-8000-0000000000a1',
  solicitud_id: 'sol-ana',
  espera_desde: haceDias(28),
  franja_dia: 1,
  franja_inicio: '08:00:00',
  franja_fin: '12:00:00',
  tiene_franjas: true,
  distancia_km: 0,
  ofertas_respondidas: 2,
  ofertas_aceptadas: 1,
});
const CLARA = candidato({
  paciente_id: '00000000-0000-4000-8000-0000000000c1',
  solicitud_id: 'sol-clara',
  espera_desde: haceDias(45),
  distancia_km: 10.0075,
  ofertas_respondidas: 2,
  ofertas_aceptadas: 0,
});
const DIEGO = candidato({
  paciente_id: '00000000-0000-4000-8000-0000000000d1',
  solicitud_id: 'sol-diego',
  espera_desde: haceDias(1),
  distancia_km: 0,
});
const BRUNO = candidato({ paciente_id: '00000000-0000-4000-8000-0000000000b1' });

Deno.test('pesos: espera 40 %, horario 30 %, distancia 20 %, historial 10 %', () => {
  assertEquals(PESOS, {
    tiempoEspera: 0.4,
    compatibilidadHoraria: 0.3,
    distancia: 0.2,
    historialRespuesta: 0.1,
  });
  assertAlmostEquals(
    Object.values(PESOS).reduce((total, peso) => total + peso, 0),
    1,
  );
  assertEquals(VERSION_REGLA, 'determinista-v1');
});

Deno.test('orden y puntajes esperados (iguales a la regla SQL)', () => {
  const ranking = priorizarCandidatos([BRUNO, DIEGO, CLARA, ANA], CONTEXTO, AHORA);
  assertEquals(
    ranking.map(({ posicion, pacienteId, explicacion }) => [
      posicion,
      pacienteId,
      explicacion.puntaje,
    ]),
    [
      [1, ANA.paciente_id, 0.923],
      [2, CLARA.paciente_id, 0.65],
      [3, DIEGO.paciente_id, 0.413],
      [4, BRUNO.paciente_id, 0.3],
    ],
  );
});

Deno.test('explicación estructurada de Ana: los cuatro factores con valor, peso y detalle', () => {
  assertEquals(explicarCandidato(ANA, CONTEXTO, AHORA), {
    puntaje: 0.923,
    fuente: 'regla_backend',
    factores: {
      tiempoEspera: {
        valor: 0.933,
        peso: 0.4,
        detalle: 'Llevas 28 días en la lista de espera de Prueba general.',
      },
      compatibilidadHoraria: {
        valor: 1,
        peso: 0.3,
        detalle: 'El cupo está dentro de tu franja del lunes de 08:00 a 12:00.',
      },
      distancia: { valor: 1, peso: 0.2, detalle: 'Sede Prueba Uno está a unos 0 km de tu zona.' },
      historialRespuesta: {
        valor: 0.5,
        peso: 0.1,
        detalle: 'Aceptaste 1 de tus 2 ofertas anteriores.',
      },
    },
  });
});

Deno.test('la espera topa en 30 días y la distancia se redondea a "10 km"', () => {
  const { factores } = explicarCandidato(CLARA, CONTEXTO, AHORA);
  assertEquals(factores.tiempoEspera.valor, 1);
  assertEquals(factores.distancia, {
    valor: 0.5,
    peso: 0.2,
    detalle: 'Sede Prueba Uno está a unos 10 km de tu zona.',
  });
  assertEquals(factores.historialRespuesta.valor, 0);
  assertEquals(factores.compatibilidadHoraria, {
    valor: 0.5,
    peso: 0.3,
    detalle: 'No indicaste franjas horarias, así que tomamos cualquier horario como posible.',
  });
});

Deno.test('singular para un día de espera', () => {
  assertEquals(
    explicarCandidato(DIEGO, CONTEXTO, AHORA).factores.tiempoEspera.detalle,
    'Llevas 1 día en la lista de espera de Prueba general.',
  );
});

Deno.test('solo interés, sin zona y sin historial: valores neutros', () => {
  const { factores } = explicarCandidato(BRUNO, CONTEXTO, AHORA);
  assertEquals(factores.tiempoEspera, {
    valor: 0,
    peso: 0.4,
    detalle:
      'No estás en la lista de espera de Prueba general, pero la marcaste como especialidad de interés.',
  });
  assertEquals(factores.distancia.valor, 0.5);
  assertEquals(
    factores.distancia.detalle,
    'No conocemos tu zona, así que la distancia no influyó.',
  );
  assertEquals(factores.historialRespuesta.valor, 0.5);
  assertEquals(factores.historialRespuesta.detalle, 'Es tu primera oferta: aún no hay historial.');
});

Deno.test('los valores se acotan entre 0 y 1', () => {
  const lejos = candidato({
    paciente_id: 'x',
    distancia_km: 35,
    solicitud_id: 's',
    espera_desde: haceDias(400),
  });
  const { factores, puntaje } = explicarCandidato(lejos, CONTEXTO, AHORA);
  assertEquals(factores.distancia.valor, 0);
  assertEquals(factores.tiempoEspera.valor, 1);
  assertEquals(puntaje >= 0 && puntaje <= 1, true);
  // Una fecha futura (reloj desfasado) no da espera negativa.
  const futuro = candidato({ paciente_id: 'y', solicitud_id: 's', espera_desde: haceDias(-2) });
  assertEquals(explicarCandidato(futuro, CONTEXTO, AHORA).factores.tiempoEspera.valor, 0);
});

Deno.test('desempate: quien espera hace más tiempo y, después, el id', () => {
  const base = { distancia_km: 0, solicitud_id: 's', espera_desde: haceDias(10) };
  const antiguo = candidato({ ...base, paciente_id: 'b', espera_desde: haceDias(10.0001) });
  const igualA = candidato({ ...base, paciente_id: 'c' });
  const igualB = candidato({ ...base, paciente_id: 'a' });
  // Mismo puntaje redondeado (0,533) para los tres.
  const ranking = priorizarCandidatos([igualA, antiguo, igualB], CONTEXTO, AHORA);
  assertEquals(
    ranking.map((c) => c.explicacion.puntaje),
    [0.533, 0.533, 0.533],
  );
  assertEquals(
    ranking.map((c) => c.pacienteId),
    ['b', 'a', 'c'],
  );
});

Deno.test('determinista y puro: el orden de entrada no importa y no muta la entrada', () => {
  const entrada = [DIEGO, BRUNO, ANA, CLARA];
  const copia = structuredClone(entrada);
  const uno = priorizarCandidatos(entrada, CONTEXTO, AHORA);
  const dos = priorizarCandidatos([...entrada].reverse(), CONTEXTO, AHORA);
  assertEquals(uno, dos);
  assertEquals(entrada, copia);
  assertNotStrictEquals(uno, dos);
  assertEquals(priorizarCandidatos([], CONTEXTO, AHORA), []);
});

Deno.test('formatearDistancia igual que la app y que SQL', () => {
  assertEquals(formatearDistancia(0), '0 km');
  assertEquals(formatearDistancia(1.74), '1,7 km');
  assertEquals(formatearDistancia(9.96), '10 km');
  assertEquals(formatearDistancia(12.4), '12 km');
});
