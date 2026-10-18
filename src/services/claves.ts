/**
 * Claves de caché de react-query. Jerárquicas: invalidar `claves.ofertas.todas`
 * invalida también la lista y cada detalle.
 */
export const claves = {
  raiz: ['turnosmart'] as const,
  perfil: ['turnosmart', 'perfil'] as const,
  especialidades: ['turnosmart', 'especialidades'] as const,
  preferencias: ['turnosmart', 'preferencias'] as const,
  listaEspera: ['turnosmart', 'lista-espera'] as const,
  ofertas: {
    todas: ['turnosmart', 'ofertas'] as const,
    lista: ['turnosmart', 'ofertas', 'lista'] as const,
    detalle: (id: string) => ['turnosmart', 'ofertas', 'detalle', id] as const,
  },
  citas: ['turnosmart', 'citas'] as const,
  notificaciones: {
    todas: ['turnosmart', 'notificaciones'] as const,
    lista: ['turnosmart', 'notificaciones', 'lista'] as const,
    noLeidas: ['turnosmart', 'notificaciones', 'no-leidas'] as const,
  },
  panel: {
    todo: ['turnosmart', 'panel'] as const,
    metricas: ['turnosmart', 'panel', 'metricas'] as const,
    agenda: ['turnosmart', 'panel', 'agenda'] as const,
    cupos: ['turnosmart', 'panel', 'cupos'] as const,
    cupo: (id: string) => ['turnosmart', 'panel', 'cupos', id] as const,
    ofertasEnCurso: ['turnosmart', 'panel', 'ofertas-en-curso'] as const,
  },
} as const;
