import type { Href } from 'expo-router';

import type { Usuario } from '@/types';

export type GrupoRutas = '(auth)' | '(paciente)' | '(staff)';

/**
 * Los grupos no forman parte de la URL y ambos roles tienen `ofertas` y `perfil`,
 * así que dentro de la app se navega siempre con el grupo explícito.
 */
export const RUTAS = {
  login: '/(auth)/login',
  registro: '/(auth)/registro',
  inicioPaciente: '/(paciente)/ofertas',
  inicioStaff: '/(staff)/panel',
} as const satisfies Record<string, Href>;

/** Grupo de rutas al que pertenece la sesión actual. */
export function grupoPara(usuario: Usuario | null): GrupoRutas {
  if (!usuario) return '(auth)';
  return usuario.rol === 'paciente' ? '(paciente)' : '(staff)';
}

export function puedeAcceder(usuario: Usuario | null, grupo: GrupoRutas): boolean {
  return grupoPara(usuario) === grupo;
}

/** Pantalla de inicio según la sesión: sin sesión → login; paciente → ofertas; staff → panel. */
export function rutaInicialPara(usuario: Usuario | null): Href {
  switch (grupoPara(usuario)) {
    case '(auth)':
      return RUTAS.login;
    case '(paciente)':
      return RUTAS.inicioPaciente;
    case '(staff)':
      return RUTAS.inicioStaff;
  }
}
