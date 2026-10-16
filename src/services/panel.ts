import type { MetricasPanel, RiesgoInasistencia } from '@/types';

/** Datos agregados para el panel del consultorio (rol staff). */
export interface PanelService {
  obtenerMetricas(): Promise<MetricasPanel>;
  /**
   * Riesgo de inasistencia de las próximas citas. Lo calcula una Edge Function con
   * DeepSeek (Fase 5); la app nunca llama a la IA directamente.
   */
  listarRiesgos(): Promise<RiesgoInasistencia[]>;
}
