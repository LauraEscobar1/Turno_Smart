-- pg_cron (vencimientos cada minuto) y publicación de Realtime.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  (select schedule from cron.job where jobname = 'turnosmart-expirar-y-avanzar'), '* * * * *',
  'cron: el trabajo corre cada minuto'
);
select ok(
  (select active from cron.job where jobname = 'turnosmart-expirar-y-avanzar'),
  'cron: el trabajo está activo'
);
select is(
  (select command from cron.job where jobname = 'turnosmart-expirar-y-avanzar'),
  'select public.expirar_ofertas(); select public.avanzar_cupos();',
  'cron: vence ofertas y luego avanza los cupos'
);
select is(
  (select username from cron.job where jobname = 'turnosmart-expirar-y-avanzar'), 'postgres',
  'cron: corre como el dueño de las funciones'
);
select set_eq(
  $$ select tablename::text from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' $$,
  array['ofertas', 'notificaciones'],
  'realtime: la app puede escuchar ofertas y notificaciones (con RLS)'
);

select * from finish();
rollback;
