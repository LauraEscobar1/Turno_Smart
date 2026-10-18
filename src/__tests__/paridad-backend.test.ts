/**
 * Paridad app ↔ backend. El servidor simulado (Fase 2) y Supabase (Fase 3) aplican las
 * mismas reglas desde copias distintas (TypeScript y SQL). Si alguien cambia solo una,
 * esta prueba falla antes de que la Fase 4 conecte la app al backend.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  TRANSICIONES_CITA,
  TRANSICIONES_CUPO,
  TRANSICIONES_OFERTA,
  TRANSICIONES_SOLICITUD,
} from '@/constants/estados';
import {
  DURACION_OFERTA_MIN,
  MARGEN_CIERRE_CUPO_MIN,
  OPCIONES_ANTELACION_HORAS,
  OPCIONES_DISTANCIA_KM,
} from '@/constants/reglas';
import { PESOS_SIMULADOS } from '@/services/mock/reglaPriorizacion';

import { PESOS } from '../../supabase/functions/_shared/priorizacion';

const CARPETA_MIGRACIONES = join(__dirname, '../../supabase/migrations');

const sql = readdirSync(CARPETA_MIGRACIONES)
  .filter((archivo) => archivo.endsWith('.sql'))
  .sort()
  .map((archivo) => readFileSync(join(CARPETA_MIGRACIONES, archivo), 'utf8'))
  .join('\n');

function cuerpoDeFuncion(nombre: string): string {
  const inicio = sql.indexOf(`create function ${nombre}(`);
  if (inicio < 0) throw new Error(`No se encontró la función ${nombre} en las migraciones`);
  return sql.slice(inicio, sql.indexOf('$$;', inicio));
}

describe('paridad con el backend de Supabase', () => {
  it('las transiciones de estado coinciden con private.puede_transicionar()', () => {
    const enSql = [
      ...cuerpoDeFuncion('private.puede_transicionar').matchAll(/\('(\w+)', '(\w+)', '(\w+)'\)/g),
    ]
      .map(([, maquina, desde, hacia]) => `${maquina}: ${desde} → ${hacia}`)
      .sort();

    const maquinas: Record<string, Readonly<Record<string, readonly string[]>>> = {
      oferta: TRANSICIONES_OFERTA,
      cita: TRANSICIONES_CITA,
      cupo: TRANSICIONES_CUPO,
      solicitud: TRANSICIONES_SOLICITUD,
    };
    const enApp = Object.entries(maquinas)
      .flatMap(([maquina, transiciones]) =>
        Object.entries(transiciones).flatMap(([desde, destinos]) =>
          destinos.map((hacia) => `${maquina}: ${desde} → ${hacia}`),
        ),
      )
      .sort();

    expect(enSql).toEqual(enApp);
  });

  it('el plazo de las ofertas y el cierre de los cupos son los mismos', () => {
    expect(cuerpoDeFuncion('private.duracion_oferta')).toContain(
      `interval '${DURACION_OFERTA_MIN} minutes'`,
    );
    expect(cuerpoDeFuncion('private.margen_cierre_cupo')).toContain(
      `interval '${MARGEN_CIERRE_CUPO_MIN} minutes'`,
    );
  });

  it('las opciones de distancia y antelación son las mismas que valida el formulario', () => {
    const distancias = OPCIONES_DISTANCIA_KM.filter((km) => km !== null).join(', ');
    expect(sql).toContain(`distancia_max_km in (${distancias})`);
    expect(sql).toContain(`antelacion_min_horas in (${OPCIONES_ANTELACION_HORAS.join(', ')})`);
  });

  it('los pesos de la priorización son los mismos en la simulación, la Edge Function y SQL', () => {
    expect(PESOS).toEqual(PESOS_SIMULADOS);
    const pesosSql = /'(\{.*\})'::jsonb/.exec(cuerpoDeFuncion('private.pesos_priorizacion'))?.[1];
    expect(JSON.parse(pesosSql ?? 'null')).toEqual(PESOS);
  });
});
