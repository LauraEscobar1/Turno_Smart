-- Concurrencia REAL: dos sesiones simultáneas abiertas con dblink.
--   1. Doble aceptación de la misma oferta: gana una; la otra espera el bloqueo y
--      recibe oferta_ya_respondida. Se crea UNA sola cita.
--   2. Dos procesos ofrecen el mismo cupo a la vez (Edge Function y cron): una sola oferta.
--   3. Dos cupos se ofrecen a la vez al mismo y único candidato: el índice único
--      "una oferta pendiente por paciente" lo impide y el segundo queda sin candidatos.
-- Las otras sesiones no ven datos sin confirmar, así que este escenario se CONFIRMA
-- por una conexión aparte y se borra al final. Credenciales locales por defecto de
-- `supabase start` (postgres/postgres), no secretos.
begin;
set local client_min_messages to warning;
create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;

select plan(12);

create function pg_temp.id(p_nombre text) returns uuid language sql immutable as $$
  select md5('concurrencia:' || p_nombre)::uuid
$$;

select extensions.dblink_connect(
  c,
  format('host=%s port=5432 dbname=postgres user=postgres password=postgres', host(inet_server_addr()))
)
from unnest(array['montaje', 'c1', 'c2']) as c;

-- Borra el escenario confirmado. También se ejecuta al inicio: si una corrida
-- anterior falló a mitad de camino, no deja restos que alteren esta.
create function pg_temp.limpiar() returns void language sql as $fn$
  select extensions.dblink_exec('montaje', format($sql$
  begin;
  set constraints all deferred;
  delete from public.priorizaciones where consultorio_id = %1$L;
  delete from public.notificaciones where usuario_id in (select id from public.perfiles where email like '%%@concurrencia.turnosmart.test');
  delete from public.ofertas where consultorio_id = %1$L;
  delete from public.cupos where consultorio_id = %1$L;
  delete from public.citas where consultorio_id = %1$L;
  delete from auth.users where email like '%%@concurrencia.turnosmart.test';
  delete from public.profesionales where id = %3$L;
  delete from public.especialidades where id = %2$L;
  delete from public.consultorios where id = %1$L;
  commit;
$sql$, pg_temp.id('sede'), pg_temp.id('especialidad'), pg_temp.id('profesional')));
$fn$;

select pg_temp.limpiar();

-- El cron corre al inicio de cada minuto: se evita coincidir con él.
select pg_sleep(62 - extract(second from clock_timestamp())) where extract(second from clock_timestamp()) > 50;

-- ───────────── Escenario confirmado ─────────────

select extensions.dblink_exec('montaje', format($sql$
  begin;
  insert into public.consultorios (id, nombre, direccion, lat, lng) values (%1$L, 'Sede Concurrencia', 'Calle de prueba', 4.6, -74.07);
  insert into public.especialidades (id, nombre) values (%2$L, 'Concurrencia general');
  insert into public.profesionales (id, nombre, especialidad_id, consultorio_id) values (%3$L, 'Dra. Concurrencia', %2$L, %1$L);
  insert into auth.users (id, email, raw_user_meta_data)
  select md5('concurrencia:' || n)::uuid, n || '@concurrencia.turnosmart.test', jsonb_build_object('nombre', 'Persona ' || n)
  from unnest(array['origen', 'paz', 'rio', 'sol']) as n;
  -- paz: única candidata del cupo 1 · rio: del cupo 2 · sol: de los cupos 3 y 4.
  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  select md5('concurrencia:' || n)::uuid, %2$L from unnest(array['paz', 'rio', 'sol']) as n;
  insert into public.citas (id, paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min)
  select md5('concurrencia:cita' || i)::uuid, md5('concurrencia:origen')::uuid, %3$L, %2$L, %1$L,
         now() + make_interval(days => 3, hours => i), 20
  from generate_series(1, 4) as i;
  select private.cancelar_cita_interna(md5('concurrencia:cita' || i)::uuid, 'paciente') from generate_series(1, 4) as i;
  -- La oferta del cupo 1 se crea ya; rio y sol se excluyen de él para que sea de paz.
  update public.solicitudes_espera set estado = 'cancelada', cerrada_en = now()
  where paciente_id in (md5('concurrencia:rio')::uuid, md5('concurrencia:sol')::uuid);
  select public.ofrecer_siguiente_candidato(id) from public.cupos where cita_origen_id = md5('concurrencia:cita1')::uuid;
  insert into public.solicitudes_espera (paciente_id, especialidad_id)
  select md5('concurrencia:' || n)::uuid, %2$L from unnest(array['rio', 'sol']) as n;
  -- rio no puede ir a los cupos 3 y 4; sol no puede ir al cupo 2 (citas que se cruzan).
  insert into public.citas (paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min)
  select md5('concurrencia:' || x.n)::uuid, %3$L, %2$L, %1$L, c.fecha_hora, 20
  from (values ('rio', 'cita3'), ('rio', 'cita4'), ('sol', 'cita2')) as x (n, cita)
  join public.citas c on c.id = md5('concurrencia:' || x.cita)::uuid;
  commit;
$sql$, pg_temp.id('sede'), pg_temp.id('especialidad'), pg_temp.id('profesional')));

create function pg_temp.cupo(p_cita text) returns uuid language sql stable as $$
  select id from public.cupos where cita_origen_id = pg_temp.id(p_cita)
$$;

select is(
  (select count(*)::integer from public.ofertas where cupo_id = pg_temp.cupo('cita1') and estado = 'pendiente'
     and paciente_id = pg_temp.id('paz')),
  1,
  'montaje: paz tiene la oferta pendiente del cupo 1'
);

-- ═════════════ 1. Doble aceptación simultánea ═════════════

select t.* from unnest(array['c1', 'c2']) as c, extensions.dblink(c, format(
  $sql$ select set_config('request.jwt.claims', %L, false), set_config('role', 'authenticated', false) $sql$,
  json_build_object('sub', pg_temp.id('paz'), 'role', 'authenticated')::text
)) as t (claims text, rol text);

create temp table oferta_paz as
  select id from public.ofertas where cupo_id = pg_temp.cupo('cita1') and estado = 'pendiente';

select extensions.dblink_exec('c1', 'begin');
select is(
  (select r from extensions.dblink('c1', format($sql$ select public.responder_oferta(%L, 'aceptar') ->> 'cita_id' is not null $sql$,
     (select id from oferta_paz))) as t (r boolean)),
  true,
  'doble aceptación: la sesión 1 acepta (sin confirmar aún)'
);
select is(
  extensions.dblink_send_query('c2', format($sql$ select public.responder_oferta(%L, 'aceptar') $sql$, (select id from oferta_paz))),
  1,
  'doble aceptación: la sesión 2 envía la misma aceptación'
);
select pg_sleep(0.3);
select is(extensions.dblink_is_busy('c2'), 1, 'doble aceptación: la sesión 2 espera el bloqueo del cupo');
select extensions.dblink_exec('c1', 'commit');
select count(*) from extensions.dblink_get_result('c2', false) as t (r jsonb);
select matches(
  extensions.dblink_error_message('c2'), 'oferta_ya_respondida',
  'doble aceptación: la sesión 2 recibe oferta_ya_respondida'
);
-- Libera la conexión: tras el error queda un resultado vacío por leer.
select count(*) from extensions.dblink_get_result('c2', false) as t (r jsonb);
select is(
  (select r from extensions.dblink('montaje', format(
     $sql$ select count(*)::integer from public.citas where cupo_origen_id = %L $sql$, pg_temp.cupo('cita1'))) as t (r integer)),
  1,
  'doble aceptación: se crea UNA sola cita'
);
select is(
  (select r from extensions.dblink('montaje', format(
     $sql$ select estado from public.cupos where id = %L $sql$, pg_temp.cupo('cita1'))) as t (r text)),
  'asignado',
  'doble aceptación: el cupo queda asignado una vez'
);

select extensions.dblink_exec(c, 'reset role') from unnest(array['c1', 'c2']) as c;

-- ═════════════ 2. Dos procesos ofrecen el mismo cupo ═════════════

select extensions.dblink_exec('c1', 'begin');
select is(
  (select r from extensions.dblink('c1', format(
     $sql$ select public.ofrecer_siguiente_candidato(%L) ->> 'resultado' $sql$, pg_temp.cupo('cita2'))) as t (r text)),
  'oferta_creada',
  'mismo cupo: el primer proceso crea la oferta'
);
select extensions.dblink_send_query('c2', format($sql$ select public.ofrecer_siguiente_candidato(%L) ->> 'resultado' $sql$, pg_temp.cupo('cita2')));
select pg_sleep(0.3);
select extensions.dblink_exec('c1', 'commit');
select is(
  (select r from extensions.dblink_get_result('c2') as t (r text)),
  'ya_ofertado',
  'mismo cupo: el segundo espera y responde ya_ofertado (idempotencia por cupo)'
);
select count(*) from extensions.dblink_get_result('c2', false) as t (r text);

-- ═════════════ 3. Mismo candidato para dos cupos a la vez ═════════════

select extensions.dblink_exec('c1', 'begin');
select is(
  (select r from extensions.dblink('c1', format(
     $sql$ select public.ofrecer_siguiente_candidato(%L) ->> 'resultado' $sql$, pg_temp.cupo('cita3'))) as t (r text)),
  'oferta_creada',
  'mismo candidato: el cupo 3 se ofrece a sol (sin confirmar aún)'
);
select extensions.dblink_send_query('c2', format($sql$ select public.ofrecer_siguiente_candidato(%L) ->> 'resultado' $sql$, pg_temp.cupo('cita4')));
select pg_sleep(0.3);
select extensions.dblink_exec('c1', 'commit');
select is(
  (select r from extensions.dblink_get_result('c2') as t (r text)),
  'sin_candidatos',
  'mismo candidato: el índice único detiene la segunda oferta y el cupo queda sin candidatos'
);
select count(*) from extensions.dblink_get_result('c2', false) as t (r text);
select is(
  (select r from extensions.dblink('montaje', format(
     $sql$ select count(*)::integer from public.ofertas where paciente_id = %L and estado = 'pendiente' $sql$, pg_temp.id('sol'))) as t (r integer)),
  1,
  'mismo candidato: sol tiene una sola oferta pendiente'
);

-- ───────────── Limpieza del escenario confirmado ─────────────

select pg_temp.limpiar();
select extensions.dblink_disconnect(c) from unnest(array['montaje', 'c1', 'c2']) as c;

select * from finish();
rollback;
