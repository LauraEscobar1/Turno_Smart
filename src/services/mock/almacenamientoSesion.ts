import AsyncStorage from '@react-native-async-storage/async-storage';

/** Dónde se guarda la sesión demo entre aperturas de la app. */
export interface AlmacenamientoSesion {
  leer(): Promise<string | null>;
  guardar(valor: string): Promise<void>;
  borrar(): Promise<void>;
}

export const CLAVE_SESION_DEMO = 'turnosmart:sesion-demo';

/** AsyncStorage funciona en Expo Go. En la Fase 4, Supabase Auth persiste su propia sesión. */
export const almacenamientoAsyncStorage: AlmacenamientoSesion = {
  leer: () => AsyncStorage.getItem(CLAVE_SESION_DEMO),
  guardar: (valor) => AsyncStorage.setItem(CLAVE_SESION_DEMO, valor),
  borrar: () => AsyncStorage.removeItem(CLAVE_SESION_DEMO),
};

/** Almacenamiento en memoria para pruebas. */
export function crearAlmacenamientoEnMemoria(inicial: string | null = null): AlmacenamientoSesion {
  let valor = inicial;
  return {
    leer: async () => valor,
    guardar: async (nuevo) => {
      valor = nuevo;
    },
    borrar: async () => {
      valor = null;
    },
  };
}
