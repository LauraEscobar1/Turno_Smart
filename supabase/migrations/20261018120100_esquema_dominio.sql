-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 2/6 — Esquema del dominio
-- ════════════════════════════════════════════════════════════════════════════
-- Una tabla por interfaz de src/types/dominio.ts (snake_case). Las reglas que no
-- dependen del momento se expresan como restricciones; las transiciones de estado,
-- con triggers que usan private.puede_transicionar().

-- ───────────── Validación de la explicación de una oferta ─────────────
-- Misma forma que ExplicacionPrioridad: puntaje y factores entre 0 y 1.

create function private.explicacion_valida(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_clave text;
  v_factor jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object'
    or jsonb_typeof(p -> 'puntaje') is distinct from 'number'
    or jsonb_typeof(p -> 'factores') is distinct from 'object'
    or (p ->> 'fuente') is null
    or (p ->> 'fuente') not in ('regla_simulada', 'regla_backend', 'ia') then
    return false;
  end if;
  if (p ->> 'puntaje')::numeric not between 0 and 1 then
    return false;
  end if;
  foreach v_clave in array array['tiempoEspera', 'compatibilidadHoraria', 'distancia', 'historialRespuesta'] loop
    v_factor := p -> 'factores' -> v_clave;
    if v_factor is null
      or jsonb_typeof(v_factor -> 'valor') is distinct from 'number'
      or jsonb_typeof(v_factor -> 'peso') is distinct from 'number'
      or jsonb_typeof(v_factor -> 'detalle') is distinct from 'string' then
      return false;
    end if;
    if (v_factor ->> 'valor')::numeric not between 0 and 1
      or (v_factor ->> 'peso')::numeric not between 0 and 1 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- ───────────── Catálogo ─────────────

create table public.consultorios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  direccion text not null check (char_length(btrim(direccion)) between 3 and 200),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  zona_horaria text not null default 'America/Bogota',
  creado_en timestamptz not null default now()
);
comment on table public.consultorios is 'Sedes. La zona horaria define el día y la hora local de los cupos (franjas).';

create table public.especialidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique check (char_length(btrim(nombre)) between 2 and 80),
  creado_en timestamptz not null default now()
);

create table public.profesionales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 3 and 120),
  especialidad_id uuid not null references public.especialidades (id),
  consultorio_id uuid not null references public.consultorios (id),
  creado_en timestamptz not null default now(),
  -- Citas y cupos referencian (profesional, especialidad, consultorio) juntos:
  -- así la especialidad y la sede copiadas nunca contradicen al profesional.
  constraint profesionales_contexto_unico unique (id, especialidad_id, consultorio_id)
);
create index profesionales_especialidad_idx on public.profesionales (especialidad_id);
create index profesionales_consultorio_idx on public.profesionales (consultorio_id);

-- ───────────── Personas ─────────────

create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 3 and 80),
  email text not null unique check (email = lower(email)),
  telefono text check (telefono ~ '^\+?\d[\d\s-]{6,14}\d$'),
  rol text not null default 'paciente' check (rol in ('paciente', 'staff')),
  consultorio_id uuid references public.consultorios (id),
  -- Ubicación aproximada declarada (barrio), nunca GPS.
  ubicacion_lat double precision check (ubicacion_lat between -90 and 90),
  ubicacion_lng double precision check (ubicacion_lng between -180 and 180),
  -- Código corto y estable para que el staff se refiera al paciente sin identificarlo.
  codigo text not null generated always as ('P-' || upper(left(md5(id::text), 4))) stored,
  creado_en timestamptz not null default now(),
  constraint perfiles_staff_con_consultorio check ((rol = 'staff') = (consultorio_id is not null)),
  constraint perfiles_ubicacion_completa check ((ubicacion_lat is null) = (ubicacion_lng is null)),
  constraint perfiles_ubicacion_solo_paciente check (rol = 'paciente' or ubicacion_lat is null)
);
comment on table public.perfiles is
  'Perfil 1:1 con auth.users. El rol nunca sale de los metadatos del cliente: solo de app_metadata (service role).';
create index perfiles_consultorio_idx on public.perfiles (consultorio_id) where consultorio_id is not null;

-- ───────────── Preferencias del paciente ─────────────

create table public.preferencias_paciente (
  paciente_id uuid primary key references public.perfiles (id) on delete cascade,
  -- null = sin límite. Opciones de OPCIONES_DISTANCIA_KM.
  distancia_max_km integer check (distancia_max_km in (2, 5, 10, 20)),
  -- Opciones de OPCIONES_ANTELACION_HORAS.
  antelacion_min_horas integer not null default 2 check (antelacion_min_horas in (1, 2, 4, 12, 24)),
  actualizado_en timestamptz not null default now()
);

create table public.preferencias_especialidades (
  paciente_id uuid not null references public.preferencias_paciente (paciente_id) on delete cascade,
  especialidad_id uuid not null references public.especialidades (id) on delete cascade,
  primary key (paciente_id, especialidad_id)
);
create index preferencias_especialidades_especialidad_idx on public.preferencias_especialidades (especialidad_id);

create table public.franjas_horarias (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.preferencias_paciente (paciente_id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null check (date_trunc('minute', hora_inicio) = hora_inicio),
  hora_fin time not null check (date_trunc('minute', hora_fin) = hora_fin),
  constraint franjas_inicio_antes_de_fin check (hora_inicio < hora_fin),
  -- Mismo criterio que franjasSeSolapan(): tocarse en el borde no es solape.
  constraint franjas_sin_solape exclude using gist (
    paciente_id with =,
    dia_semana with =,
    private.rango_horario(hora_inicio, hora_fin, '[)') with &&
  )
);

-- ───────────── Lista de espera ─────────────

create table public.solicitudes_espera (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.perfiles (id) on delete cascade,
  especialidad_id uuid not null references public.especialidades (id),
  estado text not null default 'activa' check (estado in ('activa', 'atendida', 'cancelada')),
  creada_en timestamptz not null default now(),
  cerrada_en timestamptz,
  constraint solicitudes_cierre_coherente check ((estado = 'activa') = (cerrada_en is null))
);
-- Una solicitud activa por paciente y especialidad (solicitud_duplicada).
create unique index solicitudes_una_activa_idx
  on public.solicitudes_espera (paciente_id, especialidad_id)
  where estado = 'activa';
create index solicitudes_activas_especialidad_idx
  on public.solicitudes_espera (especialidad_id)
  where estado = 'activa';

-- ───────────── Agenda ─────────────

create table public.citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.perfiles (id) on delete cascade,
  profesional_id uuid not null,
  especialidad_id uuid not null references public.especialidades (id),
  consultorio_id uuid not null references public.consultorios (id),
  fecha_hora timestamptz not null,
  duracion_min integer not null check (duracion_min between 5 and 240),
  estado text not null default 'programada'
    check (estado in ('programada', 'confirmada', 'cancelada', 'asistida', 'inasistencia')),
  origen text not null default 'agenda' check (origen in ('agenda', 'cupo_recuperado')),
  cupo_origen_id uuid,
  creada_en timestamptz not null default now(),
  cancelada_en timestamptz,
  constraint citas_contexto_profesional foreign key (profesional_id, especialidad_id, consultorio_id)
    references public.profesionales (id, especialidad_id, consultorio_id),
  constraint citas_cancelacion_coherente check ((estado = 'cancelada') = (cancelada_en is not null)),
  constraint citas_origen_coherente check ((origen = 'cupo_recuperado') = (cupo_origen_id is not null))
);
create index citas_paciente_fecha_idx on public.citas (paciente_id, fecha_hora);
create index citas_consultorio_fecha_idx on public.citas (consultorio_id, fecha_hora);
create index citas_contexto_profesional_idx on public.citas (profesional_id, especialidad_id, consultorio_id);
create index citas_especialidad_idx on public.citas (especialidad_id);
-- Un cupo recuperado produce como máximo UNA cita.
create unique index citas_una_por_cupo_idx on public.citas (cupo_origen_id) where cupo_origen_id is not null;

create table public.cupos (
  id uuid primary key default gen_random_uuid(),
  cita_origen_id uuid not null references public.citas (id),
  consultorio_id uuid not null references public.consultorios (id),
  profesional_id uuid not null,
  especialidad_id uuid not null references public.especialidades (id),
  fecha_hora timestamptz not null,
  duracion_min integer not null check (duracion_min between 5 and 240),
  estado text not null default 'disponible'
    check (estado in ('disponible', 'ofertando', 'asignado', 'expirado')),
  cancelada_por text not null check (cancelada_por in ('paciente', 'staff')),
  ronda_actual integer not null default 0 check (ronda_actual >= 0),
  cita_asignada_id uuid references public.citas (id) deferrable initially immediate,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Idempotencia: una cita cancelada libera como máximo UN cupo.
  constraint cupos_una_cita_origen unique (cita_origen_id),
  constraint cupos_una_cita_asignada unique (cita_asignada_id),
  constraint cupos_id_consultorio unique (id, consultorio_id),
  constraint cupos_contexto_profesional foreign key (profesional_id, especialidad_id, consultorio_id)
    references public.profesionales (id, especialidad_id, consultorio_id),
  constraint cupos_asignado_con_cita check ((estado = 'asignado') = (cita_asignada_id is not null))
);
comment on table public.cupos is 'CupoLiberado: hueco que dejó una cita cancelada y que se intenta recuperar.';
create index cupos_consultorio_estado_idx on public.cupos (consultorio_id, estado, fecha_hora);
create index cupos_abiertos_idx on public.cupos (fecha_hora) where estado in ('disponible', 'ofertando');
create index cupos_contexto_profesional_idx on public.cupos (profesional_id, especialidad_id, consultorio_id);
create index cupos_especialidad_idx on public.cupos (especialidad_id);

alter table public.citas
  add constraint citas_cupo_origen_fk foreign key (cupo_origen_id)
  references public.cupos (id) deferrable initially immediate;

-- ───────────── Ofertas ─────────────

create table public.ofertas (
  id uuid primary key default gen_random_uuid(),
  cupo_id uuid not null,
  -- Copia de cupos.consultorio_id (garantizada por la FK compuesta) para RLS del staff.
  consultorio_id uuid not null,
  paciente_id uuid not null references public.perfiles (id) on delete cascade,
  ronda integer not null check (ronda >= 1),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aceptada', 'rechazada', 'expirada', 'cancelada')),
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null,
  respondida_en timestamptz,
  explicacion jsonb not null check (private.explicacion_valida(explicacion)),
  constraint ofertas_cupo_consultorio foreign key (cupo_id, consultorio_id)
    references public.cupos (id, consultorio_id),
  constraint ofertas_plazo_positivo check (expira_en > creada_en),
  constraint ofertas_respuesta_coherente
    check ((estado in ('aceptada', 'rechazada')) = (respondida_en is not null)),
  constraint ofertas_ronda_unica unique (cupo_id, ronda),
  -- Nadie recibe dos veces el mismo cupo.
  constraint ofertas_paciente_una_vez_por_cupo unique (cupo_id, paciente_id)
);
-- Una oferta pendiente por cupo y una por paciente (una a la vez).
create unique index ofertas_una_pendiente_por_cupo_idx on public.ofertas (cupo_id) where estado = 'pendiente';
create unique index ofertas_una_pendiente_por_paciente_idx on public.ofertas (paciente_id) where estado = 'pendiente';
create index ofertas_pendientes_vencimiento_idx on public.ofertas (expira_en) where estado = 'pendiente';
create index ofertas_paciente_creada_idx on public.ofertas (paciente_id, creada_en desc);
create index ofertas_consultorio_idx on public.ofertas (consultorio_id, estado);
create index ofertas_cupo_consultorio_idx on public.ofertas (cupo_id, consultorio_id);

create table public.eventos_oferta (
  id uuid primary key default gen_random_uuid(),
  oferta_id uuid not null references public.ofertas (id) on delete cascade,
  cupo_id uuid not null references public.cupos (id) on delete cascade,
  consultorio_id uuid not null references public.consultorios (id),
  tipo text not null check (tipo in ('creada', 'aceptada', 'rechazada', 'expirada', 'cancelada')),
  ronda integer not null check (ronda >= 1),
  fecha timestamptz not null default now()
);
comment on table public.eventos_oferta is 'Auditoría de cada oferta. La llena un trigger: ninguna ruta puede omitirla.';
create index eventos_oferta_cupo_fecha_idx on public.eventos_oferta (cupo_id, fecha);
create index eventos_oferta_oferta_idx on public.eventos_oferta (oferta_id);
create index eventos_oferta_consultorio_idx on public.eventos_oferta (consultorio_id);

-- ───────────── Notificaciones ─────────────

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfiles (id) on delete cascade,
  tipo text not null
    check (tipo in ('oferta_nueva', 'oferta_expirada', 'cita_confirmada', 'cita_cancelada')),
  titulo text not null check (char_length(titulo) between 1 and 120),
  cuerpo text not null check (char_length(cuerpo) between 1 and 500),
  oferta_id uuid references public.ofertas (id) on delete set null,
  leida boolean not null default false,
  creada_en timestamptz not null default now()
);
create index notificaciones_usuario_fecha_idx on public.notificaciones (usuario_id, creada_en desc);
create index notificaciones_no_leidas_idx on public.notificaciones (usuario_id) where not leida;
create index notificaciones_oferta_idx on public.notificaciones (oferta_id) where oferta_id is not null;

-- ───────────── Priorización (auditoría) ─────────────

create table public.priorizaciones (
  id uuid primary key default gen_random_uuid(),
  cupo_id uuid not null,
  consultorio_id uuid not null,
  -- Ronda para la que se calculó (cupos.ronda_actual + 1 en ese momento).
  ronda integer not null check (ronda >= 1),
  -- Quién calculó el ranking: la Edge Function (TS) o la regla SQL de respaldo.
  origen text not null check (origen in ('edge_function', 'sql')),
  fuente text not null default 'regla_backend' check (fuente in ('regla_backend', 'ia')),
  version_regla text not null,
  pesos jsonb not null,
  total_candidatos integer not null check (total_candidatos >= 0),
  resultado text check (resultado in ('oferta_creada', 'sin_candidatos', 'propuesta_invalida', 'ya_ofertado', 'cupo_cerrado')),
  oferta_id uuid unique references public.ofertas (id),
  creada_en timestamptz not null default now(),
  resuelta_en timestamptz,
  constraint priorizaciones_cupo_consultorio foreign key (cupo_id, consultorio_id)
    references public.cupos (id, consultorio_id),
  constraint priorizaciones_resolucion_coherente check ((resultado is null) = (resuelta_en is null)),
  constraint priorizaciones_oferta_coherente check ((resultado = 'oferta_creada') = (oferta_id is not null))
);
comment on table public.priorizaciones is 'Cada cálculo de candidatos para un cupo: quién, con qué regla y qué se decidió.';
create index priorizaciones_cupo_idx on public.priorizaciones (cupo_id, creada_en);
create index priorizaciones_consultorio_idx on public.priorizaciones (consultorio_id, cupo_id);

create table public.priorizacion_candidatos (
  priorizacion_id uuid not null references public.priorizaciones (id) on delete cascade,
  posicion integer not null check (posicion >= 1),
  paciente_id uuid not null references public.perfiles (id) on delete cascade,
  puntaje numeric(4, 3) not null check (puntaje between 0 and 1),
  explicacion jsonb not null check (private.explicacion_valida(explicacion)),
  elegido boolean not null default false,
  -- Por qué el backend no eligió a un candidato propuesto.
  descarte text check (descarte in ('ya_no_es_candidato', 'oferta_pendiente_en_otro_cupo')),
  primary key (priorizacion_id, posicion),
  constraint priorizacion_candidatos_paciente_unico unique (priorizacion_id, paciente_id),
  constraint priorizacion_candidatos_elegido_sin_descarte check (not (elegido and descarte is not null))
);
create unique index priorizacion_un_elegido_idx on public.priorizacion_candidatos (priorizacion_id) where elegido;
create index priorizacion_candidatos_paciente_idx on public.priorizacion_candidatos (paciente_id);

-- ───────────── Riesgo de inasistencia ─────────────

create table public.riesgo_inasistencia (
  cita_id uuid primary key references public.citas (id) on delete cascade,
  nivel text not null check (nivel in ('bajo', 'medio', 'alto')),
  puntaje numeric(3, 2) not null check (puntaje between 0 and 1),
  explicacion text not null check (char_length(explicacion) between 1 and 500),
  recomendacion text not null check (char_length(recomendacion) between 1 and 300),
  fuente text not null check (fuente in ('estimacion_ficticia', 'ia')),
  calculado_en timestamptz not null default now(),
  -- Mismos umbrales que la interfaz: bajo < 0,35 ≤ medio < 0,6 ≤ alto.
  constraint riesgo_nivel_coherente check (
    (nivel = 'bajo' and puntaje < 0.35)
    or (nivel = 'medio' and puntaje >= 0.35 and puntaje < 0.6)
    or (nivel = 'alto' and puntaje >= 0.6)
  )
);
comment on table public.riesgo_inasistencia is
  'Predicción para el staff (sin datos clínicos). La IA recomienda; el staff decide (Fase 5).';

-- ════════════════════════════ Triggers ════════════════════════════

-- Transiciones de estado: rechaza cualquier cambio no listado en puede_transicionar().
create function private.validar_transicion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado
    and not private.puede_transicionar(tg_argv[0], old.estado, new.estado) then
    perform private.fallar('transicion_invalida', format('%s: %s → %s', tg_argv[0], old.estado, new.estado));
  end if;
  return new;
end;
$$;

create trigger ofertas_validar_transicion before update of estado on public.ofertas
  for each row execute function private.validar_transicion('oferta');
create trigger citas_validar_transicion before update of estado on public.citas
  for each row execute function private.validar_transicion('cita');
create trigger cupos_validar_transicion before update of estado on public.cupos
  for each row execute function private.validar_transicion('cupo');
create trigger solicitudes_validar_transicion before update of estado on public.solicitudes_espera
  for each row execute function private.validar_transicion('solicitud');

create function private.marcar_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

create trigger cupos_marcar_actualizado before update on public.cupos
  for each row execute function private.marcar_actualizado();

-- Línea de tiempo de cada oferta (EventoOferta).
create function private.registrar_evento_oferta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.eventos_oferta (oferta_id, cupo_id, consultorio_id, tipo, ronda, fecha)
    values (new.id, new.cupo_id, new.consultorio_id, 'creada', new.ronda, new.creada_en);
    -- Ofertas históricas que se insertan ya cerradas (semilla).
    if new.estado <> 'pendiente' then
      insert into public.eventos_oferta (oferta_id, cupo_id, consultorio_id, tipo, ronda, fecha)
      values (new.id, new.cupo_id, new.consultorio_id, new.estado, new.ronda,
              coalesce(new.respondida_en, new.expira_en));
    end if;
  elsif new.estado is distinct from old.estado then
    insert into public.eventos_oferta (oferta_id, cupo_id, consultorio_id, tipo, ronda, fecha)
    values (new.id, new.cupo_id, new.consultorio_id, new.estado, new.ronda,
            case when new.estado = 'expirada' then least(new.expira_en, now())
                 else coalesce(new.respondida_en, now()) end);
  end if;
  return null;
end;
$$;

create trigger ofertas_registrar_evento after insert or update of estado on public.ofertas
  for each row execute function private.registrar_evento_oferta();

-- Perfil y preferencias al registrarse. El rol solo puede venir de app_metadata
-- (lo fija la service role); el registro público siempre crea pacientes.
create function private.crear_perfil_de_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol text := coalesce(new.raw_app_meta_data ->> 'rol', 'paciente');
  v_nombre text := btrim(coalesce(new.raw_user_meta_data ->> 'nombre', ''));
  v_telefono text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'telefono', '')), '');
begin
  if v_rol not in ('paciente', 'staff') then
    v_rol := 'paciente';
  end if;
  if char_length(v_nombre) < 3 then
    v_nombre := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  if char_length(v_nombre) < 3 then
    v_nombre := 'Paciente';
  end if;
  if v_telefono !~ '^\+?\d[\d\s-]{6,14}\d$' then
    v_telefono := null;
  end if;

  insert into public.perfiles (id, nombre, email, telefono, rol, consultorio_id)
  values (
    new.id,
    left(v_nombre, 80),
    lower(new.email),
    v_telefono,
    v_rol,
    case when v_rol = 'staff' then (new.raw_app_meta_data ->> 'consultorio_id')::uuid end
  );

  if v_rol = 'paciente' then
    insert into public.preferencias_paciente (paciente_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger al_crear_usuario after insert on auth.users
  for each row execute function private.crear_perfil_de_usuario();
