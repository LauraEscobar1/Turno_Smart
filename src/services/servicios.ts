import type { Rol } from '@/types';

import type { AuthService, Credenciales } from './auth';
import type { CitasService } from './citas';
import type { EspecialidadesService } from './especialidades';
import type { ListaEsperaService } from './listaEspera';
import type { NotificacionesService } from './notificaciones';
import type { OfertasService } from './ofertas';
import type { PanelService } from './panel';
import type { PerfilService } from './perfil';
import type { PreferenciasService } from './preferencias';

export type ModoFallos = 'ninguno' | 'intermitente' | 'siempre';

/** Controles que solo existen en modo demo (servidor simulado). */
export interface HerramientasDemo {
  /** Credenciales de los accesos rápidos de la pantalla de inicio. */
  cuentas: Record<Rol, Credenciales>;
  obtenerModoFallos(): ModoFallos;
  /** `intermitente` falla ~30 % de las peticiones; `siempre`, todas. */
  configurarFallos(modo: ModoFallos): void;
  /** Latencia artificial de cada petición (300–800 ms por defecto; 0 en pruebas). */
  configurarLatencia(latenciaMs: { min: number; max: number }): void;
  /** Vuelve a generar los datos ficticios (fechas relativas a ahora). */
  restablecerDatos(): Promise<void>;
}

/** Conjunto de servicios de la app. Se elige la implementación en `src/services/index.ts`. */
export interface Servicios {
  auth: AuthService;
  perfil: PerfilService;
  preferencias: PreferenciasService;
  especialidades: EspecialidadesService;
  listaEspera: ListaEsperaService;
  ofertas: OfertasService;
  citas: CitasService;
  notificaciones: NotificacionesService;
  panel: PanelService;
  /** `null` fuera del modo demo (Fase 4 con Supabase). */
  demo: HerramientasDemo | null;
}
