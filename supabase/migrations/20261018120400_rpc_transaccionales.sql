-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 5/6 — RPC transaccionales
-- ════════════════════════════════════════════════════════════════════════════
-- Todas: SECURITY DEFINER, search_path vacío y nombres calificados.
-- Concurrencia:
--   · Orden de bloqueo único: cupo → sus ofertas (FOR UPDATE). Evita interbloqueos.
--   · Índices únicos parciales: una oferta pendiente por cupo y una por paciente;
--     una cita por cupo recuperado. Son la última barrera ante carreras.
--   · Idempotencia por cupo: ofrecer_siguiente_candidato() no crea una segunda oferta
--     si ya hay una vigente; cancelar_cita() nunca libera dos cupos para la misma cita.
-- Errores: message = código de src/services/errores.ts (ver private.fallar()).

-- ═════════════ Utilidades internas ═════════════

create function private.actor()
returns public.perfiles
language sql
stable
security definer
set search_path = ''
as $$ select p.* from public.perfiles p where p.id = (select auth.uid()) $$;

create function private.notificar(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_cuerpo text,
  p_oferta_id uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, oferta_id)
  values (p_usuario_id, p_tipo, p_titulo, p_cuerpo, p_oferta_id);
$$;

create function private.notificar_oferta_nueva(p_oferta_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_minutos integer;
begin
  select o.paciente_id, o.expira_en, c.fecha_hora, e.nombre as especialidad,
         co.nombre as consultorio, co.zona_horaria
  into v
  from public.ofertas o
  join public.cupos c on c.id = o.cupo_id
  join public.especialidades e on e.id = c.especialidad_id
  join public.consultorios co on co.id = c.consultorio_id
  where o.id = p_oferta_id;

  v_minutos := greatest(round(extract(epoch from (v.expira_en - now())) / 60), 1);
  perform private.notificar(
    v.paciente_id,
    'oferta_nueva',
    'Nuevo cupo disponible',
    format(
      'Se liberó un cupo de %s el %s en %s. Tienes %s %s para responder.',
      v.especialidad,
      private.formatear_fecha_hora(v.fecha_hora, v.zona_horaria),
      v.consultorio,
      v_minutos,
      case when v_minutos = 1 then 'minuto' else 'minutos' end
    ),
    p_oferta_id
  );
end;
$$;

-- Llegó la hora del cupo sin asignarse: se cancelan sus ofertas y expira.
-- Quien llama ya tiene el cupo bloqueado.
create function private.cerrar_cupo(p_cupo_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ofertas set estado = 'cancelada' where cupo_id = p_cupo_id and estado = 'pendiente';
  update public.cupos set estado = 'expirado' where id = p_cupo_id;
$$;

create function private.resolver_priorizacion(p_priorizacion_id uuid, p_resultado text, p_oferta_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.priorizaciones
  set resultado = p_resultado, oferta_id = p_oferta_id, resuelta_en = now()
  where id = p_priorizacion_id and resultado is null;
$$;

create function private.resultado_oferta(
  p_resultado text,
  p_cupo_id uuid,
  p_oferta_id uuid,
  p_priorizacion_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'resultado', p_resultado,
    'cupo_id', c.id,
    'estado_cupo', c.estado,
    'ronda', c.ronda_actual,
    'oferta_id', p_oferta_id,
    'priorizacion_id', p_priorizacion_id
  )
  from public.cupos c
  where c.id = p_cupo_id;
$$;

-- Recorre el ranking de una priorización y crea la oferta para el PRIMER candidato
-- que siga siendo válido ahora (la propuesta pudo quedar vieja). Devuelve su id o null.
-- Quien llama ya tiene el cupo bloqueado.
create function private.intentar_ofertar(p_cupo_id uuid, p_priorizacion_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_validos uuid[];
  v_candidato record;
  v_oferta_id uuid;
begin
  select * into strict v_cupo from public.cupos where id = p_cupo_id;
  v_validos := array(select c.paciente_id from private.candidatos_cupo(p_cupo_id) c);

  for v_candidato in
    select pc.posicion, pc.paciente_id, pc.explicacion
    from public.priorizacion_candidatos pc
    where pc.priorizacion_id = p_priorizacion_id
    order by pc.posicion
  loop
    if not (v_candidato.paciente_id = any (v_validos)) then
      update public.priorizacion_candidatos set descarte = 'ya_no_es_candidato'
      where priorizacion_id = p_priorizacion_id and posicion = v_candidato.posicion;
      continue;
    end if;

    begin
      insert into public.ofertas (cupo_id, consultorio_id, paciente_id, ronda, expira_en, explicacion)
      values (
        v_cupo.id,
        v_cupo.consultorio_id,
        v_candidato.paciente_id,
        v_cupo.ronda_actual + 1,
        least(now() + private.duracion_oferta(), v_cupo.fecha_hora - private.margen_cierre_cupo()),
        v_candidato.explicacion
      )
      returning id into v_oferta_id;
    exception when unique_violation then
      -- Otra transacción acaba de ofrecerle otro cupo: una oferta pendiente a la vez.
      update public.priorizacion_candidatos set descarte = 'oferta_pendiente_en_otro_cupo'
      where priorizacion_id = p_priorizacion_id and posicion = v_candidato.posicion;
      continue;
    end;

    update public.priorizacion_candidatos set elegido = true
    where priorizacion_id = p_priorizacion_id and posicion = v_candidato.posicion;
    update public.cupos set estado = 'ofertando', ronda_actual = ronda_actual + 1 where id = v_cupo.id;
    perform private.resolver_priorizacion(p_priorizacion_id, 'oferta_creada', v_oferta_id);
    perform private.notificar_oferta_nueva(v_oferta_id);
    return v_oferta_id;
  end loop;

  return null;
end;
$$;

-- ═════════════ Motor de ofertas (service_role y cron) ═════════════

-- Ofrece el cupo al siguiente candidato.
--   · Con p_priorizacion_id: usa el ranking que registró la Edge Function (o la IA en
--     la Fase 5) y valida cada candidato. Si ninguno sirve, usa la regla SQL.
--   · Sin él: calcula el ranking con la regla SQL (cron, respaldo).
-- Idempotente por cupo: con una oferta vigente responde `ya_ofertado` sin cambiar nada.
create function public.ofrecer_siguiente_candidato(p_cupo_id uuid, p_priorizacion_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo public.cupos;
  v_prio public.priorizaciones;
  v_oferta_id uuid;
  v_ranking jsonb;
  v_prio_sql uuid;
begin
  select * into v_cupo from public.cupos where id = p_cupo_id for update;
  if not found then
    perform private.fallar('no_encontrado', 'El cupo no existe');
  end if;

  if p_priorizacion_id is not null then
    select * into v_prio from public.priorizaciones
    where id = p_priorizacion_id and cupo_id = p_cupo_id
    for update;
    if not found then
      perform private.fallar('no_encontrado', 'La priorización no corresponde a este cupo');
    end if;
    if v_prio.resultado is not null then
      perform private.fallar('transicion_invalida', 'La priorización ya se resolvió');
    end if;
  end if;

  if v_cupo.estado in ('asignado', 'expirado') then
    perform private.resolver_priorizacion(p_priorizacion_id, 'cupo_cerrado');
    return private.resultado_oferta('cupo_cerrado', p_cupo_id, null, p_priorizacion_id);
  end if;

  select o.id into v_oferta_id from public.ofertas o where o.cupo_id = p_cupo_id and o.estado = 'pendiente';
  if v_oferta_id is not null then
    perform private.resolver_priorizacion(p_priorizacion_id, 'ya_ofertado');
    return private.resultado_oferta('ya_ofertado', p_cupo_id, v_oferta_id, p_priorizacion_id);
  end if;

  if v_cupo.fecha_hora - private.margen_cierre_cupo() <= now() then
    perform private.cerrar_cupo(p_cupo_id);
    perform private.resolver_priorizacion(p_priorizacion_id, 'cupo_cerrado');
    return private.resultado_oferta('cupo_cerrado', p_cupo_id, null, p_priorizacion_id);
  end if;

  -- 1. Propuesta recibida: el backend decide (la ronda debe seguir siendo la misma).
  if p_priorizacion_id is not null then
    if v_prio.ronda = v_cupo.ronda_actual + 1 then
      v_oferta_id := private.intentar_ofertar(p_cupo_id, p_priorizacion_id);
    end if;
    if v_oferta_id is null then
      perform private.resolver_priorizacion(
        p_priorizacion_id,
        case when v_prio.total_candidatos = 0 then 'sin_candidatos' else 'propuesta_invalida' end
      );
    end if;
  end if;

  -- 2. Regla SQL de respaldo.
  if v_oferta_id is null then
    select coalesce(
      jsonb_agg(jsonb_build_object('pacienteId', r.paciente_id, 'explicacion', r.explicacion) order by r.posicion),
      '[]'::jsonb
    )
    into v_ranking
    from private.puntuar_candidatos(p_cupo_id) r;

    -- Sin candidatos no se audita: el cron lo intenta cada minuto y llenaría la tabla.
    if jsonb_array_length(v_ranking) > 0 then
      v_prio_sql := private.registrar_priorizacion(p_cupo_id, 'sql', v_ranking);
      v_oferta_id := private.intentar_ofertar(p_cupo_id, v_prio_sql);
      if v_oferta_id is null then
        perform private.resolver_priorizacion(v_prio_sql, 'sin_candidatos');
      end if;
    end if;
  end if;

  if v_oferta_id is null then
    -- Se agotaron los candidatos: el cupo espera a que alguien sea compatible.
    update public.cupos set estado = 'disponible' where id = p_cupo_id and estado = 'ofertando';
    return private.resultado_oferta('sin_candidatos', p_cupo_id, null, coalesce(v_prio_sql, p_priorizacion_id));
  end if;
  return private.resultado_oferta('oferta_creada', p_cupo_id, v_oferta_id, coalesce(v_prio_sql, p_priorizacion_id));
end;
$$;

-- "Cron" 1/2: cierra los cupos a los que ya no llega nadie y vence las ofertas sin
-- respuesta. Los cupos que quedan sin oferta los retoma avanzar_cupos().
create function public.expirar_ofertas()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo record;
  v_oferta record;
  v_cupos_expirados integer := 0;
  v_ofertas_expiradas integer := 0;
begin
  -- SKIP LOCKED: si otra transacción está trabajando un cupo, se retoma en el siguiente minuto.
  for v_cupo in
    select c.id from public.cupos c
    where c.estado in ('disponible', 'ofertando')
      and c.fecha_hora - private.margen_cierre_cupo() <= now()
    order by c.id
    for update skip locked
  loop
    perform private.cerrar_cupo(v_cupo.id);
    v_cupos_expirados := v_cupos_expirados + 1;
  end loop;

  for v_cupo in
    select c.id, e.nombre as especialidad
    from public.cupos c
    join public.especialidades e on e.id = c.especialidad_id
    where c.estado = 'ofertando'
      and exists (
        select 1 from public.ofertas o
        where o.cupo_id = c.id and o.estado = 'pendiente' and o.expira_en <= now()
      )
    order by c.id
    for update of c skip locked
  loop
    for v_oferta in
      update public.ofertas set estado = 'expirada'
      where cupo_id = v_cupo.id and estado = 'pendiente' and expira_en <= now()
      returning id, paciente_id
    loop
      perform private.notificar(
        v_oferta.paciente_id,
        'oferta_expirada',
        'Una oferta expiró',
        format('No alcanzaste a responder el cupo de %s. Te avisaremos del próximo.', v_cupo.especialidad),
        v_oferta.id
      );
      v_ofertas_expiradas := v_ofertas_expiradas + 1;
    end loop;
  end loop;

  return jsonb_build_object('cupos_expirados', v_cupos_expirados, 'ofertas_expiradas', v_ofertas_expiradas);
end;
$$;

-- "Cron" 2/2: ofrece cada cupo abierto sin oferta vigente al siguiente candidato
-- (regla SQL). Los más próximos primero. Devuelve cuántas ofertas creó.
create function public.avanzar_cupos(p_especialidad_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cupo record;
  v_creadas integer := 0;
begin
  for v_cupo in
    select c.id from public.cupos c
    where c.estado in ('disponible', 'ofertando')
      and (p_especialidad_id is null or c.especialidad_id = p_especialidad_id)
      and not exists (select 1 from public.ofertas o where o.cupo_id = c.id and o.estado = 'pendiente')
    order by c.fecha_hora, c.id
    for update skip locked
  loop
    if public.ofrecer_siguiente_candidato(v_cupo.id) ->> 'resultado' = 'oferta_creada' then
      v_creadas := v_creadas + 1;
    end if;
  end loop;
  return v_creadas;
end;
$$;

-- ═════════════ Citas ═════════════

-- Cancela la cita y libera su cupo (idempotente). Devuelve el cupo o null.
create function private.cancelar_cita_interna(p_cita_id uuid, p_por text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cita public.citas;
  v_contexto record;
  v_cupo_id uuid;
begin
  select * into v_cita from public.citas where id = p_cita_id for update;
  if not found then
    perform private.fallar('no_encontrado', 'La cita no existe');
  end if;
  if not private.puede_transicionar('cita', v_cita.estado, 'cancelada') then
    perform private.fallar('transicion_invalida', format('La cita ya está %s', v_cita.estado));
  end if;
  if v_cita.fecha_hora <= now() then
    perform private.fallar('cita_ya_comenzo');
  end if;

  update public.citas set estado = 'cancelada', cancelada_en = now() where id = p_cita_id;

  if p_por = 'staff' then
    select e.nombre as especialidad, co.zona_horaria into v_contexto
    from public.especialidades e, public.consultorios co
    where e.id = v_cita.especialidad_id and co.id = v_cita.consultorio_id;
    perform private.notificar(
      v_cita.paciente_id,
      'cita_cancelada',
      'Tu cita fue cancelada',
      format(
        'El consultorio canceló tu cita de %s (%s). Si aún la necesitas, únete a la lista de espera.',
        v_contexto.especialidad,
        private.formatear_fecha_hora(v_cita.fecha_hora, v_contexto.zona_horaria)
      )
    );
  end if;

  -- Sin margen suficiente nadie alcanzaría a llegar: no se libera un cupo ofertable.
  if v_cita.fecha_hora - private.margen_cierre_cupo() <= now() then
    return null;
  end if;

  insert into public.cupos (
    cita_origen_id, consultorio_id, profesional_id, especialidad_id, fecha_hora, duracion_min, cancelada_por
  )
  values (
    v_cita.id, v_cita.consultorio_id, v_cita.profesional_id, v_cita.especialidad_id,
    v_cita.fecha_hora, v_cita.duracion_min, p_por
  )
  on conflict (cita_origen_id) do nothing
  returning id into v_cupo_id;

  if v_cupo_id is null then
    select id into v_cupo_id from public.cupos where cita_origen_id = p_cita_id;
  end if;
  return v_cupo_id;
end;
$$;

-- Paciente (sus citas) o staff (las de su consultorio). Lo ajeno: no_encontrado.
-- La priorización NO ocurre aquí: la app invoca la Edge Function priorizar-cupo con
-- `cupo_id`; si no lo hace, el cron lo ofrece en menos de un minuto.
create function public.cancelar_cita(p_cita_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_cupo_id uuid;
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  perform 1 from public.citas c
  where c.id = p_cita_id
    and (
      (v_actor.rol = 'paciente' and c.paciente_id = v_actor.id)
      or (v_actor.rol = 'staff' and c.consultorio_id = v_actor.consultorio_id)
    );
  if not found then
    perform private.fallar('no_encontrado', 'La cita no existe');
  end if;

  v_cupo_id := private.cancelar_cita_interna(p_cita_id, v_actor.rol);
  return jsonb_build_object(
    'cita', (select to_jsonb(c) from public.citas c where c.id = p_cita_id),
    'cupo_id', v_cupo_id,
    'requiere_priorizacion', v_cupo_id is not null
  );
end;
$$;

-- Solo staff: la cita ya comenzó y el paciente no llegó.
create function public.registrar_inasistencia(p_cita_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_cita public.citas;
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'staff' then
    perform private.fallar('prohibido');
  end if;

  select * into v_cita from public.citas
  where id = p_cita_id and consultorio_id = v_actor.consultorio_id
  for update;
  if not found then
    perform private.fallar('no_encontrado', 'La cita no existe');
  end if;
  if v_cita.fecha_hora > now() then
    perform private.fallar('cita_no_comenzo');
  end if;
  if not private.puede_transicionar('cita', v_cita.estado, 'inasistencia') then
    perform private.fallar('transicion_invalida', format('La cita ya está %s', v_cita.estado));
  end if;

  update public.citas set estado = 'inasistencia' where id = p_cita_id returning * into v_cita;
  return to_jsonb(v_cita);
end;
$$;

-- ═════════════ Ofertas ═════════════

-- Operación crítica: la decisión final es del servidor.
-- Aceptar: cita confirmada (origen cupo_recuperado), cupo asignado, solicitud atendida.
-- Rechazar: el cupo queda sin oferta vigente; la app invoca priorizar-cupo (o lo hace el cron).
create function public.responder_oferta(p_oferta_id uuid, p_respuesta text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_cupo_id uuid;
  v_cupo public.cupos;
  v_oferta public.ofertas;
  v_cita_id uuid;
  v_contexto record;
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'paciente' then
    perform private.fallar('prohibido');
  end if;
  if p_respuesta is null or p_respuesta not in ('aceptar', 'rechazar') then
    perform private.fallar('validacion', 'La respuesta debe ser aceptar o rechazar');
  end if;

  select o.cupo_id into v_cupo_id from public.ofertas o
  where o.id = p_oferta_id and o.paciente_id = v_actor.id;
  if not found then
    perform private.fallar('no_encontrado', 'La oferta no existe');
  end if;

  -- Orden de bloqueo: cupo → oferta. Una segunda respuesta simultánea espera aquí
  -- y, al continuar, ve la oferta ya respondida.
  select * into v_cupo from public.cupos where id = v_cupo_id for update;
  select * into v_oferta from public.ofertas where id = p_oferta_id for update;

  if v_oferta.estado = 'expirada' then
    perform private.fallar('oferta_expirada');
  elsif v_oferta.estado = 'cancelada' then
    perform private.fallar('cupo_no_disponible');
  elsif v_oferta.estado <> 'pendiente' then
    perform private.fallar('oferta_ya_respondida');
  end if;
  -- Venció pero el cron aún no la cerró: el servidor decide por el reloj, no por la fila.
  if v_oferta.expira_en <= now() then
    perform private.fallar('oferta_expirada');
  end if;
  if v_cupo.estado <> 'ofertando' then
    perform private.fallar('cupo_no_disponible');
  end if;

  if p_respuesta = 'rechazar' then
    update public.ofertas set estado = 'rechazada', respondida_en = now()
    where id = p_oferta_id returning * into v_oferta;
    return jsonb_build_object(
      'oferta', to_jsonb(v_oferta),
      'cupo_id', v_cupo.id,
      'cita_id', null,
      'requiere_priorizacion', true
    );
  end if;

  update public.ofertas set estado = 'aceptada', respondida_en = now()
  where id = p_oferta_id returning * into v_oferta;

  insert into public.citas (
    paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min,
    estado, origen, cupo_origen_id
  )
  values (
    v_oferta.paciente_id, v_cupo.profesional_id, v_cupo.especialidad_id, v_cupo.consultorio_id,
    v_cupo.fecha_hora, v_cupo.duracion_min, 'confirmada', 'cupo_recuperado', v_cupo.id
  )
  returning id into v_cita_id;

  update public.cupos set estado = 'asignado', cita_asignada_id = v_cita_id where id = v_cupo.id;

  update public.solicitudes_espera set estado = 'atendida', cerrada_en = now()
  where paciente_id = v_oferta.paciente_id and especialidad_id = v_cupo.especialidad_id and estado = 'activa';

  select e.nombre as especialidad, co.zona_horaria into v_contexto
  from public.especialidades e, public.consultorios co
  where e.id = v_cupo.especialidad_id and co.id = v_cupo.consultorio_id;
  perform private.notificar(
    v_oferta.paciente_id,
    'cita_confirmada',
    'Cita confirmada',
    format(
      'Tu cita de %s del %s quedó confirmada. La encuentras en Mis citas.',
      v_contexto.especialidad,
      private.formatear_fecha_hora(v_cupo.fecha_hora, v_contexto.zona_horaria)
    ),
    v_oferta.id
  );

  return jsonb_build_object(
    'oferta', to_jsonb(v_oferta),
    'cupo_id', v_cupo.id,
    'cita_id', v_cita_id,
    'requiere_priorizacion', false
  );
end;
$$;

-- ═════════════ Lista de espera ═════════════

create function public.unirse_lista_espera(p_especialidad_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_solicitud public.solicitudes_espera;
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'paciente' then
    perform private.fallar('prohibido');
  end if;
  perform 1 from public.especialidades where id = p_especialidad_id;
  if not found then
    perform private.fallar('no_encontrado', 'La especialidad no existe');
  end if;

  begin
    insert into public.solicitudes_espera (paciente_id, especialidad_id)
    values (v_actor.id, p_especialidad_id)
    returning * into v_solicitud;
  exception when unique_violation then
    perform private.fallar('solicitud_duplicada');
  end;

  -- Quizás ya hay un cupo esperando a alguien como este paciente.
  perform public.avanzar_cupos(p_especialidad_id);
  return to_jsonb(v_solicitud);
end;
$$;

create function public.salir_lista_espera(p_solicitud_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_solicitud public.solicitudes_espera;
  v_pendiente record;
  v_cupos uuid[] := '{}'::uuid[];
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'paciente' then
    perform private.fallar('prohibido');
  end if;

  select * into v_solicitud from public.solicitudes_espera
  where id = p_solicitud_id and paciente_id = v_actor.id
  for update;
  if not found then
    perform private.fallar('no_encontrado', 'La solicitud no existe');
  end if;
  if not private.puede_transicionar('solicitud', v_solicitud.estado, 'cancelada') then
    perform private.fallar('transicion_invalida', format('La solicitud ya está %s', v_solicitud.estado));
  end if;

  update public.solicitudes_espera set estado = 'cancelada', cerrada_en = now()
  where id = p_solicitud_id returning * into v_solicitud;

  -- Si ya no le interesa la especialidad, su oferta pendiente pasa al siguiente.
  if not exists (
    select 1 from public.preferencias_especialidades
    where paciente_id = v_actor.id and especialidad_id = v_solicitud.especialidad_id
  ) then
    for v_pendiente in
      select o.id, o.cupo_id from public.ofertas o
      join public.cupos c on c.id = o.cupo_id
      where o.paciente_id = v_actor.id and o.estado = 'pendiente' and c.especialidad_id = v_solicitud.especialidad_id
    loop
      perform 1 from public.cupos where id = v_pendiente.cupo_id for update;
      update public.ofertas set estado = 'cancelada' where id = v_pendiente.id and estado = 'pendiente';
      v_cupos := v_cupos || v_pendiente.cupo_id;
    end loop;
  end if;

  return jsonb_build_object('solicitud', to_jsonb(v_solicitud), 'cupos_por_priorizar', to_jsonb(v_cupos));
end;
$$;

-- ═════════════ Preferencias ═════════════

create function private.preferencias_json(p_paciente_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'paciente_id', pp.paciente_id,
    'especialidad_ids', coalesce(
      (select jsonb_agg(pe.especialidad_id order by pe.especialidad_id)
       from public.preferencias_especialidades pe where pe.paciente_id = pp.paciente_id),
      '[]'::jsonb
    ),
    'franjas', coalesce(
      (select jsonb_agg(
         jsonb_build_object(
           'dia_semana', f.dia_semana,
           'hora_inicio', left(f.hora_inicio::text, 5),
           'hora_fin', left(f.hora_fin::text, 5)
         ) order by f.dia_semana, f.hora_inicio)
       from public.franjas_horarias f where f.paciente_id = pp.paciente_id),
      '[]'::jsonb
    ),
    'distancia_max_km', pp.distancia_max_km,
    'antelacion_min_horas', pp.antelacion_min_horas,
    'actualizado_en', pp.actualizado_en
  )
  from public.preferencias_paciente pp
  where pp.paciente_id = p_paciente_id;
$$;

create function public.obtener_preferencias()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_preferencias jsonb;
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'paciente' then
    perform private.fallar('prohibido');
  end if;
  v_preferencias := private.preferencias_json(v_actor.id);
  if v_preferencias is null then
    perform private.fallar('no_encontrado');
  end if;
  return v_preferencias;
end;
$$;

-- Mismas reglas que esquemaPreferencias (src/validacion/preferencias.ts). Reemplaza
-- todo en una transacción y vuelve a intentar los cupos disponibles.
-- p_franjas: [{ "dia_semana": 1, "hora_inicio": "08:00", "hora_fin": "12:00" }].
create function public.guardar_preferencias(
  p_especialidad_ids uuid[],
  p_franjas jsonb,
  p_distancia_max_km integer,
  p_antelacion_min_horas integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
  v_ids uuid[] := coalesce(p_especialidad_ids, '{}');
  v_franjas jsonb := coalesce(p_franjas, '[]'::jsonb);
  v_franja jsonb;
  v_patron_hora constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'paciente' then
    perform private.fallar('prohibido');
  end if;

  if cardinality(v_ids) > 10 then
    perform private.fallar('validacion', 'Elige como máximo 10 especialidades.');
  end if;
  if (select count(distinct x) from unnest(v_ids) as x) <> cardinality(v_ids) then
    perform private.fallar('validacion', 'Hay especialidades repetidas.');
  end if;
  if exists (
    select 1 from unnest(v_ids) as x
    where not exists (select 1 from public.especialidades e where e.id = x)
  ) then
    perform private.fallar('validacion', 'Especialidad desconocida');
  end if;

  if jsonb_typeof(v_franjas) <> 'array' or jsonb_array_length(v_franjas) > 21 then
    perform private.fallar('validacion', 'Puedes registrar como máximo 21 franjas.');
  end if;
  for v_franja in select * from jsonb_array_elements(v_franjas) loop
    if jsonb_typeof(v_franja) <> 'object'
      or jsonb_typeof(v_franja -> 'dia_semana') is distinct from 'number'
      or (v_franja ->> 'dia_semana') !~ '^[0-6]$'
      or coalesce(v_franja ->> 'hora_inicio', '') !~ v_patron_hora
      or coalesce(v_franja ->> 'hora_fin', '') !~ v_patron_hora then
      perform private.fallar('validacion', 'Franja con formato no válido');
    end if;
  end loop;

  begin
    insert into public.preferencias_paciente (paciente_id, distancia_max_km, antelacion_min_horas, actualizado_en)
    values (v_actor.id, p_distancia_max_km, p_antelacion_min_horas, now())
    on conflict (paciente_id) do update
      set distancia_max_km = excluded.distancia_max_km,
          antelacion_min_horas = excluded.antelacion_min_horas,
          actualizado_en = excluded.actualizado_en;

    delete from public.preferencias_especialidades where paciente_id = v_actor.id;
    insert into public.preferencias_especialidades (paciente_id, especialidad_id)
    select v_actor.id, x from unnest(v_ids) as x;

    delete from public.franjas_horarias where paciente_id = v_actor.id;
    insert into public.franjas_horarias (paciente_id, dia_semana, hora_inicio, hora_fin)
    select v_actor.id, (f ->> 'dia_semana')::smallint, (f ->> 'hora_inicio')::time, (f ->> 'hora_fin')::time
    from jsonb_array_elements(v_franjas) as f;
  exception
    -- check: opciones de distancia/antelación o inicio ≥ fin · exclusion: franjas solapadas.
    when check_violation or exclusion_violation or not_null_violation then
      perform private.fallar('validacion', sqlerrm);
  end;

  perform public.avanzar_cupos();
  return private.preferencias_json(v_actor.id);
end;
$$;

-- ═════════════ Staff: referencias de pacientes ═════════════

-- Pacientes relacionados con el consultorio (citas, ofertas o candidatos evaluados),
-- solo por código e iniciales: ni nombre, ni correo, ni teléfono.
create function public.referencias_pacientes(p_paciente_ids uuid[] default null)
returns table (paciente_id uuid, codigo text, iniciales text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.perfiles := private.actor();
begin
  if v_actor.id is null then
    perform private.fallar('no_autenticado');
  end if;
  if v_actor.rol <> 'staff' then
    perform private.fallar('prohibido');
  end if;

  return query
  select p.id, p.codigo, private.iniciales(p.nombre)
  from public.perfiles p
  where p.rol = 'paciente'
    and (p_paciente_ids is null or p.id = any (p_paciente_ids))
    and (
      exists (select 1 from public.citas c where c.paciente_id = p.id and c.consultorio_id = v_actor.consultorio_id)
      or exists (select 1 from public.ofertas o where o.paciente_id = p.id and o.consultorio_id = v_actor.consultorio_id)
      or exists (
        select 1 from public.priorizacion_candidatos pc
        join public.priorizaciones pz on pz.id = pc.priorizacion_id
        where pc.paciente_id = p.id and pz.consultorio_id = v_actor.consultorio_id
      )
    )
  order by p.codigo, p.id;
end;
$$;

-- ═════════════ Permisos ═════════════
-- Por defecto Supabase concede EXECUTE a anon y authenticated: se retira todo y se
-- concede lo mínimo. El motor (ofrecer/expirar/avanzar) queda solo para service_role.

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;
grant execute on function public.cancelar_cita(uuid) to authenticated;
grant execute on function public.registrar_inasistencia(uuid) to authenticated;
grant execute on function public.responder_oferta(uuid, text) to authenticated;
grant execute on function public.unirse_lista_espera(uuid) to authenticated;
grant execute on function public.salir_lista_espera(uuid) to authenticated;
grant execute on function public.obtener_preferencias() to authenticated;
grant execute on function public.guardar_preferencias(uuid[], jsonb, integer, integer) to authenticated;
grant execute on function public.referencias_pacientes(uuid[]) to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
grant execute on function private.consultorio_del_staff() to authenticated;
grant execute on function private.explicacion_valida(jsonb) to authenticated;
