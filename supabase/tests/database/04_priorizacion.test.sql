-- Priorización determinista: filtros obligatorios, puntaje SQL (mismos casos que
-- supabase/functions/_shared/priorizacion.test.ts) y propuestas de la Edge Function.
begin;
\ir ../utilidades/escenario.psql

select plan(30);

select private.cancelar_cita_interna(pg_temp.id('cita_objetivo'), 'paciente');

create function pg_temp.factor(p_paciente text, p_factor text) returns jsonb language sql stable as $$
  select explicacion -> 'factores' -> p_factor
  from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo'))
  where paciente_id = pg_temp.id(p_paciente)
$$;

create function pg_temp.candidatos() returns setof uuid language sql stable as $$
  select paciente_id from private.candidatos_cupo(pg_temp.cupo_de('cita_objetivo'))
$$;

-- ═════════════ Filtros obligatorios ═════════════

select set_eq(
  $$ select * from pg_temp.candidatos() $$,
  $$ select pg_temp.id(n) from unnest(array['ana', 'bruno', 'clara', 'diego']) as n $$,
  'filtros: candidatos válidos del cupo objetivo'
);
select ok(pg_temp.id('origen') not in (select * from pg_temp.candidatos()), 'filtros: quien canceló la cita no es candidato');
select ok(pg_temp.id('eva') not in (select * from pg_temp.candidatos()), 'filtros: sin otra cita activa que se cruce');
select ok(pg_temp.id('hugo') not in (select * from pg_temp.candidatos()), 'filtros: respeta la distancia máxima');
select ok(pg_temp.id('ivan') not in (select * from pg_temp.candidatos()), 'filtros: respeta las franjas (hora local del consultorio)');
select ok(pg_temp.id('staff1') not in (select * from pg_temp.candidatos()), 'filtros: el staff nunca es candidato');
select ok(
  (select tiene_franjas and franja_dia = 1 and franja_inicio = '08:00' and franja_fin = '12:00'
   from private.candidatos_cupo(pg_temp.cupo_de('cita_objetivo')) where paciente_id = pg_temp.id('ana')),
  'filtros: informa la franja que contiene el cupo'
);

savepoint antelacion;
update public.cupos set fecha_hora = now() + interval '3 hours' where id = pg_temp.cupo_de('cita_objetivo');
update public.preferencias_paciente set antelacion_min_horas = 4 where paciente_id = pg_temp.id('diego');
select ok(
  pg_temp.id('diego') not in (select * from pg_temp.candidatos())
  and pg_temp.id('bruno') in (select * from pg_temp.candidatos()),
  'filtros: respeta la antelación mínima'
);
rollback to savepoint antelacion;

savepoint pendiente;
insert into public.ofertas (cupo_id, consultorio_id, paciente_id, ronda, expira_en, explicacion)
select pg_temp.id('cupo_h1'), pg_temp.id('sede_dos'), pg_temp.id('diego'), 3, now() + interval '10 minutes', explicacion
from public.ofertas where cupo_id = pg_temp.id('cupo_h1') limit 1;
select ok(pg_temp.id('diego') not in (select * from pg_temp.candidatos()), 'filtros: una oferta pendiente a la vez');
rollback to savepoint pendiente;

-- ═════════════ Puntaje (regla SQL de respaldo) ═════════════

select results_eq(
  $$ select posicion, paciente_id, puntaje from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo')) $$,
  $$ values (1, pg_temp.id('ana'), 0.923::numeric), (2, pg_temp.id('clara'), 0.650), (3, pg_temp.id('diego'), 0.413), (4, pg_temp.id('bruno'), 0.300) $$,
  'puntaje: orden y valores esperados (espera 40 %, horario 30 %, distancia 20 %, historial 10 %)'
);
select is(
  pg_temp.factor('ana', 'tiempoEspera'),
  '{"valor": 0.933, "peso": 0.4, "detalle": "Llevas 28 días en la lista de espera de Prueba general."}',
  'ana: 28 días de espera'
);
select is(
  pg_temp.factor('ana', 'compatibilidadHoraria'),
  '{"valor": 1, "peso": 0.3, "detalle": "El cupo está dentro de tu franja del lunes de 08:00 a 12:00."}',
  'ana: dentro de su franja'
);
select is(
  pg_temp.factor('ana', 'distancia'),
  '{"valor": 1.000, "peso": 0.2, "detalle": "Sede Prueba Uno está a unos 0 km de tu zona."}',
  'ana: a 0 km'
);
select is(
  pg_temp.factor('ana', 'historialRespuesta'),
  '{"valor": 0.500, "peso": 0.1, "detalle": "Aceptaste 1 de tus 2 ofertas anteriores."}',
  'ana: aceptó 1 de 2'
);
select is(
  (pg_temp.factor('clara', 'tiempoEspera') ->> 'valor')::numeric, 1::numeric,
  'clara: la espera topa en 30 días'
);
select is(
  pg_temp.factor('clara', 'distancia'),
  '{"valor": 0.500, "peso": 0.2, "detalle": "Sede Prueba Uno está a unos 10 km de tu zona."}',
  'clara: a unos 10 km'
);
select is((pg_temp.factor('clara', 'historialRespuesta') ->> 'valor')::numeric, 0::numeric, 'clara: no aceptó ninguna');
select is(
  pg_temp.factor('diego', 'tiempoEspera') ->> 'detalle', 'Llevas 1 día en la lista de espera de Prueba general.',
  'diego: singular para un día'
);
select is(
  pg_temp.factor('bruno', 'tiempoEspera'),
  '{"valor": 0, "peso": 0.4, "detalle": "No estás en la lista de espera de Prueba general, pero la marcaste como especialidad de interés."}',
  'bruno: solo interés'
);
select is(
  pg_temp.factor('bruno', 'distancia') ->> 'detalle', 'No conocemos tu zona, así que la distancia no influyó.',
  'bruno: sin zona'
);
select is(
  pg_temp.factor('bruno', 'historialRespuesta') ->> 'detalle', 'Es tu primera oferta: aún no hay historial.',
  'bruno: sin historial'
);
select ok(
  (select bool_and(private.explicacion_valida(explicacion) and explicacion ->> 'fuente' = 'regla_backend')
   from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo'))),
  'puntaje: cada explicación es una ExplicacionPrioridad válida de fuente regla_backend'
);

-- ═════════════ Propuestas de la Edge Function: el backend decide ═════════════

create function pg_temp.propuesta(variadic p_nombres text[]) returns jsonb language sql stable as $$
  select jsonb_agg(jsonb_build_object('pacienteId', pg_temp.id(n), 'explicacion', p.explicacion) order by o)
  from unnest(p_nombres) with ordinality as x (n, o)
  join lateral (
    select coalesce(
      (select r.explicacion from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo')) r where r.paciente_id = pg_temp.id(n)),
      (select r.explicacion from private.puntuar_candidatos(pg_temp.cupo_de('cita_objetivo')) r limit 1)
    ) as explicacion
  ) p on true
$$;

select pg_temp.como_servidor();

savepoint propuesta_valida;
select is(
  public.ofrecer_siguiente_candidato(
    pg_temp.cupo_de('cita_objetivo'),
    public.registrar_priorizacion(pg_temp.cupo_de('cita_objetivo'), pg_temp.propuesta('bruno', 'ana'))
  ) ->> 'resultado',
  'oferta_creada',
  'propuesta: se acepta un orden distinto si sus candidatos son válidos'
);
select ok(
  (select o.paciente_id = pg_temp.id('bruno') and pz.origen = 'edge_function' and pz.resultado = 'oferta_creada'
   from public.ofertas o join public.priorizaciones pz on pz.oferta_id = o.id
   where o.cupo_id = pg_temp.cupo_de('cita_objetivo')),
  'propuesta: la oferta sale de la priorización registrada por la Edge Function'
);
rollback to savepoint propuesta_valida;

savepoint propuesta_con_invalido;
select public.ofrecer_siguiente_candidato(
  pg_temp.cupo_de('cita_objetivo'),
  public.registrar_priorizacion(pg_temp.cupo_de('cita_objetivo'), pg_temp.propuesta('eva', 'diego'))
);
select ok(
  (select bool_and(case pc.paciente_id
                     when pg_temp.id('eva') then pc.descarte = 'ya_no_es_candidato' and not pc.elegido
                     when pg_temp.id('diego') then pc.elegido end)
   from public.priorizacion_candidatos pc join public.priorizaciones pz on pz.id = pc.priorizacion_id
   where pz.cupo_id = pg_temp.cupo_de('cita_objetivo')),
  'propuesta: un candidato que no pasa los filtros se descarta y se elige al siguiente'
);
rollback to savepoint propuesta_con_invalido;

savepoint propuesta_obsoleta;
create temp table obsoleta as
  select public.registrar_priorizacion(pg_temp.cupo_de('cita_objetivo'), pg_temp.propuesta('diego')) as id;
select public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo'));
update public.ofertas set estado = 'rechazada', respondida_en = now()
where cupo_id = pg_temp.cupo_de('cita_objetivo') and estado = 'pendiente';
select is(
  public.ofrecer_siguiente_candidato(pg_temp.cupo_de('cita_objetivo'), (select id from obsoleta)) ->> 'ronda',
  '2',
  'propuesta: si la ronda cambió, se usa la regla SQL de respaldo'
);
select is(
  (select resultado from public.priorizaciones where id = (select id from obsoleta)), 'propuesta_invalida',
  'propuesta: la obsoleta queda auditada como inválida'
);
select throws_ok(
  format($$ select public.ofrecer_siguiente_candidato(%L, %L) $$, pg_temp.cupo_de('cita_objetivo'), (select id from obsoleta)),
  'PT409', 'transicion_invalida', 'propuesta: una priorización resuelta no se reutiliza'
);
rollback to savepoint propuesta_obsoleta;

select throws_ok(
  format($$ select public.registrar_priorizacion(%L, '[{"pacienteId": "%s", "explicacion": {"puntaje": 3}}]') $$,
         pg_temp.cupo_de('cita_objetivo'), pg_temp.id('ana')),
  'PT422', 'validacion', 'propuesta: una explicación con otra forma se rechaza'
);
select throws_ok(
  format($$ select public.registrar_priorizacion(%L, '{}') $$, pg_temp.cupo_de('cita_objetivo')),
  'PT422', 'validacion', 'propuesta: debe ser un arreglo'
);

select pg_temp.como_admin();
select * from finish();
rollback;
