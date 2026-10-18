import type { Href } from 'expo-router';

import type { Perfil } from '@/types';

export type GrupoRutas = '(auth)' | '(paciente)' | '(staff)';

type ConRol = Pick<Perfil, 'rol'> | null;

/**
 * Los grupos no forman parte de la URL y ambos roles tienen `ofertas` y `perfil`,
 * así que dentro de la app se navega siempre con el grupo explícito.
 */
export const RUTAS = {
  login: '/(auth)/login',
  registro: '/(auth)/registro',
  inicioPaciente: '/(paciente)/ofertas',
  citasPaciente: '/(paciente)/citas',
  listaEspera: '/(paciente)/ofertas/lista-espera',
  historialOfertas: '/(paciente)/ofertas/historial',
  preferencias: '/(paciente)/perfil/preferencias',
  inicioStaff: '/(staff)/panel',
} as const satisfies Record<string, Href>;

/** Grupo de rutas al que pertenece la sesión actual. */
export function grupoPara(usuario: ConRol): GrupoRutas {
  if (!usuario) return '(auth)';
  return usuario.rol === 'paciente' ? '(paciente)' : '(staff)';
}

export function puedeAcceder(usuario: ConRol, grupo: GrupoRutas): boolean {
  return grupoPara(usuario) === grupo;
}

/** Pantalla de inicio según la sesión: sin sesión → login; paciente → ofertas; staff → panel. */
export function rutaInicialPara(usuario: ConRol): Href {
  switch (grupoPara(usuario)) {
    case '(auth)':
      return RUTAS.login;
    case '(paciente)':
      return RUTAS.inicioPaciente;
    case '(staff)':
      return RUTAS.inicioStaff;
  }
}
