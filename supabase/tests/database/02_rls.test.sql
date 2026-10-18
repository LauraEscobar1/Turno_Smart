-- RLS y privilegios: el paciente ve solo lo suyo; el staff solo su consultorio y a
-- los pacientes por código e iniciales; el cliente no escribe ofertas ni elige destinatarios.
begin;
\ir ../utilidades/escenario.psql

select plan(43);

-- Estado vivo: se libera el cupo objetivo y se ofrece a Ana (regla SQL).
select private.cancelar_cita_interna(pg_temp.id('cita_objetivo'), 'paciente');
select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo'));
insert into public.riesgo_inasistencia (cita_id, nivel, puntaje, explicacion, recomendacion, fuente)
values (pg_temp.id('cita_comenzada'), 'medio', 0.4, 'Ficticio.', 'Recordatorio.', 'estimacion_ficticia');

-- ═════════════ Paciente ═════════════
select pg_temp.como('ana');

select is((select count(*)::integer from public.perfiles), 1, 'paciente: solo ve su perfil');
select is((select count(*)::integer from public.citas where paciente_id <> pg_temp.id('ana')), 0, 'paciente: no ve citas ajenas');
select is((select count(*)::integer from public.citas), 1, 'paciente: ve sus citas');
select is((select count(*)::integer from public.ofertas where paciente_id <> pg_temp.id('ana')), 0, 'paciente: no ve ofertas ajenas');
select is((select count(*)::integer from public.ofertas where estado = 'pendiente'), 1, 'paciente: ve su oferta pendiente');
select is((select count(*)::integer from public.cupos), 3, 'paciente: ve solo los cupos que le ofrecieron');
select is((select count(*)::integer from public.solicitudes_espera where paciente_id <> pg_temp.id('ana')), 0, 'paciente: no ve solicitudes ajenas');
select is((select count(*)::integer from public.franjas_horarias where paciente_id <> pg_temp.id('ana')), 0, 'paciente: no ve preferencias ajenas');
select is((select count(*)::integer from public.notificaciones where usuario_id <> pg_temp.id('ana')), 0, 'paciente: no ve avisos ajenos');
select is((select count(*)::integer from public.priorizaciones), 0, 'paciente: no ve la auditoría de priorización');
select is((select count(*)::integer from public.priorizacion_candidatos), 0, 'paciente: no ve a los demás candidatos');
select is((select count(*)::integer from public.eventos_oferta), 0, 'paciente: no ve la línea de tiempo del staff');
select is((select count(*)::integer from public.riesgo_inasistencia), 0, 'paciente: no ve predicciones de riesgo');
select ok((select count(*) from public.especialidades) >= 2, 'paciente: ve el catálogo');

select throws_ok(
  $$ insert into public.ofertas (cupo_id, consultorio_id, paciente_id, ronda, expira_en, explicacion)
     select cupo_id, consultorio_id, pg_temp.id('ana'), 9, now() + interval '1 hour', explicacion from public.ofertas limit 1 $$,
  '42501', null, 'paciente: no puede insertar ofertas'
);
select throws_ok(
  $$ update public.ofertas set paciente_id = pg_temp.id('bruno') where estado = 'pendiente' $$,
  '42501', null, 'paciente: no puede cambiar el destinatario de una oferta'
);
select throws_ok(
  $$ update public.ofertas set estado = 'aceptada' where estado = 'pendiente' $$,
  '42501', null, 'paciente: no puede cambiar estados sin la RPC'
);
select throws_ok($$ delete from public.citas $$, '42501', null, 'paciente: no puede borrar citas');
select throws_ok($$ truncate public.notificaciones $$, '42501', null, 'paciente: TRUNCATE (que ignora RLS) está revocado');
select throws_ok(
  $$ insert into public.solicitudes_espera (paciente_id, especialidad_id) values (pg_temp.id('ana'), pg_temp.id('pediatria')) $$,
  '42501', null, 'paciente: la lista de espera se modifica solo por RPC'
);

update public.notificaciones set leida = true where not leida;
select is(
  (select count(*)::integer from public.notificaciones where not leida), 0,
  'paciente: marca sus avisos como leídos'
);
select throws_ok(
  $$ update public.notificaciones set titulo = 'otro' $$,
  '42501', null, 'paciente: solo puede cambiar la columna leida'
);
select throws_ok(
  $$ update public.notificaciones set leida = false $$,
  '42501', null, 'paciente: no puede desmarcar avisos (WITH CHECK)'
);

select throws_ok($$ select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo')) $$, '42501', null, 'paciente: no ejecuta ofrecer_siguiente_candidato');
select throws_ok($$ select public.expirar_ofertas() $$, '42501', null, 'paciente: no ejecuta expirar_ofertas');
select throws_ok($$ select public.avanzar_cupos() $$, '42501', null, 'paciente: no ejecuta avanzar_cupos');
select throws_ok($$ select * from public.candidatos_cupo(pg_temp.cupo_de('cita_objetivo')) $$, '42501', null, 'paciente: no lee candidatos');
select throws_ok($$ select public.registrar_priorizacion(pg_temp.cupo_de('cita_objetivo'), '[]') $$, '42501', null, 'paciente: no registra priorizaciones');
select throws_ok($$ select * from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo')) $$, '42501', null, 'paciente: no ejecuta funciones privadas');
select throws_ok($$ select * from public.referencias_pacientes() $$, 'PT403', 'prohibido', 'paciente: referencias_pacientes es solo para staff');

-- ═════════════ Staff ═════════════
select pg_temp.como('staff1');

select is((select count(*)::integer from public.perfiles), 1, 'staff: no lee perfiles de pacientes');
select is(
  (select count(*)::integer from public.citas where consultorio_id <> pg_temp.id('sede_uno')), 0,
  'staff: no ve citas de otro consultorio'
);
select is((select count(*)::integer from public.citas), 3, 'staff: ve las citas de su consultorio');
select is((select count(*)::integer from public.cupos), 1, 'staff: ve solo los cupos de su consultorio');
select is((select count(*)::integer from public.ofertas), 1, 'staff: ve solo las ofertas de su consultorio');
select is((select count(*)::integer from public.priorizacion_candidatos), 4, 'staff: ve los candidatos evaluados en su consultorio');
select is((select count(*)::integer from public.riesgo_inasistencia), 1, 'staff: ve el riesgo de sus citas');

select is(
  pg_get_function_result('public.referencias_pacientes(uuid[])'::regprocedure),
  'TABLE(paciente_id uuid, codigo text, iniciales text)',
  'referencias_pacientes devuelve solo id, código e iniciales'
);
select set_eq(
  $$ select paciente_id from public.referencias_pacientes() $$,
  $$ select pg_temp.id(n) from unnest(array['ana', 'bruno', 'clara', 'diego', 'origen']) as n $$,
  'staff: referencias solo de pacientes relacionados con su consultorio'
);
select ok(
  (select bool_and(codigo ~ '^P-[0-9A-F]{4}$' and iniciales ~ '^[[:upper:]]{1,2}$') from public.referencias_pacientes()),
  'staff: cada referencia es un código y unas iniciales'
);

select pg_temp.como('staff2');
select is(
  (select count(*)::integer from public.citas where consultorio_id = pg_temp.id('sede_uno')), 0,
  'aislamiento: el staff de la Sede Dos no ve la Sede Uno'
);
select is((select count(*)::integer from public.riesgo_inasistencia), 0, 'aislamiento: tampoco su riesgo');

-- ═════════════ Anónimo ═════════════
select pg_temp.como_anonimo();
select throws_ok($$ select * from public.especialidades $$, '42501', null, 'anon: sin sesión no lee ni el catálogo');

select pg_temp.como_admin();
select * from finish();
rollback;
