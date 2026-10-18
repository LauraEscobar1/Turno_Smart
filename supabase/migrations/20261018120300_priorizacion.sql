-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 4/6 — Priorización determinista
-- ════════════════════════════════════════════════════════════════════════════
-- Reparto de responsabilidades:
--   · candidatos_cupo()      FILTROS obligatorios (reglas duras, en la base de datos).
--   · priorizacion.ts        PUNTAJE + explicación en la Edge Function priorizar-cupo.
--   · puntuar_candidatos()   la MISMA regla de puntaje en SQL: respaldo del cron y de
--                            cualquier propuesta inválida. Ambas se prueban con los
--                            mismos casos (pgTAP y deno test).
--   · registrar_priorizacion() auditoría: quién calculó qué ranking y con qué pesos.
-- El backend decide: ofrecer_siguiente_candidato() (5/6) vuelve a validar cada
-- candidato propuesto antes de crear la oferta.

create function private.version_regla()
returns text
language sql
immutable
set search_path = ''
as $$ select 'determinista-v1' $$;

-- Pesos: espera 40 %, horario 30 %, distancia 20 %, historial 10 %.
create function private.pesos_priorizacion()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{"tiempoEspera": 0.4, "compatibilidadHoraria": 0.3, "distancia": 0.2, "historialRespuesta": 0.1}'::jsonb;
$$;

-- ───────────── Filtros obligatorios ─────────────
-- Es candidato quien:
--   1. tiene una solicitud activa de la especialidad o la marcó como interés;
--   2. no canceló la cita original ni recibió antes una oferta de este cupo;
--   3. no tiene otra oferta pendiente (una a la vez);
--   4. no tiene otra cita activa que se cruce con el horario;
--   5. cumple su antelación mínima, su distancia máxima (si se conoce su zona)
--      y sus franjas horarias (si las definió; hora local del consultorio).
-- Devuelve solo los datos que necesita el puntaje: nunca nombre, contacto ni coordenadas.

create function private.candidatos_cupo(p_cupo_id uuid)
returns table (
  paciente_id uuid,
  solicitud_id uuid,
  espera_desde timestamptz,
  franja_dia smallint,
  franja_inicio time,
  franja_fin time,
  tiene_franjas boolean,
  distancia_km double precision,
  ofertas_respondidas integer,
  ofertas_aceptadas integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with cupo as (
    select
      c.id,
      c.especialidad_id,
      c.fecha_hora,
      c.duracion_min,
      co.lat,
      co.lng,
      ci.paciente_id as paciente_origen_id,
      (c.fecha_hora at time zone co.zona_horaria) as inicio_local
    from public.cupos c
    join public.consultorios co on co.id = c.consultorio_id
    join public.citas ci on ci.id = c.cita_origen_id
    where c.id = p_cupo_id
  ),
  base as (
    select
      p.id as paciente_id,
      s.id as solicitud_id,
      s.creada_en as espera_desde,
      pr.distancia_max_km,
      case
        when p.ubicacion_lat is not null
          then private.distancia_km(p.ubicacion_lat, p.ubicacion_lng, cupo.lat, cupo.lng)
      end as distancia_km,
      exists (select 1 from public.franjas_horarias fx where fx.paciente_id = p.id) as tiene_franjas
    from cupo
    join public.perfiles p on p.rol = 'paciente' and p.id <> cupo.paciente_origen_id
    left join public.solicitudes_espera s
      on s.paciente_id = p.id
      and s.especialidad_id = cupo.especialidad_id
      and s.estado = 'activa'
    left join public.preferencias_paciente pr on pr.paciente_id = p.id
    where
      (
        s.id is not null
        or exists (
          select 1 from public.preferencias_especialidades pe
          where pe.paciente_id = p.id and pe.especialidad_id = cupo.especialidad_id
        )
      )
      and not exists (
        select 1 from public.ofertas o
        where o.paciente_id = p.id and (o.cupo_id = cupo.id or o.estado = 'pendiente')
      )
      and not exists (
        select 1 from public.citas c2
        where c2.paciente_id = p.id
          and c2.estado in ('programada', 'confirmada')
          and c2.fecha_hora < cupo.fecha_hora + make_interval(mins => cupo.duracion_min)
          and cupo.fecha_hora < c2.fecha_hora + make_interval(mins => c2.duracion_min)
      )
      and (
        pr.paciente_id is null
        or cupo.fecha_hora - now() >= make_interval(hours => pr.antelacion_min_horas)
      )
  )
  select
    b.paciente_id,
    b.solicitud_id,
    b.espera_desde,
    f.dia_semana,
    f.hora_inicio,
    f.hora_fin,
    b.tiene_franjas,
    b.distancia_km,
    h.respondidas,
    h.aceptadas
  from base b
  cross join cupo
  left join lateral (
    select fh.dia_semana, fh.hora_inicio, fh.hora_fin
    from public.franjas_horarias fh
    where fh.paciente_id = b.paciente_id
      and fh.dia_semana = extract(dow from cupo.inicio_local)
      -- La cita completa (inicio y fin) cabe dentro de la franja: citaDentroDeFranja().
      and extract(hour from cupo.inicio_local) * 60 + extract(minute from cupo.inicio_local)
        >= extract(epoch from fh.hora_inicio) / 60
      and extract(hour from cupo.inicio_local) * 60 + extract(minute from cupo.inicio_local) + cupo.duracion_min
        <= extract(epoch from fh.hora_fin) / 60
    order by fh.hora_inicio
    limit 1
  ) f on true
  cross join lateral (
    select
      (count(*) filter (where o.estado in ('aceptada', 'rechazada', 'expirada')))::integer as respondidas,
      (count(*) filter (where o.estado = 'aceptada'))::integer as aceptadas
    from public.ofertas o
    where o.paciente_id = b.paciente_id
  ) h
  where
    (b.distancia_km is null or b.distancia_max_km is null or b.distancia_km <= b.distancia_max_km)
    and (not b.tiene_franjas or f.dia_semana is not null)
  order by b.paciente_id;
$$;
comment on function private.candidatos_cupo(uuid) is
  'Candidatos que cumplen TODOS los filtros obligatorios para el cupo, con los datos del puntaje.';

-- ───────────── Puntaje (regla SQL de respaldo) ─────────────
-- Igual que supabase/functions/_shared/priorizacion.ts:
--   espera     = días en la lista / 30 (tope 1); 0 si solo es interés
--   horario    = 1 dentro de una franja; 0,5 sin franjas
--   distancia  = 1 − km / 20 (mínimo 0); 0,5 si no se conoce la zona
--   historial  = aceptadas / respondidas; 0,5 sin historial
-- Cada valor se redondea a 3 decimales; puntaje = Σ valor × peso (3 decimales).
-- Orden: puntaje ↓, quien espera hace más tiempo, id (desempate total y estable).

create function private.puntuar_candidatos(p_cupo_id uuid)
returns table (posicion integer, paciente_id uuid, puntaje numeric, explicacion jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with contexto as (
    select e.nombre as especialidad, co.nombre as consultorio
    from public.cupos c
    join public.especialidades e on e.id = c.especialidad_id
    join public.consultorios co on co.id = c.consultorio_id
    where c.id = p_cupo_id
  ),
  pesos as (
    select
      (w ->> 'tiempoEspera')::numeric as espera,
      (w ->> 'compatibilidadHoraria')::numeric as horario,
      (w ->> 'distancia')::numeric as distancia,
      (w ->> 'historialRespuesta')::numeric as historial
    from (select private.pesos_priorizacion() as w) as t
  ),
  valores as (
    select
      c.*,
      greatest(extract(epoch from (now() - c.espera_desde)) / 86400, 0) as dias_espera,
      case
        when c.solicitud_id is null then 0::numeric
        else round(least(greatest(extract(epoch from (now() - c.espera_desde)) / 86400, 0) / 30, 1), 3)
      end as v_espera,
      case when c.franja_dia is not null then 1::numeric else 0.5 end as v_horario,
      case
        when c.distancia_km is null then 0.5
        else round(greatest(1 - c.distancia_km / 20, 0)::numeric, 3)
      end as v_distancia,
      case
        when c.ofertas_respondidas = 0 then 0.5
        else round(c.ofertas_aceptadas::numeric / c.ofertas_respondidas, 3)
      end as v_historial
    from private.candidatos_cupo(p_cupo_id) c
  ),
  puntuados as (
    select
      v.*,
      round(
        v.v_espera * w.espera + v.v_horario * w.horario + v.v_distancia * w.distancia + v.v_historial * w.historial,
        3
      ) as total
    from valores v
    cross join pesos w
  )
  select
    (row_number() over (order by p.total desc, p.espera_desde asc nulls last, p.paciente_id))::integer,
    p.paciente_id,
    p.total,
    jsonb_build_object(
      'puntaje', p.total,
      'fuente', 'regla_backend',
      'factores', jsonb_build_object(
        'tiempoEspera', jsonb_build_object(
          'valor', p.v_espera,
          'peso', w.espera,
          'detalle', case
            when p.solicitud_id is null then format(
              'No estás en la lista de espera de %s, pero la marcaste como especialidad de interés.',
              ctx.especialidad
            )
            else format(
              'Llevas %s %s en la lista de espera de %s.',
              floor(p.dias_espera)::integer,
              case when floor(p.dias_espera) = 1 then 'día' else 'días' end,
              ctx.especialidad
            )
          end
        ),
        'compatibilidadHoraria', jsonb_build_object(
          'valor', p.v_horario,
          'peso', w.horario,
          'detalle', case
            when p.franja_dia is not null then format(
              'El cupo está dentro de tu franja del %s de %s a %s.',
              private.nombre_dia(p.franja_dia),
              left(p.franja_inicio::text, 5),
              left(p.franja_fin::text, 5)
            )
            else 'No indicaste franjas horarias, así que tomamos cualquier horario como posible.'
          end
        ),
        'distancia', jsonb_build_object(
          'valor', p.v_distancia,
          'peso', w.distancia,
          'detalle', case
            when p.distancia_km is null then 'No conocemos tu zona, así que la distancia no influyó.'
            else format(
              '%s está a unos %s de tu zona.', ctx.consultorio, private.formatear_distancia(p.distancia_km)
            )
          end
        ),
        'historialRespuesta', jsonb_build_object(
          'valor', p.v_historial,
          'peso', w.historial,
          'detalle', case
            when p.ofertas_respondidas = 0 then 'Es tu primera oferta: aún no hay historial.'
            else format(
              'Aceptaste %s de tus %s ofertas anteriores.', p.ofertas_aceptadas, p.ofertas_respondidas
            )
          end
        )
      )
    )
  from puntuados p
  cross join contexto ctx
  cross join pesos w
  order by 1;
$$;
comment on function private.puntuar_candidatos(uuid) is
  'Regla de puntaje en SQL (respaldo). Debe coincidir con supabase/functions/_shared/priorizacion.ts.';

-- ───────────── Auditoría ─────────────
-- p_candidatos: arreglo ordenado [{ "pacienteId": uuid, "explicacion": ExplicacionPrioridad }].

create function private.registrar_priorizacion(
  p_cupo_id uuid,
  p_origen text,
  p_candidatos jsonb,
  p_fuente text default 'regla_backend'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_id uuid;
begin
  select * into v_cupo from public.cupos where id = p_cupo_id;
  if not found then
    perform private.fallar('no_encontrado', 'El cupo no existe');
  end if;
  if p_candidatos is null or jsonb_typeof(p_candidatos) <> 'array' or jsonb_array_length(p_candidatos) > 500 then
    perform private.fallar('validacion', 'p_candidatos debe ser un arreglo de hasta 500 candidatos');
  end if;

  begin
    insert into public.priorizaciones (
      cupo_id, consultorio_id, ronda, origen, fuente, version_regla, pesos, total_candidatos
    )
    values (
      v_cupo.id, v_cupo.consultorio_id, v_cupo.ronda_actual + 1, p_origen, p_fuente,
      private.version_regla(), private.pesos_priorizacion(), jsonb_array_length(p_candidatos)
    )
    returning id into v_id;

    insert into public.priorizacion_candidatos (priorizacion_id, posicion, paciente_id, puntaje, explicacion)
    select
      v_id,
      x.posicion::integer,
      (x.candidato ->> 'pacienteId')::uuid,
      (x.candidato -> 'explicacion' ->> 'puntaje')::numeric,
      x.candidato -> 'explicacion'
    from jsonb_array_elements(p_candidatos) with ordinality as x (candidato, posicion);
  exception
    when invalid_text_representation or not_null_violation or check_violation
      or foreign_key_violation or unique_violation or numeric_value_out_of_range then
      perform private.fallar('validacion', sqlerrm);
  end;
  return v_id;
end;
$$;

-- ───────────── API para la Edge Function (solo service_role) ─────────────

create function public.candidatos_cupo(p_cupo_id uuid)
returns table (
  paciente_id uuid,
  solicitud_id uuid,
  espera_desde timestamptz,
  franja_dia smallint,
  franja_inicio time,
  franja_fin time,
  tiene_franjas boolean,
  distancia_km double precision,
  ofertas_respondidas integer,
  ofertas_aceptadas integer
)
language sql
stable
set search_path = ''
as $$ select * from private.candidatos_cupo(p_cupo_id) $$;
comment on function public.candidatos_cupo(uuid) is 'Solo service_role. Filtros obligatorios para priorizar-cupo.';

create function public.registrar_priorizacion(
  p_cupo_id uuid,
  p_candidatos jsonb,
  p_fuente text default 'regla_backend'
)
returns uuid
language sql
set search_path = ''
as $$ select private.registrar_priorizacion(p_cupo_id, 'edge_function', p_candidatos, p_fuente) $$;
comment on function public.registrar_priorizacion(uuid, jsonb, text) is
  'Solo service_role. Guarda el ranking propuesto por la Edge Function; devuelve el id de la priorización.';

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
grant execute on function private.consultorio_del_staff() to authenticated;
grant execute on function private.explicacion_valida(jsonb) to authenticated;
