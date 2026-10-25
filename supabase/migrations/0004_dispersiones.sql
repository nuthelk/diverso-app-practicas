-- =====================================================================
-- Diverso App — dispersión a agencias en MODO PRUEBA (S5, Anexo 8 §3.2)
--
-- Libro de liquidaciones: cada semana (lunes a domingo, hora de Bogotá) se
-- liquida a cada agencia lo que prestó la semana anterior, menos la comisión
-- (agencies.comision_pct) y menos los anticipos ya entregados; las agencias
-- con 10 o más servicios prestados y sin bloqueo reciben además un anticipo
-- del 30 % del neto 48 horas antes de la salida.
--
-- Reglas de dinero (decisión de negocio):
--  * Reserva pagada y luego cancelada con reembolso menor al 100 %: lo NO reembolsado
--    es de la agencia menos la comisión sobre ese monto. Entra como item 'retencion' en la
--    liquidación semanal de la semana de la fecha del servicio, solo cuando el reembolso está
--    resuelto: 'aprobado', o sin fila en refunds (0 %). Reembolso 'pendiente' o 'rechazado':
--    espera a la siguiente corrida (la retención se recoge mientras su fecha sea <= fin de la
--    semana que se liquida). Con anticipo previo, este se descuenta de la retención; si lo
--    supera, la diferencia es un item 'ajuste' negativo. Reembolso del 100 %: se revierte el
--    anticipo ('ajuste') y no se paga nada.
--  * Ninguna liquidación queda colgada: una semanal con monto_a_pagar = 0 nace 'sin_saldo'; una
--    con monto_a_pagar < 0 queda 'pendiente' hasta que la siguiente semanal de la misma agencia
--    la absorbe como item 'saldo_anterior' y pasa a 'compensada' (compensada_en = la nueva).
--  * Los anticipos ignoran reservas creadas hace menos de 1 hora: el cron horario no puede
--    tocar la reserva de una prueba de integración que se borra a los segundos (los items
--    bloquean el borrado de la reserva, ON DELETE RESTRICT).
--
-- NADA MUEVE DINERO REAL: «ejecutar» una liquidación solo la marca
-- pagada_prueba con una referencia PRUEBA-… (Wompi Payouts es otro producto
-- y no está disponible con las llaves de comercio, ver L3).
--
-- Diseño de permisos
--  * El trabajo real lo hacen procesar_liquidaciones / procesar_anticipos
--    (reciben el «ahora» para poder probarse): solo postgres (pg_cron) y
--    service_role. Ningún rol de la API los ejecuta.
--  * generar_liquidaciones / generar_anticipos / ejecutar_liquidacion son
--    los puntos de entrada del panel: authenticated puede llamarlas, pero
--    exigir_admin_o_servicio() rechaza a quien no sea admin o service_role.
--  * La cuenta bancaria de la agencia vive en su propia tabla (nunca en
--    agencies, cuyo select es del catálogo): solo la dueña y el admin.
--  * Segura sobre una BD que ya tiene 0001–0003 (no borra datos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bloqueo de anticipo (lo gestiona el admin)
-- ---------------------------------------------------------------------
alter table public.agencies
  add column anticipo_bloqueado boolean not null default false;

-- La dueña edita su agencia pero no puede bloquearse ni desbloquearse.
create or replace function public.guard_agency_anticipo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.anticipo_bloqueado := case when tg_op = 'UPDATE' then old.anticipo_bloqueado else false end;
  end if;
  return new;
end;
$$;

create trigger agencies_guard_anticipo
  before insert or update on public.agencies
  for each row execute function public.guard_agency_anticipo();

-- ---------------------------------------------------------------------
-- 2. Cuenta para dispersiones (dato financiero personal)
-- ---------------------------------------------------------------------
create table public.agency_payout_accounts (
  id                uuid primary key default gen_random_uuid(),
  agency_id         uuid not null unique references public.agencies(id) on delete cascade,
  banco             text not null check (char_length(btrim(banco)) between 2 and 80),
  tipo_cuenta       text not null check (tipo_cuenta in ('ahorros', 'corriente')),
  numero_cuenta     text not null check (numero_cuenta ~ '^[0-9]{6,20}$'),
  titular           text not null check (char_length(btrim(titular)) between 3 and 120),
  tipo_documento    text not null check (tipo_documento in ('CC', 'CE', 'NIT', 'PP')),
  numero_documento  text not null check (numero_documento ~ '^[0-9A-Za-z-]{4,20}$'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger agency_payout_accounts_touch_updated_at
  before update on public.agency_payout_accounts
  for each row execute function public.touch_updated_at();

alter table public.agency_payout_accounts enable row level security;

create policy payout_accounts_select on public.agency_payout_accounts
  for select to authenticated
  using (public.is_agency_owner(agency_id) or public.is_admin());
create policy payout_accounts_insert on public.agency_payout_accounts
  for insert to authenticated with check (public.is_agency_owner(agency_id));
create policy payout_accounts_update on public.agency_payout_accounts
  for update to authenticated
  using (public.is_agency_owner(agency_id)) with check (public.is_agency_owner(agency_id));

revoke all on public.agency_payout_accounts from anon, authenticated;
grant select, insert, update on public.agency_payout_accounts to authenticated;
grant select, insert, update, delete on public.agency_payout_accounts to service_role;

-- Para listas (panel de la agencia y del admin): solo los 4 últimos dígitos.
-- security_invoker: hereda el RLS de la tabla (dueña y admin).
create view public.cuentas_dispersion_resumen as
select agency_id, banco, tipo_cuenta, right(numero_cuenta, 4) as ultimos4, titular, updated_at
  from public.agency_payout_accounts;
alter view public.cuentas_dispersion_resumen set (security_invoker = true);
revoke all on public.cuentas_dispersion_resumen from anon, authenticated;
grant select on public.cuentas_dispersion_resumen to authenticated;
grant select on public.cuentas_dispersion_resumen to service_role;

-- ---------------------------------------------------------------------
-- 3. Liquidaciones e items
-- ---------------------------------------------------------------------
create table public.liquidaciones (
  id                     uuid primary key default gen_random_uuid(),
  agency_id              uuid not null references public.agencies(id) on delete restrict,
  tipo                   text not null check (tipo in ('semanal', 'anticipo')),
  periodo_inicio         date not null,
  periodo_fin            date not null,
  monto_bruto            numeric(12,2) not null,
  comision               numeric(12,2) not null,
  monto_neto             numeric(12,2) not null,
  anticipos_descontados  numeric(12,2) not null default 0 check (anticipos_descontados >= 0),
  monto_a_pagar          numeric(12,2) not null,
  -- pendiente | pagada_prueba | anulada | compensada (su saldo ≤ 0 pasó a otra liquidación) |
  -- sin_saldo (monto_a_pagar exactamente 0: nada que dispersar).
  estado                 text not null default 'pendiente'
                         check (estado in ('pendiente', 'pagada_prueba', 'anulada', 'compensada', 'sin_saldo')),
  compensada_en          uuid references public.liquidaciones(id) on delete restrict,
  referencia_prueba      text unique,
  ejecutada_at           timestamptz,
  ejecutada_por          uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  check (periodo_fin >= periodo_inicio),
  check (estado <> 'pagada_prueba' or (referencia_prueba is not null and ejecutada_at is not null)),
  check ((estado = 'compensada') = (compensada_en is not null))
);
create index liquidaciones_agency_idx on public.liquidaciones(agency_id, periodo_inicio desc);

-- tipo: servicio (semanal) | anticipo (30 % del neto) | retencion (semanal; lo no reembolsado de una
-- reserva cancelada) | ajuste (semanal; devuelve el anticipo de una reserva reembolsada, o la parte
-- del anticipo que supera la retención; importes negativos) | saldo_anterior (semanal; absorbe una
-- liquidación con saldo ≤ 0: sin reserva, apunta a la liquidación de origen).
create table public.liquidacion_items (
  id                     uuid primary key default gen_random_uuid(),
  liquidacion_id         uuid not null references public.liquidaciones(id) on delete cascade,
  booking_id             uuid references public.bookings(id) on delete restrict,
  tipo                   text not null check (tipo in ('servicio', 'anticipo', 'retencion', 'ajuste', 'saldo_anterior')),
  liquidacion_origen_id  uuid references public.liquidaciones(id) on delete restrict,
  monto_bruto            numeric(12,2) not null,
  comision               numeric(12,2) not null,
  monto_neto             numeric(12,2) not null,
  created_at             timestamptz not null default now(),
  unique (booking_id, tipo),
  check ((tipo = 'saldo_anterior') = (booking_id is null)),
  check ((tipo = 'saldo_anterior') = (liquidacion_origen_id is not null))
);
-- Una liquidación se absorbe una sola vez.
create unique index liquidacion_items_liquidacion_origen_id_key
  on public.liquidacion_items(liquidacion_origen_id) where liquidacion_origen_id is not null;
create index liquidacion_items_liquidacion_idx on public.liquidacion_items(liquidacion_id);

alter table public.liquidaciones enable row level security;
alter table public.liquidacion_items enable row level security;

create policy liquidaciones_select on public.liquidaciones
  for select to authenticated
  using (public.is_agency_owner(agency_id) or public.is_admin());
-- El RLS de liquidaciones también se aplica a esta subconsulta.
create policy liquidacion_items_select on public.liquidacion_items
  for select to authenticated
  using (exists (select 1 from public.liquidaciones l where l.id = liquidacion_id));

revoke all on public.liquidaciones, public.liquidacion_items from anon, authenticated;
grant select on public.liquidaciones, public.liquidacion_items to authenticated;
grant select, insert, update, delete on public.liquidaciones, public.liquidacion_items to service_role;

-- ---------------------------------------------------------------------
-- 4. Funciones
-- ---------------------------------------------------------------------
create or replace function public.exigir_admin_o_servicio()
returns void
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not (public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NO_AUTORIZADO';
  end if;
end;
$$;

-- Servicios prestados = reservas pagadas y vigentes cuya salida ya pasó.
create or replace function public.contar_servicios_prestados(p_agency_id uuid, p_ahora timestamptz default now())
returns int
language sql stable security definer
set search_path = public
as $$
  select count(*)::int
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans pl on pl.id = pd.plan_id
   where pl.agency_id = p_agency_id
     and b.estado in ('confirmada', 'completada')
     and ((pd.fecha + pl.hora_salida) at time zone 'America/Bogota') < p_ahora;
$$;

-- Lo que la dueña (o el admin) ve en el panel: cuántos servicios lleva para el anticipo.
create or replace function public.servicios_prestados(p_agency_id uuid)
returns int
language plpgsql stable security definer
set search_path = public
as $$
begin
  if not (public.is_agency_owner(p_agency_id) or public.is_admin() or coalesce(auth.role(), '') = 'service_role') then
    raise exception 'NO_AUTORIZADO';
  end if;
  return public.contar_servicios_prestados(p_agency_id, now());
end;
$$;

-- Reservas que reciben anticipo: 30 % del neto de cada reserva pagada que sale dentro de las
-- próximas 48 h (salida > ahora y <= ahora + 48 h) y aún no tiene anticipo, de agencias sin bloqueo.
-- Se ignoran las reservas creadas hace menos de 1 hora (ver cabecera).
create or replace function public.candidatos_anticipo(p_ahora timestamptz)
returns table (agency_id uuid, booking_id uuid, fecha date, bruto numeric, comision numeric)
language sql stable security definer
set search_path = public
as $$
  select pl.agency_id, b.id, pd.fecha,
         round(b.monto_total * 0.30, 2),
         round(round(b.monto_total * ag.comision_pct / 100, 2) * 0.30, 2)
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans pl on pl.id = pd.plan_id
    join public.agencies ag on ag.id = pl.agency_id
   where b.estado = 'confirmada'
     and b.created_at <= p_ahora - interval '1 hour'
     and not ag.anticipo_bloqueado
     and exists (select 1 from public.payments p where p.booking_id = b.id and p.estado = 'aprobado')
     and ((pd.fecha + pl.hora_salida) at time zone 'America/Bogota') > p_ahora
     and ((pd.fecha + pl.hora_salida) at time zone 'America/Bogota') <= p_ahora + interval '48 hours'
     and not exists (select 1 from public.liquidacion_items i where i.booking_id = b.id and i.tipo = 'anticipo');
$$;

-- Lo que entra en la liquidación de la semana [p_inicio, p_fin]:
--  servicio:  reserva pagada y vigente cuya fecha cae en la semana y aún no se liquidó;
--  retencion: reserva cancelada con pago y reembolso resuelto (aprobado, o sin fila = 0 %) que dejó
--             dinero retenido; fecha <= p_fin, así lo que esperó un reembolso entra en la corrida siguiente;
--  ajuste:    reembolso del 100 % de una reserva con anticipo (se revierte completo), o la parte del
--             anticipo que supera a la retención (importes negativos).
-- Un pago 'reembolsado' sin fila de reembolso es un dato incoherente: no se liquida.
create or replace function public.candidatos_semana(p_inicio date, p_fin date)
returns table (agency_id uuid, booking_id uuid, tipo text, bruto numeric, comision numeric)
language sql stable security definer
set search_path = public
as $$
  with retenido as (
    select pl.agency_id, b.id as booking_id,
           pay.monto - coalesce(r.monto, 0) as bruto,
           round((pay.monto - coalesce(r.monto, 0)) * ag.comision_pct / 100, 2) as comision
      from public.bookings b
      join public.plan_dates pd on pd.id = b.plan_date_id
      join public.plans pl on pl.id = pd.plan_id
      join public.agencies ag on ag.id = pl.agency_id
      join lateral (select p.monto, p.estado from public.payments p
                     where p.booking_id = b.id and p.estado in ('aprobado', 'reembolsado')
                     order by p.created_at limit 1) pay on true
      left join public.refunds r on r.booking_id = b.id and r.origen = 'cancelacion'
     where b.estado = 'cancelada'
       and pd.fecha <= p_fin
       and ((r.id is null and pay.estado = 'aprobado') or r.estado = 'aprobado')
       and pay.monto - coalesce(r.monto, 0) > 0
       and not exists (select 1 from public.liquidacion_items i
                        where i.booking_id = b.id and i.tipo in ('servicio', 'retencion'))
  )
  select pl.agency_id, b.id, 'servicio'::text, b.monto_total, round(b.monto_total * ag.comision_pct / 100, 2)
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans pl on pl.id = pd.plan_id
    join public.agencies ag on ag.id = pl.agency_id
   where b.estado in ('confirmada', 'completada')
     and pd.fecha between p_inicio and p_fin
     and exists (select 1 from public.payments p where p.booking_id = b.id and p.estado = 'aprobado')
     and not exists (select 1 from public.liquidacion_items i where i.booking_id = b.id and i.tipo = 'servicio')
  union all
  select agency_id, booking_id, 'retencion'::text, bruto, comision from retenido
  union all
  -- anticipo que supera lo retenido: se devuelve la diferencia
  select l.agency_id, ret.booking_id, 'ajuste'::text,
         -(i.monto_bruto - ret.bruto), -(i.comision - ret.comision)
    from retenido ret
    join public.liquidacion_items i on i.booking_id = ret.booking_id and i.tipo = 'anticipo'
    join public.liquidaciones l on l.id = i.liquidacion_id and l.estado <> 'anulada'
   where i.monto_neto > ret.bruto - ret.comision
     and not exists (select 1 from public.liquidacion_items j where j.booking_id = ret.booking_id and j.tipo = 'ajuste')
  union all
  -- reembolso del 100 %: se revierte el anticipo completo
  select l.agency_id, b.id, 'ajuste'::text, -i.monto_bruto, -i.comision
    from public.liquidacion_items i
    join public.liquidaciones l on l.id = i.liquidacion_id and l.estado <> 'anulada'
    join public.bookings b on b.id = i.booking_id
   where i.tipo = 'anticipo'
     and b.estado = 'cancelada'
     and exists (select 1 from public.refunds r
                  where r.booking_id = b.id and r.origen = 'cancelacion'
                    and r.porcentaje = 100 and r.estado <> 'rechazado')
     and not exists (select 1 from public.liquidacion_items j where j.booking_id = b.id and j.tipo = 'ajuste');
$$;

-- Anticipos para agencias con >= 10 servicios prestados. Idempotente: unique (booking_id, tipo).
create or replace function public.procesar_anticipos(p_ahora timestamptz default now())
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  c_min_servicios constant int := 10;
  a record;
  v_liq uuid;
  v_n int;
  v_liquidaciones int := 0;
  v_items int := 0;
begin
  perform pg_advisory_xact_lock(hashtext('diverso.liquidaciones'));

  for a in
    select distinct c.agency_id from public.candidatos_anticipo(p_ahora) c
     where public.contar_servicios_prestados(c.agency_id, p_ahora) >= c_min_servicios
  loop
    insert into public.liquidaciones (agency_id, tipo, periodo_inicio, periodo_fin,
                                      monto_bruto, comision, monto_neto, monto_a_pagar)
    select c.agency_id, 'anticipo', min(c.fecha), max(c.fecha),
           sum(c.bruto), sum(c.comision), sum(c.bruto - c.comision), sum(c.bruto - c.comision)
      from public.candidatos_anticipo(p_ahora) c where c.agency_id = a.agency_id
     group by c.agency_id
    returning id into v_liq;

    insert into public.liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto)
    select v_liq, c.booking_id, 'anticipo', c.bruto, c.comision, c.bruto - c.comision
      from public.candidatos_anticipo(p_ahora) c where c.agency_id = a.agency_id;
    get diagnostics v_n = row_count;

    v_liquidaciones := v_liquidaciones + 1;
    v_items := v_items + v_n;
  end loop;

  return json_build_object('liquidaciones', v_liquidaciones, 'items', v_items);
end;
$$;

-- Liquidación semanal de la semana lunes–domingo (Bogotá) que contiene p_semana
-- (sin fecha: la semana anterior a la de p_ahora). Idempotente: unique (booking_id, tipo).
create or replace function public.procesar_liquidaciones(p_semana date default null, p_ahora timestamptz default now())
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (p_ahora at time zone 'America/Bogota')::date;
  v_inicio date;
  v_fin date;
  a record;
  v_liq uuid;
  v_n int;
  v_c int;
  v_liquidaciones int := 0;
  v_items int := 0;
begin
  v_inicio := date_trunc('week', coalesce(p_semana, v_hoy - 7)::timestamp)::date;
  v_fin := v_inicio + 6;
  if v_fin >= v_hoy then
    raise exception 'SEMANA_NO_TERMINADA';
  end if;

  perform pg_advisory_xact_lock(hashtext('diverso.liquidaciones'));

  -- Solo hay liquidación si la agencia prestó servicios o tiene dinero retenido por cobrar;
  -- sus ajustes pendientes y su saldo anterior ≤ 0 viajan con ella.
  for a in
    select distinct c.agency_id from public.candidatos_semana(v_inicio, v_fin) c where c.tipo in ('servicio', 'retencion')
  loop
    insert into public.liquidaciones (agency_id, tipo, periodo_inicio, periodo_fin,
                                      monto_bruto, comision, monto_neto, monto_a_pagar)
    values (a.agency_id, 'semanal', v_inicio, v_fin, 0, 0, 0, 0)
    returning id into v_liq;

    insert into public.liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto)
    select v_liq, c.booking_id, c.tipo, c.bruto, c.comision, c.bruto - c.comision
      from public.candidatos_semana(v_inicio, v_fin) c where c.agency_id = a.agency_id;
    get diagnostics v_n = row_count;

    -- Saldo anterior: las semanales pendientes de esta agencia con monto_a_pagar <= 0 (de semanas
    -- anteriores) se absorben como un item y quedan 'compensada'.
    with absorbidas as (
      update public.liquidaciones p
         set estado = 'compensada', compensada_en = v_liq
       where p.agency_id = a.agency_id and p.tipo = 'semanal' and p.estado = 'pendiente'
         and p.monto_a_pagar <= 0 and p.periodo_fin < v_inicio
      returning p.id, p.monto_a_pagar
    )
    insert into public.liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto, liquidacion_origen_id)
    select v_liq, null, 'saldo_anterior', ab.monto_a_pagar, 0, ab.monto_a_pagar, ab.id from absorbidas ab;
    get diagnostics v_c = row_count;
    v_n := v_n + v_c;

    -- Totales = suma de items. Se descuenta el anticipo de cada reserva liquidada, hasta lo que
    -- esa reserva aporta (si el anticipo la supera, el exceso ya viene como item 'ajuste').
    -- monto_a_pagar = 0 no es una liquidación por ejecutar: queda 'sin_saldo'.
    update public.liquidaciones l
       set monto_bruto = t.bruto,
           comision = t.comision,
           monto_neto = t.neto,
           anticipos_descontados = d.descontado,
           monto_a_pagar = t.neto - d.descontado,
           estado = case when t.neto - d.descontado = 0 then 'sin_saldo' else 'pendiente' end
      from (select sum(monto_bruto) bruto, sum(comision) comision, sum(monto_neto) neto
              from public.liquidacion_items where liquidacion_id = v_liq) t,
           (select coalesce(sum(least(ant.monto_neto, s.monto_neto)), 0) descontado
              from public.liquidacion_items s
              join public.liquidacion_items ant on ant.booking_id = s.booking_id and ant.tipo = 'anticipo'
              join public.liquidaciones la on la.id = ant.liquidacion_id and la.estado <> 'anulada'
             where s.liquidacion_id = v_liq and s.tipo in ('servicio', 'retencion')) d
     where l.id = v_liq;

    v_liquidaciones := v_liquidaciones + 1;
    v_items := v_items + v_n;
  end loop;

  return json_build_object('periodo_inicio', v_inicio, 'periodo_fin', v_fin,
                           'liquidaciones', v_liquidaciones, 'items', v_items);
end;
$$;

-- Puntos de entrada del panel (admin) y de service_role.
create or replace function public.generar_liquidaciones(p_semana date default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin_o_servicio();
  return public.procesar_liquidaciones(p_semana, now());
end;
$$;

create or replace function public.generar_anticipos()
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.exigir_admin_o_servicio();
  return public.procesar_anticipos(now());
end;
$$;

-- «Dispersión de prueba»: marca la liquidación como pagada_prueba. No mueve dinero.
create or replace function public.ejecutar_liquidacion(p_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.liquidaciones;
  v_ref text;
begin
  perform public.exigir_admin_o_servicio();

  select * into l from public.liquidaciones where id = p_id for update;
  if l.id is null then
    raise exception 'LIQUIDACION_NO_EXISTE';
  end if;
  if l.estado <> 'pendiente' then
    raise exception 'LIQUIDACION_NO_PENDIENTE';
  end if;
  if not exists (select 1 from public.agency_payout_accounts where agency_id = l.agency_id) then
    raise exception 'CUENTA_NO_REGISTRADA';
  end if;
  if l.monto_a_pagar <= 0 then
    raise exception 'MONTO_NO_POSITIVO';
  end if;

  v_ref := 'PRUEBA-' || to_char(now() at time zone 'America/Bogota', 'YYYYMMDD') || '-'
           || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  update public.liquidaciones
     set estado = 'pagada_prueba', referencia_prueba = v_ref, ejecutada_at = now(), ejecutada_por = auth.uid()
   where id = l.id;

  return json_build_object('id', l.id, 'estado', 'pagada_prueba', 'referencia_prueba', v_ref,
                           'monto_a_pagar', l.monto_a_pagar);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------
-- Supabase concede EXECUTE a anon/authenticated por defecto en public: se revoca
-- explícitamente además de PUBLIC.
revoke all on function public.guard_agency_anticipo() from public, anon, authenticated;
revoke all on function public.exigir_admin_o_servicio() from public, anon, authenticated;
revoke all on function public.contar_servicios_prestados(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.candidatos_anticipo(timestamptz) from public, anon, authenticated;
revoke all on function public.candidatos_semana(date, date) from public, anon, authenticated;
revoke all on function public.procesar_anticipos(timestamptz) from public, anon, authenticated;
revoke all on function public.procesar_liquidaciones(date, timestamptz) from public, anon, authenticated;
revoke all on function public.servicios_prestados(uuid) from public, anon;
revoke all on function public.generar_liquidaciones(date) from public, anon;
revoke all on function public.generar_anticipos() from public, anon;
revoke all on function public.ejecutar_liquidacion(uuid) from public, anon;

grant execute on function public.exigir_admin_o_servicio() to service_role;
grant execute on function public.contar_servicios_prestados(uuid, timestamptz) to service_role;
grant execute on function public.candidatos_anticipo(timestamptz) to service_role;
grant execute on function public.candidatos_semana(date, date) to service_role;
grant execute on function public.procesar_anticipos(timestamptz) to service_role;
grant execute on function public.procesar_liquidaciones(date, timestamptz) to service_role;
grant execute on function public.servicios_prestados(uuid) to authenticated, service_role;
grant execute on function public.generar_liquidaciones(date) to authenticated, service_role;
grant execute on function public.generar_anticipos() to authenticated, service_role;
grant execute on function public.ejecutar_liquidacion(uuid) to authenticated, service_role;

-- La app dejó de llamar expire_stale_bookings() (cca3e1a): el vencimiento corre por pg_cron
-- (postgres) y nadie desde la API necesita ejecutarlo.
revoke all on function public.expire_stale_bookings() from public, anon, authenticated;
grant execute on function public.expire_stale_bookings() to service_role;

-- ---------------------------------------------------------------------
-- 6. Programación (pg_cron): lunes 06:00 Bogotá = 11:00 UTC; anticipos cada hora
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('liquidacion-semanal', '0 11 * * 1', 'select public.procesar_liquidaciones(null)');
    perform cron.schedule('anticipos-por-hora', '0 * * * *', 'select public.procesar_anticipos()');
  else
    raise warning 'pg_cron no está disponible: programa procesar_liquidaciones(null) los lunes 11:00 UTC y procesar_anticipos() cada hora';
  end if;
end $$;
