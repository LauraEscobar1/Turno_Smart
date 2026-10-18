/**
 * ⚠️ ESTIMACIÓN FICTICIA (Fase 2). Regla fija solo para visualizar el badge de
 * riesgo en la agenda. La predicción real la hace la IA desde el backend (Fase 5).
 * Usa únicamente el historial de asistencia y el estado de la cita: sin datos clínicos.
 */
import type { Cita, NivelRiesgo, RiesgoInasistencia } from '@/types';

const RECOMENDACIONES: Record<NivelRiesgo, string> = {
  bajo: 'Sin acción adicional.',
  medio: 'Enviar un recordatorio el día anterior.',
  alto: 'Llamar para confirmar la asistencia con 24 horas de antelación.',
};

export function estimarRiesgoFicticio(
  cita: Cita,
  historialPaciente: readonly Cita[],
  ahora: Date,
): RiesgoInasistencia {
  const pasadas = historialPaciente.filter(
    (c) =>
      c.id !== cita.id &&
      new Date(c.fechaHora) < ahora &&
      (c.estado === 'asistida' || c.estado === 'inasistencia'),
  );
  const inasistencias = pasadas.filter((c) => c.estado === 'inasistencia').length;
  const tasa = pasadas.length === 0 ? 0 : inasistencias / pasadas.length;
  const sinConfirmar = cita.estado === 'programada';

  const puntaje = Math.min(
    0.15 + 0.55 * tasa + (sinConfirmar ? 0.15 : 0) + (pasadas.length === 0 ? 0.1 : 0),
    1,
  );
  const nivel: NivelRiesgo = puntaje < 0.35 ? 'bajo' : puntaje < 0.6 ? 'medio' : 'alto';

  const historial =
    pasadas.length === 0
      ? 'Sin historial de citas anteriores'
      : `${inasistencias} ${inasistencias === 1 ? 'inasistencia' : 'inasistencias'} en sus últimas ${pasadas.length} citas`;
  const confirmacion = sinConfirmar ? 'la cita aún no está confirmada' : 'la cita está confirmada';

  return {
    citaId: cita.id,
    nivel,
    puntaje: Math.round(puntaje * 100) / 100,
    explicacion: `${historial}; ${confirmacion}.`,
    recomendacion: RECOMENDACIONES[nivel],
    fuente: 'estimacion_ficticia',
  };
}
