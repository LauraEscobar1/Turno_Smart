-- RPC transaccionales: mismas reglas que el servidor simulado (docs/flujos.md).
begin;
\ir ../utilidades/escenario.psql

select plan(69);

create function pg_temp.nombre_de(p_id uuid) returns text language sql stable as $$
  select n from unnest(array['ana', 'bruno', 'clara', 'diego', 'origen', 'eva', 'hugo', 'ivan']) as n
  where pg_temp.id(n) = p_id
$$;
grant execute on function pg_temp.nombre_de(uuid) to authenticated, service_role;

create function pg_temp.pendiente_de(p_cupo uuid) returns public.ofertas language sql stable as $$
  select * from public.ofertas where cupo_id = p_cupo and estado = 'pendiente'
$$;

-- ═════════════ cancelar_cita ═════════════

select pg_temp.como('clara');
select throws_ok($$ select public.cancelar_cita(pg_temp.id('cita_objetivo')) $$, 'PT404', 'no_encontrado', 'cancelar: la cita de otro paciente no existe para mí');
select pg_temp.como('staff2');
select throws_ok($$ select public.cancelar_cita(pg_temp.id('cita_objetivo')) $$, 'PT404', 'no_encontrado', 'cancelar: el staff no ve citas de otro consultorio');

select pg_temp.como('origen');
select is(
  (select public.cancelar_cita(pg_temp.id('cita_objetivo')) ->> 'requiere_priorizacion'), 'true',
  'cancelar: libera un cupo que hay que priorizar'
);
select throws_ok($$ select public.cancelar_cita(pg_temp.id('cita_objetivo')) $$, 'PT409', 'transicion_invalida', 'cancelar: dos veces es una transición inválida');

select pg_temp.como_admin();
select ok(
  (select estado = 'cancelada' and cancelada_en is not null from public.citas where id = pg_temp.id('cita_objetivo')),
  'cancelar: la cita queda cancelada con su fecha'
);
select ok(
  (select estado = 'disponible' and ronda_actual = 0 and cancelada_por = 'paciente' and duracion_min = 20
   from public.cupos where id = pg_temp.cupo_de('cita_objetivo')),
  'cancelar: el cupo nace disponible, en la ronda 0, con los datos de la cita'
);
select throws_ok(
  $$ select private.cancelar_cita_interna(pg_temp.id('cita_objetivo'), 'staff') $$,
  'PT409', 'transicion_invalida', 'cancelar: repetir la operación interna no vuelve a cancelar'
);
select is(
  (select count(*)::integer from public.cupos where cita_origen_id = pg_temp.id('cita_objetivo')), 1,
  'cancelar: idempotente, la cita liberó exactamente un cupo'
);

select pg_temp.como('staff1');
select throws_ok($$ select public.cancelar_cita(pg_temp.id('cita_comenzada')) $$, 'PT409', 'cita_ya_comenzo', 'cancelar: una cita que ya comenzó no se cancela');
select pg_temp.como('bruno');
select is(
  (select public.cancelar_cita(pg_temp.id('cita_inminente')) ->> 'cupo_id'), null,
  'cancelar: con menos de 30 minutos de margen no se libera un cupo ofertable'
);
select pg_temp.como('staff2');
select lives_ok($$ select public.cancelar_cita(pg_temp.id('cita_sede_dos')) $$, 'cancelar: el staff cancela una cita de su consultorio');
select pg_temp.como_admin();
select ok(
  exists (select 1 from public.notificaciones where usuario_id = pg_temp.id('clara') and tipo = 'cita_cancelada'),
  'cancelar: si cancela el consultorio, el paciente recibe un aviso'
);
select is(
  (select cancelada_por from public.cupos where id = pg_temp.cupo_de('cita_sede_dos')), 'staff',
  'cancelar: el cupo registra quién canceló'
);

-- ═════════════ ofrecer_siguiente_candidato (service_role) ═════════════

select pg_temp.como_servidor();
select is(
  (select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo')) ->> 'resultado'), 'oferta_creada',
  'ofrecer: crea la oferta para el mejor candidato'
);
select is(
  (select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo')) ->> 'resultado'), 'ya_ofertado',
  'ofrecer: idempotente por cupo, con una oferta vigente no crea otra'
);
select pg_temp.como_admin();
select is((select count(*)::integer from public.ofertas where cupo_id = pg_temp.cupo_de('cita_objetivo')), 1, 'ofrecer: hay una sola oferta');
select ok(
  (select paciente_id = pg_temp.id('ana') and ronda = 1 and expira_en = now() + interval '15 minutes'
   from pg_temp.pendiente_de(pg_temp.cupo_de('cita_objetivo'))),
  'ofrecer: la ronda 1 es para Ana, con 15 minutos para responder'
);
select ok(
  (select estado = 'ofertando' and ronda_actual = 1 from public.cupos where id = pg_temp.cupo_de('cita_objetivo')),
  'ofrecer: el cupo pasa a ofertando'
);
select ok(
  exists (select 1 from public.notificaciones where usuario_id = pg_temp.id('ana') and tipo = 'oferta_nueva'
          and cuerpo like 'Se liberó un cupo de Prueba general el lun, % en Sede Prueba Uno. Tienes 15 minutos para responder.'),
  'ofrecer: Ana recibe el aviso de la oferta'
);
select ok(
  (select origen = 'sql' and total_candidatos = 4 and resultado = 'oferta_creada' and oferta_id is not null
   from public.priorizaciones where cupo_id = pg_temp.cupo_de('cita_objetivo')),
  'ofrecer: la decisión queda auditada'
);
select is(
  (select tipo from public.eventos_oferta where cupo_id = pg_temp.cupo_de('cita_objetivo')), 'creada',
  'ofrecer: el evento de creación queda en la línea de tiempo'
);

-- ═════════════ responder_oferta ═════════════

select pg_temp.como_admin();
create temp table oferta_ana as select id from pg_temp.pendiente_de(pg_temp.cupo_de('cita_objetivo'));
grant select on oferta_ana to authenticated;

select pg_temp.como('clara');
select throws_ok($$ select public.responder_oferta((select id from oferta_ana), 'aceptar') $$, 'PT404', 'no_encontrado', 'responder: la oferta de otro paciente no existe para mí');
select pg_temp.como('staff1');
select throws_ok($$ select public.responder_oferta((select id from oferta_ana), 'aceptar') $$, 'PT403', 'prohibido', 'responder: el staff no responde ofertas');
select pg_temp.como('ana');
select throws_ok($$ select public.responder_oferta((select id from oferta_ana), 'quizas') $$, 'PT422', 'validacion', 'responder: solo aceptar o rechazar');
select is(
  (select public.responder_oferta((select id from oferta_ana), 'rechazar') ->> 'requiere_priorizacion'), 'true',
  'responder: al rechazar, el cupo pasa al siguiente'
);
select throws_ok($$ select public.responder_oferta((select id from oferta_ana), 'aceptar') $$, 'PT409', 'oferta_ya_respondida', 'responder: dos veces no');

select pg_temp.como_admin();
select ok(
  (select estado = 'rechazada' and respondida_en = now() from public.ofertas where id = (select id from oferta_ana)),
  'responder: la oferta queda rechazada con su fecha'
);
select pg_temp.como_servidor();
select is(
  (select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo')) ->> 'ronda'), '2',
  'ofrecer: la ronda 2 va al siguiente candidato'
);
select pg_temp.como_admin();
select is(
  (select paciente_id from pg_temp.pendiente_de(pg_temp.cupo_de('cita_objetivo'))), pg_temp.id('clara'),
  'ofrecer: Ana no vuelve a recibir el mismo cupo; sigue Clara'
);

select pg_temp.como('clara');
select ok(
  (select public.responder_oferta(o.id, 'aceptar') ->> 'cita_id' is not null
   from public.ofertas o where o.estado = 'pendiente'),
  'responder: aceptar crea la cita'
);
select pg_temp.como_admin();
select ok(
  (select c.estado = 'confirmada' and c.origen = 'cupo_recuperado' and c.paciente_id = pg_temp.id('clara')
     and cu.estado = 'asignado' and cu.cita_asignada_id = c.id
   from public.cupos cu join public.citas c on c.cupo_origen_id = cu.id
   where cu.id = pg_temp.cupo_de('cita_objetivo')),
  'responder: cita confirmada de origen cupo_recuperado y cupo asignado'
);
select is(
  (select estado from public.solicitudes_espera where id = pg_temp.id('sol_clara')), 'atendida',
  'responder: la solicitud de la lista de espera queda atendida'
);
select ok(
  exists (select 1 from public.notificaciones where usuario_id = pg_temp.id('clara') and tipo = 'cita_confirmada'),
  'responder: el paciente recibe la confirmación'
);
select pg_temp.como_servidor();
select is(
  (select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo')) ->> 'resultado'), 'cupo_cerrado',
  'ofrecer: un cupo asignado no se vuelve a ofrecer'
);

-- ═════════════ Vencimientos: expirar_ofertas y avanzar_cupos ═════════════

select is(
  (select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_sede_dos')) ->> 'resultado'), 'oferta_creada',
  'expirar: el cupo de la Sede Dos tiene una oferta'
);
select pg_temp.como_admin();
create temp table vencida as select id, paciente_id from pg_temp.pendiente_de(pg_temp.cupo_de('cita_sede_dos'));
grant select on vencida to authenticated;
update public.ofertas set creada_en = now() - interval '16 minutes', expira_en = now() - interval '1 minute'
where id = (select id from vencida);

select pg_temp.como((select pg_temp.nombre_de(paciente_id) from vencida));
select throws_ok(
  $$ select public.responder_oferta((select id from vencida), 'aceptar') $$, 'PT409', 'oferta_expirada',
  'responder: el servidor decide por el reloj aunque el cron no haya pasado'
);

select pg_temp.como_servidor();
select ok(
  (select (public.expirar_ofertas() ->> 'ofertas_expiradas')::integer >= 1),
  'expirar: vence las ofertas sin respuesta'
);
select pg_temp.como_admin();
select is((select estado from public.ofertas where id = (select id from vencida)), 'expirada', 'expirar: la oferta queda expirada');
select ok(
  exists (select 1 from public.notificaciones n join vencida v on v.paciente_id = n.usuario_id where n.tipo = 'oferta_expirada'),
  'expirar: el paciente recibe el aviso de que expiró'
);
select ok(
  (select estado = 'ofertando' and pg_temp.pendiente_de(id) is null from public.cupos where id = pg_temp.cupo_de('cita_sede_dos')),
  'expirar: el cupo queda sin oferta vigente hasta el siguiente paso'
);
select pg_temp.como_servidor();
select ok(public.avanzar_cupos() >= 1, 'avanzar: ofrece el cupo al siguiente candidato');
select pg_temp.como_admin();
select ok(
  (select ronda = 2 and paciente_id <> (select paciente_id from vencida)
   from pg_temp.pendiente_de(pg_temp.cupo_de('cita_sede_dos'))),
  'avanzar: la ronda 2 es para otra persona'
);

-- Llega la hora: el cupo expira y su oferta se cancela.
update public.cupos set fecha_hora = now() + interval '20 minutes' where id = pg_temp.cupo_de('cita_sede_dos');
create temp table cancelada as select id, paciente_id from pg_temp.pendiente_de(pg_temp.cupo_de('cita_sede_dos'));
grant select on cancelada to authenticated;
select pg_temp.como_servidor();
select ok((select (public.expirar_ofertas() ->> 'cupos_expirados')::integer >= 1), 'expirar: cierra los cupos sin margen');
select pg_temp.como_admin();
select is((select estado from public.cupos where id = pg_temp.cupo_de('cita_sede_dos')), 'expirado', 'expirar: el cupo queda expirado');
select is((select estado from public.ofertas where id = (select id from cancelada)), 'cancelada', 'expirar: su oferta pendiente se cancela');
select pg_temp.como((select pg_temp.nombre_de(paciente_id) from cancelada));
select throws_ok(
  $$ select public.responder_oferta((select id from cancelada), 'aceptar') $$, 'PT409', 'cupo_no_disponible',
  'responder: una oferta cancelada responde cupo_no_disponible'
);

-- ═════════════ registrar_inasistencia ═════════════

select pg_temp.como('staff1');
select throws_ok($$ select public.registrar_inasistencia(pg_temp.id('cita_objetivo')) $$, 'PT409', 'cita_no_comenzo', 'inasistencia: no antes de que comience la cita');
select is(
  (select public.registrar_inasistencia(pg_temp.id('cita_comenzada')) ->> 'estado'), 'inasistencia',
  'inasistencia: el staff la registra cuando la cita ya comenzó'
);
select throws_ok($$ select public.registrar_inasistencia(pg_temp.id('cita_comenzada')) $$, 'PT409', 'transicion_invalida', 'inasistencia: solo una vez');
select pg_temp.como('staff2');
select throws_ok($$ select public.registrar_inasistencia(pg_temp.id('cita_comenzada')) $$, 'PT404', 'no_encontrado', 'inasistencia: solo en su consultorio');
select pg_temp.como('diego');
select throws_ok($$ select public.registrar_inasistencia(pg_temp.id('cita_comenzada')) $$, 'PT403', 'prohibido', 'inasistencia: solo el staff');

-- ═════════════ Lista de espera ═════════════
-- Un cupo de Prueba pediatría sin candidatos espera a que alguien se una a la lista.

select pg_temp.como_admin();
insert into public.profesionales (id, nombre, especialidad_id, consultorio_id)
values (pg_temp.id('prof_pediatria'), 'Dra. Pediatría Prueba', pg_temp.id('pediatria'), pg_temp.id('sede_uno'));
insert into public.citas (id, paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min)
values (pg_temp.id('cita_pediatria'), pg_temp.id('origen'), pg_temp.id('prof_pediatria'), pg_temp.id('pediatria'),
        pg_temp.id('sede_uno'), pg_temp.lunes('10:00'), 20);
select public.ofrecer_siguiente_candidato(private.cancelar_cita_interna(pg_temp.id('cita_pediatria'), 'paciente'));
select is((select estado from public.cupos where id = pg_temp.cupo_de('cita_pediatria')), 'disponible', 'lista: sin candidatos el cupo queda disponible');

select pg_temp.como('eva');
select is(
  (select public.unirse_lista_espera(pg_temp.id('pediatria')) ->> 'estado'), 'activa',
  'lista: el paciente se une a la lista de una especialidad'
);
select throws_ok($$ select public.unirse_lista_espera(pg_temp.id('pediatria')) $$, 'PT409', 'solicitud_duplicada', 'lista: no admite duplicados');
select throws_ok($$ select public.unirse_lista_espera(gen_random_uuid()) $$, 'PT404', 'no_encontrado', 'lista: la especialidad debe existir');
select pg_temp.como_admin();
select is(
  (select paciente_id from pg_temp.pendiente_de(pg_temp.cupo_de('cita_pediatria'))), pg_temp.id('eva'),
  'lista: al unirse, el cupo compatible se le ofrece de inmediato'
);

select pg_temp.como('eva');
select is(
  (select public.salir_lista_espera(s.id) -> 'cupos_por_priorizar' ->> 0 from public.solicitudes_espera s
   where s.especialidad_id = pg_temp.id('pediatria')),
  (select pg_temp.cupo_de('cita_pediatria')::text),
  'lista: al salir, su oferta pendiente se cancela y el cupo vuelve a priorizarse'
);
select throws_ok(
  $$ select public.salir_lista_espera((select id from public.solicitudes_espera where especialidad_id = pg_temp.id('pediatria'))) $$,
  'PT409', 'transicion_invalida', 'lista: no se sale dos veces'
);
select throws_ok($$ select public.salir_lista_espera(pg_temp.id('sol_ana')) $$, 'PT404', 'no_encontrado', 'lista: no se toca la solicitud de otro');

-- ═════════════ Preferencias ═════════════

select pg_temp.como('ana');
select is(
  public.guardar_preferencias(
    array[pg_temp.id('general')],
    '[{"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "12:00"}, {"dia_semana": 3, "hora_inicio": "14:00", "hora_fin": "18:00"}]',
    5, 4
  ) - 'actualizado_en',
  jsonb_build_object(
    'paciente_id', pg_temp.id('ana'),
    'especialidad_ids', jsonb_build_array(pg_temp.id('general')),
    'franjas', '[{"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "12:00"}, {"dia_semana": 3, "hora_inicio": "14:00", "hora_fin": "18:00"}]'::jsonb,
    'distancia_max_km', 5,
    'antelacion_min_horas', 4
  ),
  'preferencias: se guardan y se devuelven en una sola transacción'
);
select is(public.obtener_preferencias() ->> 'antelacion_min_horas', '4', 'preferencias: obtener devuelve lo guardado');
select throws_ok(
  $$ select public.guardar_preferencias('{}', '[{"dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "12:00"}, {"dia_semana": 1, "hora_inicio": "11:00", "hora_fin": "13:00"}]', null, 2) $$,
  'PT422', 'validacion', 'preferencias: rechaza franjas solapadas'
);
select throws_ok($$ select public.guardar_preferencias('{}', '[{"dia_semana": 1, "hora_inicio": "12:00", "hora_fin": "08:00"}]', null, 2) $$, 'PT422', 'validacion', 'preferencias: inicio antes del fin');
select throws_ok($$ select public.guardar_preferencias('{}', '[{"dia_semana": 1, "hora_inicio": "8:00", "hora_fin": "12:00"}]', null, 2) $$, 'PT422', 'validacion', 'preferencias: horas en formato HH:mm');
select throws_ok($$ select public.guardar_preferencias('{}', '[]', 7, 2) $$, 'PT422', 'validacion', 'preferencias: distancia entre las opciones');
select throws_ok($$ select public.guardar_preferencias('{}', '[]', null, 3) $$, 'PT422', 'validacion', 'preferencias: antelación entre las opciones');
select throws_ok($$ select public.guardar_preferencias(array[gen_random_uuid()], '[]', null, 2) $$, 'PT422', 'validacion', 'preferencias: especialidades conocidas');
select throws_ok(
  $$ select public.guardar_preferencias(array[pg_temp.id('general'), pg_temp.id('general')], '[]', null, 2) $$,
  'PT422', 'validacion', 'preferencias: sin especialidades repetidas'
);
select pg_temp.como('staff1');
select throws_ok($$ select public.guardar_preferencias('{}', '[]', null, 2) $$, 'PT403', 'prohibido', 'preferencias: solo pacientes');

select pg_temp.como_admin();
select * from finish();
rollback;
