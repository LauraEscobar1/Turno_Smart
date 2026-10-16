import { leerEnv } from '@/constants/env';

describe('leerEnv', () => {
  it('marca Supabase como configurado con valores válidos', () => {
    const env = leerEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'clave-publica',
    });
    expect(env).toEqual({
      supabaseUrl: 'https://abc.supabase.co',
      supabaseAnonKey: 'clave-publica',
      supabaseConfigurado: true,
      faltantes: [],
    });
  });

  it('no falla si faltan las variables (modo demo)', () => {
    const env = leerEnv({});
    expect(env.supabaseConfigurado).toBe(false);
    expect(env.faltantes).toEqual(['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']);
  });

  it('trata los valores vacíos o sin protocolo como faltantes', () => {
    const env = leerEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: '   ',
    });
    expect(env.supabaseUrl).toBeNull();
    expect(env.supabaseAnonKey).toBeNull();
    expect(env.faltantes).toHaveLength(2);
  });
});
