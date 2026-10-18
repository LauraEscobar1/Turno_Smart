-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 6/6 — Cron y Realtime
-- ════════════════════════════════════════════════════════════════════════════

-- Cada minuto: vence ofertas y cupos, y ofrece los cupos sin oferta vigente al
-- siguiente candidato (regla SQL). Es la red de seguridad de la Edge Function:
-- si la app no la invoca, ningún cupo queda esperando más de un minuto.
-- cron.schedule() con el mismo nombre reemplaza el trabajo: la migración es repetible.
select cron.schedule(
  'turnosmart-expirar-y-avanzar',
  '* * * * *',
  $$select public.expirar_ofertas(); select public.avanzar_cupos();$$
);

-- La app (Fase 4) escucha estos cambios. Realtime aplica las mismas políticas RLS.
alter publication supabase_realtime add table public.ofertas, public.notificaciones;
