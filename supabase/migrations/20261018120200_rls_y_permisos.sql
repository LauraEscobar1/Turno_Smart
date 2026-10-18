-- ════════════════════════════════════════════════════════════════════════════
-- TurnoSmart · Fase 3 · 3/6 — RLS y permisos
-- ════════════════════════════════════════════════════════════════════════════
-- Dos capas:
--   1. GRANT: el cliente (authenticated) solo puede LEER tablas. La única escritura
--      directa es marcar notificaciones como leídas. Todo cambio de estado pasa por
--      RPC (SECURITY DEFINER), así que nadie inserta ofertas ni elige destinatarios.
--   2. RLS: cada fila visible solo para su dueño (paciente) o su consultorio (staff).
-- anon no ve nada: la app exige sesión.

-- ───────────── Funciones auxiliares de las políticas ─────────────
-- SECURITY DEFINER para leer perfiles sin recursión de RLS. `(select …)` en las
-- políticas hace que Postgres las evalúe una vez por consulta, no por fila.

create function private.consultorio_del_staff()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.consultorio_id
  from public.perfiles p
  where p.id = (select auth.uid()) and p.rol = 'staff';
$$;
comment on function private.consultorio_del_staff() is 'Consultorio del staff autenticado; null para pacientes.';

-- ───────────── Activar RLS en TODAS las tablas ─────────────

alter table public.consultorios enable row level security;
alter table public.especialidades enable row level security;
alter table public.profesionales enable row level security;
alter table public.perfiles enable row level security;
alter table public.preferencias_paciente enable row level security;
alter table public.preferencias_especialidades enable row level security;
alter table public.franjas_horarias enable row level security;
alter table public.solicitudes_espera enable row level security;
alter table public.citas enable row level security;
alter table public.cupos enable row level security;
alter table public.ofertas enable row level security;
alter table public.eventos_oferta enable row level security;
alter table public.notificaciones enable row level security;
alter table public.priorizaciones enable row level security;
alter table public.priorizacion_candidatos enable row level security;
alter table public.riesgo_inasistencia enable row level security;

-- ───────────── Privilegios de tabla ─────────────
-- Supabase concede ALL (incluido TRUNCATE, que ignora RLS) a anon y authenticated
-- por defecto. Se retira todo y se concede solo lectura.

revoke all on all tables in schema public from anon, authenticated;
grant select on all tables in schema public to authenticated;
grant update (leida) on public.notificaciones to authenticated;

-- ───────────── Catálogo: visible para cualquier usuario autenticado ─────────────

create policy "Catálogo visible con sesión" on public.consultorios
  for select to authenticated using (true);
create policy "Catálogo visible con sesión" on public.especialidades
  for select to authenticated using (true);
create policy "Catálogo visible con sesión" on public.profesionales
  for select to authenticated using (true);

-- ───────────── Perfiles: cada quien el suyo ─────────────
-- El staff NO lee perfiles de pacientes: usa referencias_pacientes() (iniciales y código).

create policy "Cada usuario ve su perfil" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));

-- ───────────── Preferencias y lista de espera: solo el paciente ─────────────

create policy "Paciente ve sus preferencias" on public.preferencias_paciente
  for select to authenticated using (paciente_id = (select auth.uid()));
create policy "Paciente ve sus especialidades de interés" on public.preferencias_especialidades
  for select to authenticated using (paciente_id = (select auth.uid()));
create policy "Paciente ve sus franjas" on public.franjas_horarias
  for select to authenticated using (paciente_id = (select auth.uid()));
create policy "Paciente ve sus solicitudes" on public.solicitudes_espera
  for select to authenticated using (paciente_id = (select auth.uid()));

-- ───────────── Citas ─────────────

create policy "Paciente ve sus citas" on public.citas
  for select to authenticated using (paciente_id = (select auth.uid()));
create policy "Staff ve las citas de su consultorio" on public.citas
  for select to authenticated using (consultorio_id = (select private.consultorio_del_staff()));

-- ───────────── Cupos ─────────────

create policy "Staff ve los cupos de su consultorio" on public.cupos
  for select to authenticated using (consultorio_id = (select private.consultorio_del_staff()));
-- El paciente ve un cupo si se lo ofrecieron o si lo liberó su cita cancelada.
create policy "Paciente ve los cupos que le conciernen" on public.cupos
  for select to authenticated using (
    exists (
      select 1 from public.ofertas o
      where o.cupo_id = cupos.id and o.paciente_id = (select auth.uid())
    )
    or exists (
      select 1 from public.citas c
      where c.id = cupos.cita_origen_id and c.paciente_id = (select auth.uid())
    )
  );

-- ───────────── Ofertas y su línea de tiempo ─────────────

create policy "Paciente ve sus ofertas" on public.ofertas
  for select to authenticated using (paciente_id = (select auth.uid()));
create policy "Staff ve las ofertas de su consultorio" on public.ofertas
  for select to authenticated using (consultorio_id = (select private.consultorio_del_staff()));

create policy "Staff ve los eventos de su consultorio" on public.eventos_oferta
  for select to authenticated using (consultorio_id = (select private.consultorio_del_staff()));

-- ───────────── Notificaciones ─────────────

create policy "Usuario ve sus notificaciones" on public.notificaciones
  for select to authenticated using (usuario_id = (select auth.uid()));
-- Solo puede marcarlas como leídas (el GRANT limita la columna a `leida`).
create policy "Usuario marca sus notificaciones como leídas" on public.notificaciones
  for update to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()) and leida);

-- ───────────── Auditoría de priorización y riesgo: solo el staff del consultorio ─────────────

create policy "Staff ve las priorizaciones de su consultorio" on public.priorizaciones
  for select to authenticated using (consultorio_id = (select private.consultorio_del_staff()));
create policy "Staff ve los candidatos evaluados en su consultorio" on public.priorizacion_candidatos
  for select to authenticated using (
    exists (
      select 1 from public.priorizaciones p
      where p.id = priorizacion_candidatos.priorizacion_id
        and p.consultorio_id = (select private.consultorio_del_staff())
    )
  );

create policy "Staff ve el riesgo de las citas de su consultorio" on public.riesgo_inasistencia
  for select to authenticated using (
    exists (
      select 1 from public.citas c
      where c.id = riesgo_inasistencia.cita_id
        and c.consultorio_id = (select private.consultorio_del_staff())
    )
  );

-- ───────────── Funciones privadas ─────────────
-- Postgres concede EXECUTE a PUBLIC por defecto: se retira y se concede lo mínimo.
-- Las políticas se evalúan como `authenticated`; las restricciones CHECK, como quien escribe.

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on all functions in schema private to service_role;
grant execute on function private.consultorio_del_staff() to authenticated;
grant execute on function private.explicacion_valida(jsonb) to authenticated;
