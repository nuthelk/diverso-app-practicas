-- =====================================================================
-- Diverso App — 0002: verificación activa de agencias y cumplimiento
--
-- 1. Vigencia del RNT y trazabilidad de la verificación (quién, cuándo,
--    hasta cuándo, motivo de rechazo) con historial auditable.
-- 2. Re-verificación obligatoria si una agencia verificada cambia su RNT
--    o su matrícula mercantil (el sello no se puede "heredar").
-- 3. Una agencia solo vende si está verificada Y con RNT vigente; esto se
--    aplica en la visibilidad del catálogo, en la publicación de planes y
--    en la propia RPC de reserva (no solo en la interfaz).
-- 4. Autorización expresa de tratamiento de datos (Ley 1581 de 2012) y
--    aceptación de términos, con evidencia: versión, fecha y usuario.
--
-- Supuesto de negocio: el RNT se renueva una vez al año; por defecto la
-- vigencia que registra el administrador es el 31 de marzo del año
-- siguiente. Debe confirmarse con la normativa vigente del MinCIT.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas de verificación en agencies
-- ---------------------------------------------------------------------
alter table public.agencies
  add column if not exists rnt_vigente_hasta date,
  add column if not exists verificado_at     timestamptz,
  add column if not exists verificado_por    uuid references public.profiles(id) on delete set null,
  add column if not exists motivo_rechazo    text;

-- Formato básico: el RNT y la matrícula son numéricos (se admiten guiones
-- y espacios en la matrícula). NOT VALID para no romper datos previos.
alter table public.agencies
  add constraint agencies_rnt_formato
  check (numero_rnt ~ '^[0-9]{4,8}$') not valid;
alter table public.agencies
  add constraint agencies_matricula_formato
  check (matricula_camara_comercio ~ '^[0-9][0-9 -]{3,19}$') not valid;

-- Historial de verificación (auditoría) -------------------------------
create type public.verification_action as enum
  ('registrada', 'verificada', 'rechazada', 'reverificacion_requerida', 'vigencia_actualizada');

create table public.agency_verification_log (
  id            uuid primary key default gen_random_uuid(),
  agency_id     uuid not null references public.agencies(id) on delete cascade,
  accion        public.verification_action not null,
  numero_rnt    text not null,
  matricula     text not null,
  vigente_hasta date,
  motivo        text,
  actor_id      uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index agency_verification_log_agency_idx
  on public.agency_verification_log(agency_id, created_at desc);

alter table public.agency_verification_log enable row level security;
create policy verification_log_select on public.agency_verification_log
  for select to authenticated
  using (public.is_admin() or public.is_agency_owner(agency_id));
-- Sin políticas de escritura: solo los triggers (security definer) insertan.

-- ---------------------------------------------------------------------
-- 2. ¿Puede vender la agencia? (verificada y con RNT vigente)
-- ---------------------------------------------------------------------
create or replace function public.agencia_habilitada(p_agency_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies
     where id = p_agency_id
       and estado_verificacion = 'verificado'
       and rnt_vigente_hasta is not null
       and rnt_vigente_hasta >= current_date
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Guardia de verificación (reemplaza la de 0001)
-- ---------------------------------------------------------------------
create or replace function public.guard_agency_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin boolean := public.is_admin();
begin
  -- Usuarios que no son administradores: no pueden tocar los campos de
  -- verificación ni la comisión.
  if auth.uid() is not null and not v_admin then
    new.estado_verificacion := old.estado_verificacion;
    new.comision_pct        := old.comision_pct;
    new.rnt_vigente_hasta   := old.rnt_vigente_hasta;
    new.verificado_at       := old.verificado_at;
    new.verificado_por      := old.verificado_por;
    new.motivo_rechazo      := old.motivo_rechazo;

    -- Cambiar los datos que respaldan el sello obliga a re-verificar.
    if (new.numero_rnt is distinct from old.numero_rnt
        or new.matricula_camara_comercio is distinct from old.matricula_camara_comercio)
       and old.estado_verificacion <> 'pendiente' then
      new.estado_verificacion := 'pendiente';
      new.verificado_at       := null;
      new.verificado_por      := null;
      new.rnt_vigente_hasta   := null;
      new.motivo_rechazo      := null;
    end if;
    return new;
  end if;

  -- Administrador (o proceso de servidor sin sesión).
  if new.estado_verificacion = 'verificado'
     and (old.estado_verificacion is distinct from 'verificado'
          or new.rnt_vigente_hasta is distinct from old.rnt_vigente_hasta) then
    if new.rnt_vigente_hasta is null then
      raise exception 'VIGENCIA_RNT_REQUERIDA';
    end if;
    if new.rnt_vigente_hasta < current_date then
      raise exception 'VIGENCIA_RNT_VENCIDA';
    end if;
    new.verificado_at  := now();
    new.verificado_por := auth.uid();
    new.motivo_rechazo := null;
  elsif new.estado_verificacion = 'rechazado'
        and old.estado_verificacion is distinct from 'rechazado' then
    if coalesce(btrim(new.motivo_rechazo), '') = '' then
      raise exception 'MOTIVO_RECHAZO_REQUERIDO';
    end if;
    new.verificado_at  := null;
    new.verificado_por := null;
  end if;
  return new;
end;
$$;

-- Registro en el historial (después de guardar el cambio) --------------
create or replace function public.log_agency_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion public.verification_action;
begin
  if tg_op = 'INSERT' then
    v_accion := 'registrada';
  elsif new.estado_verificacion is distinct from old.estado_verificacion then
    v_accion := case new.estado_verificacion
                  when 'verificado' then 'verificada'
                  when 'rechazado'  then 'rechazada'
                  else 'reverificacion_requerida'
                end;
  elsif new.rnt_vigente_hasta is distinct from old.rnt_vigente_hasta then
    v_accion := 'vigencia_actualizada';
  else
    return new;
  end if;

  insert into public.agency_verification_log
    (agency_id, accion, numero_rnt, matricula, vigente_hasta, motivo, actor_id)
  values
    (new.id, v_accion, new.numero_rnt, new.matricula_camara_comercio,
     new.rnt_vigente_hasta, new.motivo_rechazo, auth.uid());
  return new;
end;
$$;

create trigger agencies_log_verification
  after insert or update on public.agencies
  for each row execute function public.log_agency_verification();

-- ---------------------------------------------------------------------
-- 4. Publicación y visibilidad condicionadas a agencia habilitada
-- ---------------------------------------------------------------------
create or replace function public.guard_plan_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.verification_status;
  v_vigencia date;
begin
  if new.estado = 'publicado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'publicado') then
    select estado_verificacion, rnt_vigente_hasta into v_estado, v_vigencia
      from public.agencies where id = new.agency_id;
    if v_estado is distinct from 'verificado' then
      raise exception 'AGENCIA_NO_VERIFICADA';
    end if;
    if v_vigencia is null or v_vigencia < current_date then
      raise exception 'RNT_VENCIDO';
    end if;
  end if;
  return new;
end;
$$;

-- El viajero solo ve planes de agencias habilitadas; la agencia dueña y
-- el admin siguen viendo todo lo suyo.
drop policy if exists plans_select_published on public.plans;
create policy plans_select_published on public.plans
  for select to authenticated
  using (
    (estado = 'publicado' and public.agencia_habilitada(agency_id))
    or public.is_agency_owner(agency_id)
    or public.is_admin()
  );

drop policy if exists plan_dates_select_visible on public.plan_dates;
create policy plan_dates_select_visible on public.plan_dates
  for select to authenticated
  using (
    exists (select 1 from public.plans p
             where p.id = plan_id
               and ((p.estado = 'publicado' and public.agencia_habilitada(p.agency_id))
                    or public.is_agency_owner(p.agency_id) or public.is_admin()))
  );

-- ---------------------------------------------------------------------
-- 5. Reserva: además del cupo, exige plan publicado, fecha futura y
--    agencia habilitada (antes la RPC no lo comprobaba).
-- ---------------------------------------------------------------------
create or replace function public.create_booking(p_plan_date_id uuid, p_pax int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viajero uuid := auth.uid();
  v_fecha date;
  v_cupo int;
  v_plan record;
  v_booking_id uuid;
  v_codigo text;
begin
  if v_viajero is null then
    raise exception 'NO_AUTENTICADO';
  end if;
  if p_pax is null or p_pax < 1 or p_pax > 20 then
    raise exception 'PAX_INVALIDO';
  end if;

  -- Decremento atómico condicional: la fila solo se actualiza si hay cupo
  -- y el plan es vendible; dos reservas simultáneas no pueden sobrevender.
  update public.plan_dates pd
     set cupo_disponible = pd.cupo_disponible - p_pax
   where pd.id = p_plan_date_id
     and pd.cupo_disponible >= p_pax
     and pd.fecha >= current_date
     and exists (select 1 from public.plans p
                  where p.id = pd.plan_id
                    and p.estado = 'publicado'
                    and public.agencia_habilitada(p.agency_id))
  returning pd.fecha, pd.cupo_disponible into v_fecha, v_cupo;

  if not found then
    select pd.fecha, p.id, p.estado, p.agency_id
      into v_plan
      from public.plan_dates pd
      join public.plans p on p.id = pd.plan_id
     where pd.id = p_plan_date_id;
    if v_plan.id is null then
      raise exception 'FECHA_NO_EXISTE';
    elsif v_plan.estado <> 'publicado' then
      raise exception 'PLAN_NO_PUBLICADO';
    elsif not public.agencia_habilitada(v_plan.agency_id) then
      raise exception 'AGENCIA_NO_HABILITADA';
    elsif v_plan.fecha < current_date then
      raise exception 'FECHA_PASADA';
    else
      raise exception 'SIN_CUPO';
    end if;
  end if;

  select p.id, p.titulo, p.precio_cop into v_plan
    from public.plan_dates pd
    join public.plans p on p.id = pd.plan_id
   where pd.id = p_plan_date_id;

  v_codigo := 'DIV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values (v_codigo, p_plan_date_id, v_viajero, p_pax, v_plan.precio_cop * p_pax, 'pendiente_pago')
  returning id into v_booking_id;

  return json_build_object(
    'booking_id', v_booking_id,
    'codigo', v_codigo,
    'monto_total', v_plan.precio_cop * p_pax,
    'plan_titulo', v_plan.titulo,
    'fecha', v_fecha,
    'cupos_restantes', v_cupo
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Consentimientos (Ley 1581 de 2012): autorización previa, expresa e
--    informada, con prueba conservada (versión, fecha, usuario).
-- ---------------------------------------------------------------------
create type public.consent_type as enum ('tratamiento_datos', 'terminos_viajero', 'terminos_agencia');

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  tipo         public.consent_type not null,
  version      text not null,
  aceptado_at  timestamptz not null default now(),
  origen       text not null default 'app',
  unique (user_id, tipo, version)
);
create index consents_user_idx on public.consents(user_id);

alter table public.consents enable row level security;
create policy consents_select_own on public.consents
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
-- Escritura solo mediante registrar_consentimiento() o el registro.

-- Versión vigente de los documentos legales (cambiarla exige re-aceptar).
create or replace function public.version_documentos_legales()
returns text language sql immutable as $$ select 'v1-2026-10'::text $$;

create or replace function public.registrar_consentimiento(
  p_tipo public.consent_type,
  p_version text,
  p_origen text default 'app'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NO_AUTENTICADO';
  end if;
  if p_version is distinct from public.version_documentos_legales() then
    raise exception 'VERSION_DESACTUALIZADA';
  end if;
  insert into public.consents (user_id, tipo, version, origen)
  values (auth.uid(), p_tipo, p_version, coalesce(nullif(p_origen, ''), 'app'))
  on conflict (user_id, tipo, version) do nothing;
end;
$$;

-- ¿Le falta al usuario actual aceptar algún documento vigente?
create or replace function public.consentimientos_pendientes()
returns public.consent_type[]
language sql stable security definer
set search_path = public
as $$
  select coalesce(array_agg(t), '{}')
    from (
      select unnest(case p.rol
                      when 'agencia' then array['tratamiento_datos','terminos_agencia']::public.consent_type[]
                      when 'viajero' then array['tratamiento_datos','terminos_viajero']::public.consent_type[]
                      else array[]::public.consent_type[]
                    end) as t
        from public.profiles p
       where p.id = auth.uid()
    ) req
   where not exists (select 1 from public.consents c
                      where c.user_id = auth.uid()
                        and c.tipo = req.t
                        and c.version = public.version_documentos_legales());
$$;

-- El registro desde la app envía la aceptación en los metadatos; se guarda
-- como evidencia en la misma transacción que crea el perfil.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
  v_version text;
begin
  v_rol := coalesce(new.raw_user_meta_data->>'rol', 'viajero');
  -- Nadie se registra como admin desde el cliente.
  if v_rol not in ('viajero', 'agencia') then
    v_rol := 'viajero';
  end if;
  if new.raw_app_meta_data->>'rol' = 'admin' then
    v_rol := 'admin';
  end if;

  insert into public.profiles (id, rol, nombre, telefono)
  values (new.id, v_rol::public.user_role,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'telefono');

  v_version := new.raw_user_meta_data->>'consentimiento_version';
  if v_version is not null and v_version = public.version_documentos_legales() then
    insert into public.consents (user_id, tipo, version, origen)
    values (new.id, 'tratamiento_datos', v_version, 'registro'),
           (new.id, case when v_rol = 'agencia' then 'terminos_agencia'::public.consent_type
                         else 'terminos_viajero'::public.consent_type end,
            v_version, 'registro')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

grant execute on function public.registrar_consentimiento(public.consent_type, text, text) to authenticated;
grant execute on function public.consentimientos_pendientes() to authenticated;
grant execute on function public.version_documentos_legales() to anon, authenticated;
grant execute on function public.agencia_habilitada(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Visibilidad de agencias: el viajero solo ve agencias habilitadas
--    (antes cualquier usuario veía correos y teléfonos de agencias
--    pendientes o rechazadas). Dueño y admin conservan acceso completo.
-- ---------------------------------------------------------------------
drop policy if exists agencies_select_all on public.agencies;
create policy agencies_select_visible on public.agencies
  for select to authenticated
  using (public.agencia_habilitada(id) or owner_user_id = auth.uid() or public.is_admin());
