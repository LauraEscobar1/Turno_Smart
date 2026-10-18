-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 1/6 — Extensiones, esquema privado y utilidades puras
-- ════════════════════════════════════════════════════════════════════════════
-- `private` no se publica en la API (PostgREST solo expone `public`): aquí viven
-- las reglas internas. Las funciones que el cliente puede llamar están en `public`
-- y cada una declara sus permisos de forma explícita.

create extension if not exists btree_gist with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;
comment on schema private is
  'Reglas internas de TurnoSmart. No se expone en la API; solo la usan funciones SECURITY DEFINER y políticas RLS.';
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ───────────── Reglas de tiempo (espejo de src/constants/reglas.ts) ─────────────

create function private.duracion_oferta()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '15 minutes' $$;
comment on function private.duracion_oferta() is 'DURACION_OFERTA_MIN: plazo para responder una oferta.';

create function private.margen_cierre_cupo()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '30 minutes' $$;
comment on function private.margen_cierre_cupo() is
  'MARGEN_CIERRE_CUPO_MIN: un cupo deja de ofrecerse cuando faltan menos de 30 minutos.';

-- ───────────── Máquinas de estado (espejo de src/constants/estados.ts) ─────────────
-- Fuente única en el servidor. Los triggers de cada tabla la aplican a TODA
-- actualización de `estado`, venga de una RPC, del cron o de la service role.

create function private.puede_transicionar(p_maquina text, p_desde text, p_hacia text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from (
      values
        ('oferta', 'pendiente', 'aceptada'),
        ('oferta', 'pendiente', 'rechazada'),
        ('oferta', 'pendiente', 'expirada'),
        ('oferta', 'pendiente', 'cancelada'),
        ('cita', 'programada', 'confirmada'),
        ('cita', 'programada', 'cancelada'),
        ('cita', 'programada', 'asistida'),
        ('cita', 'programada', 'inasistencia'),
        ('cita', 'confirmada', 'cancelada'),
        ('cita', 'confirmada', 'asistida'),
        ('cita', 'confirmada', 'inasistencia'),
        ('cupo', 'disponible', 'ofertando'),
        ('cupo', 'disponible', 'expirado'),
        ('cupo', 'ofertando', 'asignado'),
        ('cupo', 'ofertando', 'disponible'),
        ('cupo', 'ofertando', 'expirado'),
        ('solicitud', 'activa', 'atendida'),
        ('solicitud', 'activa', 'cancelada')
    ) as t (maquina, desde, hacia)
    where t.maquina = p_maquina and t.desde = p_desde and t.hacia = p_hacia
  );
$$;
comment on function private.puede_transicionar(text, text, text) is
  'true si la máquina permite pasar de p_desde a p_hacia. Quedarse igual no es una transición.';

-- ───────────── Errores tipados ─────────────
-- message = código de `src/services/errores.ts` (lo que la app traduce a ServiceError).
-- errcode PTxyz: PostgREST responde con el estado HTTP xyz.

create function private.fallar(p_codigo text, p_detalle text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    message = p_codigo,
    detail = coalesce(p_detalle, ''),
    errcode = case p_codigo
      when 'no_autenticado' then 'PT401'
      when 'prohibido' then 'PT403'
      when 'no_encontrado' then 'PT404'
      when 'validacion' then 'PT422'
      else 'PT409'
    end;
end;
$$;

-- ───────────── Utilidades de presentación (mismas reglas que src/utils/) ─────────────

-- Distancia en línea recta (haversine), en kilómetros. Igual que distanciaKm().
create function private.distancia_km(
  p_lat1 double precision,
  p_lng1 double precision,
  p_lat2 double precision,
  p_lng2 double precision
)
returns double precision
language sql
immutable
strict
set search_path = ''
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(p_lat2 - p_lat1) / 2), 2)
    + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lng2 - p_lng1) / 2), 2)
  ));
$$;

-- "1,7 km" o "12 km". Igual que formatearDistancia().
create function private.formatear_distancia(p_km double precision)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_km < 10 then replace(trim_scale(round(p_km::numeric, 1))::text, '.', ',')
    else round(p_km::numeric)::text
  end || ' km';
$$;

-- Iniciales (máximo 2): "Ana María Pérez" → "AP". Igual que obtenerIniciales().
create function private.iniciales(p_nombre text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when btrim(coalesce(p_nombre, '')) = '' then '?'
    when cardinality(partes) = 1 then upper(left(partes[1], 1))
    else upper(left(partes[1], 1) || left(partes[cardinality(partes)], 1))
  end
  from (select regexp_split_to_array(btrim(coalesce(p_nombre, '')), '\s+') as partes) as t;
$$;

-- "mar, 21 oct · 9:30 a. m." en la hora local del consultorio.
create function private.formatear_fecha_hora(p_fecha timestamptz, p_zona text)
returns text
language sql
stable
set search_path = ''
as $$
  select (array['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'])[extract(dow from l)::int + 1]
    || ', ' || extract(day from l)::int || ' '
    || (array['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'])[extract(month from l)::int]
    || ' · ' || (case when extract(hour from l)::int % 12 = 0 then 12 else extract(hour from l)::int % 12 end)
    || ':' || to_char(l, 'MI')
    || case when extract(hour from l) < 12 then ' a. m.' else ' p. m.' end
  from (select p_fecha at time zone p_zona as l) as t;
$$;

-- Nombre del día en minúscula (0 = domingo, igual que Date.getDay()).
create function private.nombre_dia(p_dia integer)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select (array['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'])[p_dia + 1];
$$;

-- Rango de horas del día, para impedir franjas solapadas con una restricción EXCLUDE.
create type private.rango_horario as range (subtype = time);
