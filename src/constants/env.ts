/**
 * Variables públicas de la app. Expo solo incrusta en el bundle las variables
 * `EXPO_PUBLIC_*` y únicamente si se leen como `process.env.EXPO_PUBLIC_X`
 * (sin desestructurar). Todo lo que se lea aquí es visible para cualquier usuario:
 * los secretos (DEEPSEEK_API_KEY, SERVICE_ROLE) viven solo en el servidor.
 */

export interface EnvPublico {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  /** true si ambas variables de Supabase tienen un valor utilizable. */
  supabaseConfigurado: boolean;
  /** Nombres de las variables que faltan o no son válidas. */
  faltantes: string[];
}

interface FuenteEnv {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
}

const limpiar = (valor: string | undefined): string | null => {
  const recortado = valor?.trim();
  return recortado ? recortado : null;
};

/** Función pura (testeable) que valida las variables recibidas. */
export function leerEnv(fuente: FuenteEnv): EnvPublico {
  const url = limpiar(fuente.EXPO_PUBLIC_SUPABASE_URL);
  const anonKey = limpiar(fuente.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  const urlValida = url !== null && /^https?:\/\/\S+$/.test(url);

  const faltantes: string[] = [];
  if (!urlValida) faltantes.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!anonKey) faltantes.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');

  return {
    supabaseUrl: urlValida ? url : null,
    supabaseAnonKey: anonKey,
    supabaseConfigurado: faltantes.length === 0,
    faltantes,
  };
}

export const env: EnvPublico = leerEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

let avisado = false;

/**
 * Avisa una sola vez (en desarrollo, en la terminal de Metro) si falta configuración.
 * No lanza errores ni muestra alertas: en modo demo la app funciona sin Supabase.
 */
export function avisarSiFaltaConfiguracion(entorno: EnvPublico = env): void {
  if (avisado || entorno.supabaseConfigurado || !__DEV__) return;
  avisado = true;
  console.info(
    `[TurnoSmart] Faltan variables de entorno: ${entorno.faltantes.join(', ')}. ` +
      'La app sigue en MODO DEMO. Copia .env.example a .env para conectar Supabase (Fase 4).',
  );
}
