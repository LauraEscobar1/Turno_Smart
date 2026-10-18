-- ════════════════════════════════════════════════════════════════════════════
-- ⚠️ DATOS FICTICIOS — solo para el entorno LOCAL (supabase db reset).
-- ════════════════════════════════════════════════════════════════════════════
-- Mismo escenario que el servidor simulado (src/services/mock/semilla.ts): personas,
-- sedes, direcciones, coordenadas y horarios inventados. Las fechas se calculan
-- relativas al momento del reset, en la hora local de los consultorios
-- (America/Bogota), para que el escenario nunca caduque: vuelve a ejecutar
-- `supabase db reset` para regenerarlo.
--
-- Cuentas demo (contraseña de todas: demo1234):
--   paciente@demo.turnosmart.co      Mariana Rojas (paciente con oferta pendiente)
--   carlos@demo.turnosmart.co        Carlos Pérez (paciente)
--   staff@demo.turnosmart.co         Recepción Sede Centro (staff)
--   staff.norte@demo.turnosmart.co   Recepción Sede Norte (staff, para probar aislamiento)
-- También: ana@, jorge@, lucia@ y pedro@demo.turnosmart.co.
--
-- Esquema de ids fijos (legibles en Studio y en las pruebas):
--   a… usuarios · c… consultorios · e… especialidades · d… profesionales
--   5… solicitudes · b… citas · cc… cupos · 0f… ofertas

begin;

-- Las referencias cruzadas cupo ↔ cita recuperada se validan al confirmar.
set constraints all deferred;

-- ───────────── Utilidades de fecha (solo para esta sesión) ─────────────

create function pg_temp.zona() returns text language sql immutable as $$ select 'America/Bogota' $$;

-- Fecha local `dias` desde hoy a la `hora` indicada.
create function pg_temp.en(p_dias integer, p_hora text) returns timestamptz language sql stable as $$
  select (((now() at time zone pg_temp.zona())::date + p_dias) + p_hora::time) at time zone pg_temp.zona();
$$;

create function pg_temp.hace(p_dias integer, p_hora text) returns timestamptz language sql stable as $$
  select pg_temp.en(-p_dias, p_hora);
$$;

-- "Dentro de N horas" ajustado al horario de atención (07:00–19:00): si cae fuera,
-- pasa al día siguiente a las 08:00 + N horas (igual que horaDeAtencion()).
create function pg_temp.en_horario(p_horas integer) returns timestamptz language plpgsql stable as $$
declare
  v_base timestamptz := to_timestamp(ceil(extract(epoch from now() + make_interval(hours => p_horas)) / 1800) * 1800);
  v_local timestamp := v_base at time zone pg_temp.zona();
  v_hoy date := (now() at time zone pg_temp.zona())::date;
begin
  if v_local::date = v_hoy and extract(hour from v_local) >= 7 and extract(hour from v_local) < 19 then
    return v_base;
  end if;
  return pg_temp.en(
    case when v_local::date = v_hoy and extract(hour from v_local) < 7 then 0 else 1 end,
    (8 + p_horas) || ':00'
  );
end;
$$;

create function pg_temp.explicacion(
  p_espera numeric, p_detalle_espera text,
  p_distancia numeric, p_detalle_distancia text,
  p_historial numeric, p_detalle_historial text
) returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'puntaje', round(p_espera * 0.4 + 0.5 * 0.3 + p_distancia * 0.2 + p_historial * 0.1, 3),
    'fuente', 'regla_backend',
    'factores', jsonb_build_object(
      'tiempoEspera', jsonb_build_object('valor', p_espera, 'peso', 0.4, 'detalle', p_detalle_espera),
      'compatibilidadHoraria', jsonb_build_object('valor', 0.5, 'peso', 0.3,
        'detalle', 'No indicaste franjas horarias, así que tomamos cualquier horario como posible.'),
      'distancia', jsonb_build_object('valor', p_distancia, 'peso', 0.2, 'detalle', p_detalle_distancia),
      'historialRespuesta', jsonb_build_object('valor', p_historial, 'peso', 0.1, 'detalle', p_detalle_historial)
    )
  );
$$;

-- ───────────── Catálogo ─────────────

insert into public.especialidades (id, nombre) values
  ('e0000000-0000-4000-8000-000000000001', 'Medicina general'),
  ('e0000000-0000-4000-8000-000000000002', 'Odontología'),
  ('e0000000-0000-4000-8000-000000000003', 'Pediatría'),
  ('e0000000-0000-4000-8000-000000000004', 'Dermatología');

insert into public.consultorios (id, nombre, direccion, lat, lng) values
  ('c0000000-0000-4000-8000-000000000001', 'Sede Centro', 'Calle 19 # 5-20 (dirección ficticia)', 4.602, -74.07),
  ('c0000000-0000-4000-8000-000000000002', 'Sede Norte', 'Carrera 15 # 120-30 (dirección ficticia)', 4.7, -74.045);

insert into public.profesionales (id, nombre, especialidad_id, consultorio_id) values
  ('d0000000-0000-4000-8000-000000000001', 'Dra. Valentina Ruiz', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'Dra. Camila Torres', 'e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000003', 'Dr. Andrés Mejía', 'e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000004', 'Dr. Felipe Cárdenas', 'e0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000005', 'Dr. Julián Ortiz', 'e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002');

-- ───────────── Cuentas (Supabase Auth guarda solo el hash de la contraseña) ─────────────
-- El trigger al_crear_usuario crea perfil y preferencias. El rol staff y su
-- consultorio van en app_metadata, que el cliente no puede escribir.

with cuentas (id, email, nombre, app_meta) as (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'paciente@demo.turnosmart.co', 'Mariana Rojas', '{}'::jsonb),
    ('a0000000-0000-4000-8000-000000000002', 'carlos@demo.turnosmart.co', 'Carlos Pérez', '{}'),
    ('a0000000-0000-4000-8000-000000000003', 'ana@demo.turnosmart.co', 'Ana Martínez', '{}'),
    ('a0000000-0000-4000-8000-000000000004', 'jorge@demo.turnosmart.co', 'Jorge Ramírez', '{}'),
    ('a0000000-0000-4000-8000-000000000005', 'lucia@demo.turnosmart.co', 'Lucía Fernández', '{}'),
    ('a0000000-0000-4000-8000-000000000006', 'pedro@demo.turnosmart.co', 'Pedro Salazar', '{}'),
    ('a0000000-0000-4000-8000-000000000101', 'staff@demo.turnosmart.co', 'Recepción Sede Centro',
      '{"rol": "staff", "consultorio_id": "c0000000-0000-4000-8000-000000000001"}'),
    ('a0000000-0000-4000-8000-000000000102', 'staff.norte@demo.turnosmart.co', 'Recepción Sede Norte',
      '{"rol": "staff", "consultorio_id": "c0000000-0000-4000-8000-000000000002"}')
),
usuarios as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  )
  select
    '00000000-0000-0000-0000-000000000000', c.id, 'authenticated', 'authenticated', c.email,
    extensions.crypt('demo1234', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb || c.app_meta,
    jsonb_build_object('nombre', c.nombre), now(), now(),
    '', '', '', ''
  from cuentas c
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from usuarios u;

-- Antigüedad y ubicación aproximada (barrio) de los pacientes.
update public.perfiles p set creado_en = pg_temp.hace(90, '08:00'), ubicacion_lat = v.lat, ubicacion_lng = v.lng
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 4.615, -74.075),
  ('a0000000-0000-4000-8000-000000000002', 4.63, -74.065),
  ('a0000000-0000-4000-8000-000000000003', 4.69, -74.05),
  ('a0000000-0000-4000-8000-000000000004', 4.56, -74.1),
  ('a0000000-0000-4000-8000-000000000005', 4.61, -74.08),
  ('a0000000-0000-4000-8000-000000000006', 4.6, -74.065)
) as v (id, lat, lng)
where p.id = v.id;
update public.perfiles set creado_en = pg_temp.hace(120, '08:00') where rol = 'staff';

-- ───────────── Preferencias ─────────────

update public.preferencias_paciente pp
set distancia_max_km = v.distancia, antelacion_min_horas = v.antelacion, actualizado_en = pg_temp.hace(30, '08:00')
from (values
  ('a0000000-0000-4000-8000-000000000001'::uuid, 10, 2),
  ('a0000000-0000-4000-8000-000000000002', 5, 2),
  ('a0000000-0000-4000-8000-000000000003', null, 1),
  ('a0000000-0000-4000-8000-000000000004', 20, 1),
  ('a0000000-0000-4000-8000-000000000005', 10, 2),
  ('a0000000-0000-4000-8000-000000000006', 5, 1)
) as v (paciente_id, distancia, antelacion)
where pp.paciente_id = v.paciente_id;

insert into public.preferencias_especialidades (paciente_id, especialidad_id) values
  ('a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002'), -- Mariana: Odontología
  ('a0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000003'); -- Pedro: Pediatría

-- Carlos: lunes a viernes de 08:00 a 12:00.
insert into public.franjas_horarias (paciente_id, dia_semana, hora_inicio, hora_fin)
select 'a0000000-0000-4000-8000-000000000002', d, '08:00', '12:00' from generate_series(1, 5) as d;

-- ───────────── Lista de espera ─────────────

insert into public.solicitudes_espera (id, paciente_id, especialidad_id, estado, creada_en, cerrada_en) values
  ('50000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'activa', pg_temp.hace(28, '09:00'), null),
  ('50000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', 'cancelada', pg_temp.hace(45, '10:00'), pg_temp.hace(33, '18:00')),
  ('50000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001', 'activa', pg_temp.hace(10, '08:30'), null),
  ('50000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000002', 'activa', pg_temp.hace(8, '11:00'), null),
  ('50000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000001', 'activa', pg_temp.hace(5, '16:00'), null),
  ('50000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000003', 'activa', pg_temp.hace(15, '10:00'), null);

-- ───────────── Citas ─────────────
-- La especialidad, la sede y la duración salen del profesional (30 min en Odontología).

insert into public.citas (
  id, paciente_id, profesional_id, especialidad_id, consultorio_id, fecha_hora, duracion_min,
  estado, origen, cupo_origen_id, creada_en, cancelada_en
)
select
  v.id, v.paciente_id, pr.id, pr.especialidad_id, pr.consultorio_id, v.fecha_hora,
  case when pr.especialidad_id = 'e0000000-0000-4000-8000-000000000002' then 30 else 20 end,
  v.estado, coalesce(v.origen, 'agenda'), v.cupo_origen_id,
  coalesce(v.creada_en, v.fecha_hora - interval '20 days'), v.cancelada_en
from (values
  -- Historial de asistencia (alimenta el riesgo ficticio y las métricas).
  ('b0000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid, pg_temp.hace(20, '09:00'), 'asistida', null::text, null::uuid, null::timestamptz, null::timestamptz),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(40, '10:00'), 'inasistencia', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(25, '11:00'), 'inasistencia', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(12, '08:30'), 'asistida', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(30, '09:30'), 'asistida', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(15, '10:00'), 'inasistencia', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', pg_temp.hace(20, '14:00'), 'asistida', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', pg_temp.hace(8, '15:00'), 'asistida', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', pg_temp.hace(18, '09:00'), 'asistida', null, null, null, null),
  -- Citas canceladas que liberaron los cupos históricos.
  ('b0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(2, '10:00'), 'cancelada', null, null, null, pg_temp.hace(3, '08:00')),
  ('b0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(5, '11:00'), 'cancelada', null, null, null, pg_temp.hace(6, '09:00')),
  ('b0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', pg_temp.en(1, '10:30'), 'cancelada', null, null, null, pg_temp.hace(1, '16:00')),
  -- Citas que salieron de esos cupos.
  ('b0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', pg_temp.hace(2, '10:00'), 'asistida', 'cupo_recuperado', 'cc000000-0000-4000-8000-000000000001', pg_temp.hace(3, '08:15'), null),
  ('b0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003', pg_temp.en(1, '10:30'), 'confirmada', 'cupo_recuperado', 'cc000000-0000-4000-8000-000000000003', pg_temp.hace(1, '16:12'), null),
  -- Agenda próxima de la Sede Centro.
  ('b0000000-0000-4000-8000-000000000021', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', pg_temp.en_horario(2), 'programada', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000022', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', pg_temp.en_horario(3), 'confirmada', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000023', 'a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', pg_temp.en(1, '09:00'), 'programada', null, null, null, null),
  -- Ya comenzó (para registrar inasistencia).
  ('b0000000-0000-4000-8000-000000000024', 'a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001', to_timestamp(floor(extract(epoch from now() - interval '30 minutes') / 1800) * 1800), 'programada', null, null, null, null),
  -- Próxima del paciente demo (se puede cancelar).
  ('b0000000-0000-4000-8000-000000000025', 'a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.en(6, '10:00'), 'programada', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000026', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', pg_temp.en(2, '11:00'), 'programada', null, null, null, null),
  -- Agenda próxima de la Sede Norte.
  ('b0000000-0000-4000-8000-000000000031', 'a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000004', pg_temp.en(1, '15:00'), 'programada', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000032', 'a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', pg_temp.en_horario(4), 'confirmada', null, null, null, null),
  -- Se cancelan al final para generar ofertas en vivo.
  ('b0000000-0000-4000-8000-000000000041', 'a0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001', pg_temp.en_horario(4), 'programada', null, null, null, null),
  ('b0000000-0000-4000-8000-000000000042', 'a0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', pg_temp.en_horario(5), 'programada', null, null, null, null)
) as v (id, paciente_id, profesional_id, fecha_hora, estado, origen, cupo_origen_id, creada_en, cancelada_en)
join public.profesionales pr on pr.id = v.profesional_id;

-- ───────────── Cupos y ofertas históricos ─────────────

insert into public.cupos (
  id, cita_origen_id, consultorio_id, profesional_id, especialidad_id, fecha_hora, duracion_min,
  estado, cancelada_por, ronda_actual, cita_asignada_id, creado_en
)
select v.id, c.id, c.consultorio_id, c.profesional_id, c.especialidad_id, c.fecha_hora, c.duracion_min,
       v.estado, v.por, 2, v.asignada, c.cancelada_en
from (values
  ('cc000000-0000-4000-8000-000000000001'::uuid, 'b0000000-0000-4000-8000-000000000010'::uuid, 'asignado', 'paciente', 'b0000000-0000-4000-8000-000000000013'::uuid),
  ('cc000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000011', 'expirado', 'staff', null),
  ('cc000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000012', 'asignado', 'paciente', 'b0000000-0000-4000-8000-000000000014')
) as v (id, cita_origen_id, estado, por, asignada)
join public.citas c on c.id = v.cita_origen_id;

-- El trigger registra los eventos "creada" y de cierre de cada oferta.
insert into public.ofertas (id, cupo_id, consultorio_id, paciente_id, ronda, estado, creada_en, expira_en, respondida_en, explicacion)
select v.id, v.cupo_id, cu.consultorio_id, v.paciente_id, v.ronda, v.estado,
       v.creada_en, v.creada_en + interval '15 minutes',
       v.creada_en + make_interval(mins => v.respondida_tras_min), v.explicacion
from (values
  ('0f000000-0000-4000-8000-000000000001'::uuid, 'cc000000-0000-4000-8000-000000000001'::uuid, 'a0000000-0000-4000-8000-000000000001'::uuid, 1, 'rechazada',
    pg_temp.hace(3, '08:00'), 6,
    pg_temp.explicacion(0.833, 'Llevabas 25 días en la lista de espera de Medicina general.',
      0.92, 'Sede Centro está a unos 1,7 km de tu zona.', 0.5, 'Es tu primera oferta: aún no hay historial.')),
  ('0f000000-0000-4000-8000-000000000002', 'cc000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 2, 'aceptada',
    pg_temp.hace(3, '08:00') + interval '6 minutes', 9,
    pg_temp.explicacion(0.233, 'Llevabas 7 días en la lista de espera de Medicina general.',
      0.84, 'Sede Centro está a unos 3,2 km de tu zona.', 0.5, 'Es tu primera oferta: aún no hay historial.')),
  ('0f000000-0000-4000-8000-000000000003', 'cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 1, 'expirada',
    pg_temp.hace(6, '09:00'), null,
    pg_temp.explicacion(0.733, 'Llevabas 22 días en la lista de espera de Medicina general.',
      0.92, 'Sede Centro está a unos 1,7 km de tu zona.', 0.5, 'Es tu primera oferta: aún no hay historial.')),
  ('0f000000-0000-4000-8000-000000000004', 'cc000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 2, 'rechazada',
    pg_temp.hace(6, '09:00') + interval '15 minutes', 5,
    pg_temp.explicacion(0.133, 'Llevabas 4 días en la lista de espera de Medicina general.',
      0.84, 'Sede Centro está a unos 3,2 km de tu zona.', 0.5, 'Es tu primera oferta: aún no hay historial.')),
  ('0f000000-0000-4000-8000-000000000005', 'cc000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 1, 'rechazada',
    pg_temp.hace(1, '16:00'), 4,
    pg_temp.explicacion(0.233, 'Llevabas 7 días en la lista de espera de Odontología.',
      0.94, 'Sede Norte está a unos 1,2 km de tu zona.', 0.5, 'Es tu primera oferta: aún no hay historial.')),
  ('0f000000-0000-4000-8000-000000000006', 'cc000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 2, 'aceptada',
    pg_temp.hace(1, '16:00') + interval '4 minutes', 8,
    pg_temp.explicacion(0, 'No estabas en la lista de espera de Odontología, pero la marcaste como especialidad de interés.',
      0.52, 'Sede Norte está a unos 9,6 km de tu zona.', 0, 'Aceptaste 0 de tus 2 ofertas anteriores.'))
) as v (id, cupo_id, paciente_id, ronda, estado, creada_en, respondida_tras_min, explicacion)
join public.cupos cu on cu.id = v.cupo_id;

insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, oferta_id, leida, creada_en) values
  ('a0000000-0000-4000-8000-000000000001', 'oferta_expirada', 'Una oferta expiró',
    'No alcanzaste a responder el cupo de Medicina general. Te avisaremos del próximo.',
    '0f000000-0000-4000-8000-000000000003', true, pg_temp.hace(6, '09:15')),
  ('a0000000-0000-4000-8000-000000000001', 'oferta_nueva', 'Nuevo cupo disponible',
    'Se liberó un cupo de Odontología en Sede Norte. Tienes 15 minutos para responder.',
    '0f000000-0000-4000-8000-000000000006', true, pg_temp.hace(1, '16:04')),
  ('a0000000-0000-4000-8000-000000000001', 'cita_confirmada', 'Cita confirmada',
    'Tu cita de Odontología quedó confirmada. La encuentras en Mis citas.',
    '0f000000-0000-4000-8000-000000000006', true, pg_temp.hace(1, '16:12'));

-- ───────────── Riesgo de inasistencia ⚠️ ESTIMACIÓN FICTICIA ─────────────
-- Misma fórmula que src/services/mock/riesgoFicticio.ts. La predicción real es de la Fase 5.

insert into public.riesgo_inasistencia (cita_id, nivel, puntaje, explicacion, recomendacion, fuente)
select
  r.cita_id,
  case when r.puntaje < 0.35 then 'bajo' when r.puntaje < 0.6 then 'medio' else 'alto' end,
  r.puntaje,
  case when r.pasadas = 0 then 'Sin historial de citas anteriores'
       else format('%s %s en sus últimas %s citas', r.inasistencias,
                   case when r.inasistencias = 1 then 'inasistencia' else 'inasistencias' end, r.pasadas)
  end || '; ' || case when r.sin_confirmar then 'la cita aún no está confirmada' else 'la cita está confirmada' end || '.',
  case when r.puntaje < 0.35 then 'Sin acción adicional.'
       when r.puntaje < 0.6 then 'Enviar un recordatorio el día anterior.'
       else 'Llamar para confirmar la asistencia con 24 horas de antelación.' end,
  'estimacion_ficticia'
from (
  select
    c.id as cita_id,
    h.pasadas,
    h.inasistencias,
    c.estado = 'programada' as sin_confirmar,
    round(least(
      0.15
      + 0.55 * (case when h.pasadas = 0 then 0 else h.inasistencias::numeric / h.pasadas end)
      + (case when c.estado = 'programada' then 0.15 else 0 end)
      + (case when h.pasadas = 0 then 0.1 else 0 end),
      1
    ), 2) as puntaje
  from public.citas c
  cross join lateral (
    select
      count(*) filter (where o.estado in ('asistida', 'inasistencia'))::integer as pasadas,
      count(*) filter (where o.estado = 'inasistencia')::integer as inasistencias
    from public.citas o
    where o.paciente_id = c.paciente_id and o.id <> c.id and o.fecha_hora < now()
  ) h
  where c.estado in ('programada', 'confirmada')
) r;

commit;

-- ───────────── Escenario en vivo ─────────────
-- Se cancelan dos citas con las funciones reales del backend: así el seed también
-- ejercita las reglas (cupo idempotente, filtros, puntaje SQL, notificaciones).
--   · Pedro cancela su cita de Medicina general → oferta pendiente para Mariana.
--   · El staff cancela la de Pediatría de Lucía → aviso a Lucía y oferta para Pedro.
select public.ofrecer_siguiente_candidato(private.cancelar_cita_interna('b0000000-0000-4000-8000-000000000041', 'paciente'));
select public.ofrecer_siguiente_candidato(private.cancelar_cita_interna('b0000000-0000-4000-8000-000000000042', 'staff'));
