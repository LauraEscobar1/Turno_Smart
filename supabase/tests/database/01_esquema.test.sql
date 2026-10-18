-- Esquema: tablas, RLS activado, índices únicos, restricciones y máquinas de estado.
begin;
\ir ../utilidades/escenario.psql

select plan(41);

-- ───────────── Tablas del dominio, todas con RLS ─────────────

select tables_are(
  'public',
  array[
    'consultorios', 'especialidades', 'profesionales', 'perfiles', 'preferencias_paciente',
    'preferencias_especialidades', 'franjas_horarias', 'solicitudes_espera', 'citas', 'cupos',
    'ofertas', 'eventos_oferta', 'notificaciones', 'priorizaciones', 'priorizacion_candidatos',
    'riesgo_inasistencia'
  ],
  'public contiene exactamente las tablas del dominio'
);

select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'todas las tablas de public tienen RLS activado'
);

-- ───────────── Índices únicos que sostienen las reglas ─────────────

select ok(
  exists (select 1 from pg_constraint where conname = 'cupos_una_cita_origen' and contype = 'u'),
  'UNIQUE(cita_origen_id) en cupos'
);
select index_is_unique('public', 'ofertas', 'ofertas_una_pendiente_por_cupo_idx', 'índice único: una oferta pendiente por cupo');
select index_is_unique('public', 'ofertas', 'ofertas_una_pendiente_por_paciente_idx', 'índice único: una oferta pendiente por paciente');
select index_is_unique('public', 'solicitudes_espera', 'solicitudes_una_activa_idx', 'índice único: una solicitud activa por especialidad');
select index_is_unique('public', 'citas', 'citas_una_por_cupo_idx', 'índice único: una cita por cupo recuperado');
select ok(
  (select pg_get_indexdef(indexrelid) like '%WHERE (estado = ''pendiente''::text)%'
   from pg_index where indexrelid = 'public.ofertas_una_pendiente_por_cupo_idx'::regclass),
  'el índice de oferta pendiente es parcial (solo estado pendiente)'
);

-- ───────────── Restricciones CHECK y FK ─────────────

select throws_ok(
  $$ insert into public.citas (paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min, estado)
     values (pg_temp.id('ana'), pg_temp.id('prof_uno'), pg_temp.id('general'), pg_temp.id('sede_uno'), now() + interval '2 days', 20, 'perdida') $$,
  '23514', null, 'CHECK: estado de cita desconocido'
);
select throws_ok(
  $$ update public.cupos set estado = 'asignado' where id = pg_temp.id('cupo_h1') $$,
  null, 'CHECK/transición: un cupo no se asigna sin cita ni desde expirado'
);
select throws_ok(
  $$ insert into public.cupos (cita_origen_id, consultorio_id, profesional_id, especialidad_id, fecha_hora, duracion_min, cancelada_por)
     select id, consultorio_id, profesional_id, especialidad_id, fecha_hora, duracion_min, 'paciente'
     from public.citas where id = pg_temp.id('cita_h1') $$,
  '23505', null, 'UNIQUE: una cita libera como máximo un cupo'
);
select throws_ok(
  $$ insert into public.citas (paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min)
     values (pg_temp.id('ana'), pg_temp.id('prof_uno'), pg_temp.id('general'), pg_temp.id('sede_dos'), now() + interval '2 days', 20) $$,
  '23503', null, 'FK compuesta: la sede de la cita debe ser la del profesional'
);
select throws_ok(
  $$ insert into public.solicitudes_espera (paciente_id, especialidad_id) values (pg_temp.id('ana'), pg_temp.id('general')) $$,
  '23505', null, 'UNIQUE parcial: no hay dos solicitudes activas de la misma especialidad'
);
select throws_ok(
  $$ insert into public.franjas_horarias (paciente_id, dia_semana, hora_inicio, hora_fin) values (pg_temp.id('ana'), 1, '11:00', '13:00') $$,
  '23P01', null, 'EXCLUDE: las franjas del mismo día no se solapan'
);
select lives_ok(
  $$ insert into public.franjas_horarias (paciente_id, dia_semana, hora_inicio, hora_fin) values (pg_temp.id('ana'), 1, '12:00', '14:00') $$,
  'tocarse en el borde no es solape'
);
select throws_ok(
  $$ insert into public.franjas_horarias (paciente_id, dia_semana, hora_inicio, hora_fin) values (pg_temp.id('ana'), 3, '12:00', '09:00') $$,
  '23514', null, 'CHECK: la franja empieza antes de terminar'
);
select throws_ok(
  $$ update public.preferencias_paciente set distancia_max_km = 7 where paciente_id = pg_temp.id('ana') $$,
  '23514', null, 'CHECK: la distancia máxima es una de las opciones de la app'
);
select throws_ok(
  $$ update public.perfiles set consultorio_id = null where id = pg_temp.id('staff1') $$,
  '23514', null, 'CHECK: todo staff pertenece a un consultorio'
);
select throws_ok(
  $$ insert into public.riesgo_inasistencia (cita_id, nivel, puntaje, explicacion, recomendacion, fuente)
     values (pg_temp.id('cita_objetivo'), 'bajo', 0.8, 'x', 'y', 'ia') $$,
  '23514', null, 'CHECK: el nivel de riesgo coincide con el puntaje'
);
select throws_ok(
  $$ insert into public.ofertas (cupo_id, consultorio_id, paciente_id, ronda, expira_en, explicacion)
     values (pg_temp.id('cupo_h1'), pg_temp.id('sede_dos'), pg_temp.id('bruno'), 3, now() + interval '5 minutes', '{"puntaje": 2}') $$,
  '23514', null, 'CHECK: la explicación de una oferta tiene la forma de ExplicacionPrioridad'
);
select throws_ok(
  $$ insert into public.ofertas (cupo_id, consultorio_id, paciente_id, ronda, expira_en, explicacion)
     select pg_temp.id('cupo_h1'), pg_temp.id('sede_uno'), pg_temp.id('bruno'), 3, now() + interval '5 minutes', explicacion
     from public.ofertas limit 1 $$,
  '23503', null, 'FK compuesta: la oferta lleva la sede de su cupo'
);

-- ───────────── Máquinas de estado (src/constants/estados.ts) ─────────────

select ok(private.puede_transicionar('oferta', 'pendiente', 'aceptada'), 'oferta: pendiente → aceptada');
select ok(not private.puede_transicionar('oferta', 'aceptada', 'pendiente'), 'oferta: aceptada es terminal');
select ok(private.puede_transicionar('cita', 'confirmada', 'inasistencia'), 'cita: confirmada → inasistencia');
select ok(not private.puede_transicionar('cita', 'cancelada', 'confirmada'), 'cita: cancelada es terminal');
select ok(private.puede_transicionar('cupo', 'ofertando', 'disponible'), 'cupo: ofertando → disponible (sin candidatos)');
select ok(not private.puede_transicionar('cupo', 'disponible', 'asignado'), 'cupo: no se asigna sin ofertarse');
select ok(not private.puede_transicionar('solicitud', 'atendida', 'activa'), 'solicitud: atendida es terminal');
select is(
  (select count(*)::integer from (values ('oferta'), ('cita'), ('cupo'), ('solicitud')) m (maquina),
     lateral (select 1 from (values ('pendiente'), ('programada'), ('disponible'), ('activa')) e (estado)
              where private.puede_transicionar(m.maquina, e.estado, e.estado)) x),
  0,
  'quedarse en el mismo estado no es una transición'
);

select throws_ok(
  $$ update public.citas set estado = 'programada' where id = pg_temp.id('cita_h2_asignada') $$,
  'PT409', 'transicion_invalida', 'trigger: una cita asistida no vuelve a programada'
);
select throws_ok(
  $$ update public.ofertas set estado = 'pendiente', respondida_en = null where paciente_id = pg_temp.id('ana') and estado = 'aceptada' $$,
  'PT409', 'transicion_invalida', 'trigger: una oferta aceptada no vuelve a pendiente'
);
select throws_ok(
  $$ update public.cupos set estado = 'disponible' where id = pg_temp.id('cupo_h1') $$,
  'PT409', 'transicion_invalida', 'trigger: un cupo expirado es terminal'
);
update public.solicitudes_espera set estado = 'atendida', cerrada_en = now() where id = pg_temp.id('sol_diego');
select throws_ok(
  $$ update public.solicitudes_espera set estado = 'activa', cerrada_en = null where id = pg_temp.id('sol_diego') $$,
  'PT409', 'transicion_invalida', 'trigger: una solicitud atendida no vuelve a activa'
);
select lives_ok(
  $$ update public.citas set estado = 'confirmada' where id = pg_temp.id('cita_objetivo') $$,
  'trigger: programada → confirmada es válida'
);

-- ───────────── Registro de usuarios ─────────────

select is(
  (select rol from public.perfiles where id = pg_temp.id('ana')), 'paciente',
  'el trigger crea el perfil de paciente al registrarse'
);
select ok(
  exists (select 1 from public.preferencias_paciente where paciente_id = pg_temp.id('ana') and antelacion_min_horas = 2),
  'y sus preferencias por defecto (antelación de 2 h)'
);
select is(
  (select consultorio_id from public.perfiles where id = pg_temp.id('staff1')), pg_temp.id('sede_uno'),
  'el rol staff y su consultorio salen de app_metadata'
);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (pg_temp.id('intruso'), 'intruso@prueba.turnosmart.test',
        '{"nombre": "Intruso Prueba", "rol": "staff", "consultorio_id": "00000000-0000-0000-0000-000000000000"}', '{}');
select is(
  (select rol from public.perfiles where id = pg_temp.id('intruso')), 'paciente',
  'el rol en user_metadata (lo escribe el cliente) se ignora: el registro crea pacientes'
);
select matches(
  (select codigo from public.perfiles where id = pg_temp.id('ana')), '^P-[0-9A-F]{4}$',
  'cada perfil tiene un código corto estable P-XXXX'
);
select is(private.iniciales('Ana María Pérez'), 'AP', 'iniciales: primera y última palabra');

-- ───────────── Auditoría de ofertas ─────────────

select is(
  (select count(*)::integer from public.eventos_oferta where cupo_id = pg_temp.id('cupo_h1')),
  4,
  'el trigger registra la creación y el cierre de cada oferta'
);

select * from finish();
rollback;
