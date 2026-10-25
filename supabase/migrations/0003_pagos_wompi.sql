-- =====================================================================
-- Diverso App — pagos con Wompi (SANDBOX), reembolsos por política y
-- vencimiento programado de reservas.
--
-- Diseño (resumen):
--  * El viajero NUNCA confirma ni cancela con dinero de por medio desde el
--    cliente. Las funciones que mueven pagos/reembolsos son SOLO de
--    service_role y las llaman las Edge Functions (pagos-iniciar,
--    pagos-verificar, pagos-webhook, reservas-cancelar) tras validar el JWT.
--  * confirm_payment y cancel_booking (0001) se ELIMINAN: eran el atajo
--    para marcar una reserva como pagada o cancelar sin política.
--  * La política de cancelación pasa de texto libre a columnas que el
--    panel de agencias edita (T4); el texto se conserva para mostrarse.
--  * Segura sobre una BD que ya tiene 0001 y 0002 (no borra datos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Enums: métodos que Wompi ofrece y la app aún no tenía
-- ---------------------------------------------------------------------
alter type public.payment_method add value if not exists 'bancolombia';
-- Cualquier otro método de Wompi (p. ej. PCOL, SU_PLUS): un cobro ya
-- aprobado nunca debe fallar por no tener equivalente en el enum.
alter type public.payment_method add value if not exists 'otro';

-- ---------------------------------------------------------------------
-- 2. Política de cancelación estructurada
-- ---------------------------------------------------------------------
-- >= horas_cancelacion_gratuita antes de la salida → 100 %
-- >= horas_reembolso_parcial    antes de la salida → porcentaje_reembolso_parcial
-- en otro caso                                      → sin reembolso
alter table public.plans
  add column horas_cancelacion_gratuita   int  not null default 48 check (horas_cancelacion_gratuita > 0),
  add column horas_reembolso_parcial      int  check (horas_reembolso_parcial >= 0),
  add column porcentaje_reembolso_parcial int  check (porcentaje_reembolso_parcial between 0 and 100),
  add column hora_salida                  time not null default '06:00',
  add constraint plans_politica_parcial_coherente check (
    (horas_reembolso_parcial is null) = (porcentaje_reembolso_parcial is null)
    and (horas_reembolso_parcial is null or horas_reembolso_parcial < horas_cancelacion_gratuita)
  );

-- Rellena las columnas nuevas leyendo el texto de política y la primera
-- hora del itinerario. La invoca esta migración (BD existente) y seed.sql
-- (BD nueva, donde los planes se crean después de migrar). Solo para
-- carga inicial: no se concede a ningún rol de la API.
create or replace function public.aplicar_politica_desde_texto()
returns int
language plpgsql
set search_path = public
as $$
declare
  v_n int;
begin
  with leido as (
    select p.id,
           (regexp_match(p.politica_cancelacion, 'gratuita hasta (\d+) (horas|días)'))        as libre,
           (regexp_match(p.politica_cancelacion, 'Entre \d+ y (\d+) (horas|días)'))           as entre,
           (regexp_match(p.politica_cancelacion, 'Menos de \d+ (?:horas|días): (\d+)\s?%'))   as menos,
           (regexp_match(p.politica_cancelacion, '(\d+)\s?%'))                                as pct,
           (regexp_match(coalesce(p.itinerario->0->>'hora', ''), '(\d{1,2}):(\d{2})'))        as salida
      from public.plans p
  ), calculado as (
    select id,
           case when libre is not null
                then libre[1]::int * case libre[2] when 'días' then 24 else 1 end end as libre_h,
           case when entre is not null
                then entre[1]::int * case entre[2] when 'días' then 24 else 1 end
                when menos is not null then 0 end                                    as parcial_h,
           case when entre is not null or menos is not null then pct[1]::int end     as parcial_pct,
           case when salida is not null
                then make_time(salida[1]::int, salida[2]::int, 0) end                as salida_t
      from leido
  )
  update public.plans p
     set horas_cancelacion_gratuita   = coalesce(c.libre_h, p.horas_cancelacion_gratuita),
         horas_reembolso_parcial      = case when c.parcial_pct is not null then c.parcial_h end,
         porcentaje_reembolso_parcial = c.parcial_pct,
         hora_salida                  = coalesce(c.salida_t, p.hora_salida)
    from calculado c
   where c.id = p.id
     and c.libre_h is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

select public.aplicar_politica_desde_texto();

-- ---------------------------------------------------------------------
-- 3. Pagos: intentos, columnas de Wompi en payments y reembolsos
-- ---------------------------------------------------------------------
create table public.payment_attempts (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  referencia            text not null unique,
  amount_in_cents       bigint not null check (amount_in_cents > 0),
  moneda                text not null default 'COP',
  estado                text not null default 'pendiente'
                        check (estado in ('pendiente', 'aprobado', 'rechazado', 'aprobado_tarde',
                                          'expirado', 'monto_no_coincide')),
  wompi_transaction_id  text unique,
  wompi_status          text,
  metodo_wompi          text,
  status_message        text,
  raw                   jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  expira_at             timestamptz not null
);
create index payment_attempts_booking_idx on public.payment_attempts(booking_id);

alter table public.payments
  add column provider_transaction_id text unique,
  add column metodo_wompi text;

create table public.refunds (
  id                    uuid primary key default gen_random_uuid(),
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  payment_id            uuid references public.payments(id) on delete set null,
  referencia            text not null unique,
  wompi_transaction_id  text,
  monto                 numeric(12,2) not null check (monto > 0),
  porcentaje            int not null check (porcentaje between 1 and 100),
  estado                text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  origen                text not null check (origen in ('cancelacion', 'pago_tardio')),
  simulado              boolean not null default false,
  wompi_refund_id       text,
  motivo                text not null,
  raw                   jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index refunds_booking_idx on public.refunds(booking_id);
create index refunds_wompi_refund_idx on public.refunds(wompi_refund_id) where wompi_refund_id is not null;

alter table public.payment_attempts enable row level security;
alter table public.refunds enable row level security;

-- payment_attempts: solo service_role (las Edge Functions); sin políticas ni permisos de API.
revoke all on public.payment_attempts from anon, authenticated;

-- refunds: lectura por interesados y sin la columna raw (respuesta cruda de Wompi).
-- Los clientes deben pedir columnas explícitas (select=id,estado,…), no select=*.
create policy refunds_select_interested on public.refunds
  for select to authenticated
  using (
    exists (select 1 from public.bookings b where b.id = refunds.booking_id and b.viajero_id = auth.uid())
    or public.is_admin()
    or public.is_plan_agency_booking_owner(refunds.booking_id)
  );
revoke all on public.refunds from anon, authenticated;
grant select (id, booking_id, payment_id, referencia, wompi_transaction_id, monto, porcentaje,
              estado, origen, simulado, wompi_refund_id, motivo, created_at, updated_at)
  on public.refunds to authenticated;

-- ---------------------------------------------------------------------
-- 4. Funciones internas de política y mapeo
-- ---------------------------------------------------------------------
-- plpgsql (no sql): los valores nuevos del enum no pueden evaluarse en la misma
-- transacción que los crea, y plpgsql difiere el análisis hasta la primera llamada.
create or replace function public.metodo_pago_desde_wompi(p_tipo text)
returns public.payment_method
language plpgsql immutable
set search_path = public
as $$
begin
  return (case upper(coalesce(p_tipo, ''))
            when 'CARD'                 then 'tarjeta'
            when 'PSE'                  then 'pse'
            when 'NEQUI'                then 'nequi'
            when 'DAVIPLATA'            then 'daviplata'
            when 'BANCOLOMBIA_TRANSFER' then 'bancolombia'
            when 'BANCOLOMBIA_QR'       then 'bancolombia'
            when 'BANCOLOMBIA_COLLECT'  then 'bancolombia'
            else 'otro'
          end)::public.payment_method;
end;
$$;

-- Decisión de la política para una reserva AHORA. Salida = fecha + hora_salida (Bogotá).
create or replace function public.reembolso_por_politica(p_booking_id uuid)
returns table (horas_antes numeric, porcentaje int, monto numeric, aplica boolean, motivo text)
language plpgsql stable
set search_path = public
as $$
declare
  b public.bookings;
  pl public.plans;
  pd public.plan_dates;
  v_pago public.payments;
  v_horas numeric;
  v_pct int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  select * into pd from public.plan_dates where id = b.plan_date_id;
  select * into pl from public.plans where id = pd.plan_id;

  v_horas := round(extract(epoch from (((pd.fecha + pl.hora_salida) at time zone 'America/Bogota') - now())) / 3600, 2);

  select * into v_pago from public.payments
   where booking_id = b.id and estado = 'aprobado'
   order by created_at limit 1;

  if b.estado = 'pendiente_pago' or v_pago.id is null then
    return query select v_horas, 0, 0::numeric, false, 'Reserva sin pago confirmado: no hay nada que reembolsar'::text;
    return;
  end if;

  if v_horas >= pl.horas_cancelacion_gratuita then
    v_pct := 100;
    return query select v_horas, 100, round(v_pago.monto, 2), true,
      format('Cancelación con al menos %s h de anticipación: reembolso del 100 %%', pl.horas_cancelacion_gratuita);
  elsif pl.horas_reembolso_parcial is not null and v_horas >= pl.horas_reembolso_parcial then
    v_pct := pl.porcentaje_reembolso_parcial;
    return query select v_horas, v_pct, round(v_pago.monto * v_pct / 100, 2), v_pct > 0,
      format('Cancelación con menos de %s h y al menos %s h de anticipación: reembolso del %s %%',
             pl.horas_cancelacion_gratuita, pl.horas_reembolso_parcial, v_pct);
  else
    return query select v_horas, 0, 0::numeric, false,
      format('Cancelación con menos de %s h de anticipación: sin reembolso',
             coalesce(pl.horas_reembolso_parcial, pl.horas_cancelacion_gratuita));
  end if;
end;
$$;

-- Vista previa para el viajero (solo lectura): qué reembolso le daría cancelar ahora.
create or replace function public.vista_previa_cancelacion(p_booking_id uuid)
returns json
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_viajero uuid;
  r record;
begin
  select viajero_id into v_viajero from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if v_viajero is distinct from auth.uid() then
    raise exception 'NO_ES_DUENO';
  end if;
  select * into r from public.reembolso_por_politica(p_booking_id);
  return json_build_object(
    'booking_id', p_booking_id,
    'horas_antes', r.horas_antes,
    'aplica', r.aplica,
    'porcentaje', r.porcentaje,
    'monto', r.monto,
    'motivo', r.motivo
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Intentos de pago
-- ---------------------------------------------------------------------
-- Crea el intento (referencia única <codigo>-<n>) de una reserva pendiente
-- cuya retención de 30 min sigue vigente. Valida dueño: p_viajero_id viene
-- del JWT ya verificado por la Edge Function.
create or replace function public.crear_intento_pago(p_booking_id uuid, p_viajero_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  v_expira timestamptz;
  v_n int;
  v_ref text;
  v_cents bigint;
  v_id uuid;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if b.viajero_id <> p_viajero_id then
    raise exception 'NO_ES_DUENO';
  end if;
  if b.estado <> 'pendiente_pago' then
    raise exception 'ESTADO_INVALIDO';
  end if;
  v_expira := b.created_at + interval '30 minutes';
  if v_expira <= now() then
    raise exception 'RESERVA_VENCIDA';
  end if;

  select count(*) + 1 into v_n from public.payment_attempts where booking_id = b.id;
  v_ref := b.codigo || '-' || v_n;
  v_cents := round(b.monto_total * 100)::bigint;

  insert into public.payment_attempts (booking_id, referencia, amount_in_cents, expira_at)
  values (b.id, v_ref, v_cents, v_expira)
  returning id into v_id;

  return json_build_object(
    'attempt_id', v_id,
    'booking_codigo', b.codigo,
    'referencia', v_ref,
    'amount_in_cents', v_cents,
    'moneda', 'COP',
    'expira_at', v_expira
  );
end;
$$;

-- Punto ÚNICO por el que un resultado de Wompi (verificación o webhook)
-- toca reservas y pagos. Idempotente por intento/transacción.
create or replace function public.aplicar_resultado_pago(
  p_referencia text,
  p_transaction_id text,
  p_status text,
  p_amount_in_cents bigint,
  p_metodo text,
  p_raw jsonb,
  p_moneda text default 'COP',
  p_status_message text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.payment_attempts;
  b public.bookings;
  v_pago public.payments;
  v_refund public.refunds;
  v_resultado text;
begin
  select * into a from public.payment_attempts where referencia = p_referencia for update;
  if a.id is null then
    return json_build_object('resultado', 'referencia_desconocida');
  end if;
  select * into b from public.bookings where id = a.booking_id for update;

  -- Reenvío (webhook repetido, verificación doble): no cambia nada.
  if a.estado in ('aprobado', 'aprobado_tarde') then
    v_resultado := case a.estado when 'aprobado' then 'ya_confirmada' else 'ya_aprobado_tarde' end;
  elsif p_status is null or p_status not in ('PENDING', 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR') then
    raise exception 'ESTADO_WOMPI_INVALIDO';
  else
    update public.payment_attempts
       set wompi_transaction_id = p_transaction_id,
           wompi_status = p_status,
           metodo_wompi = p_metodo,
           status_message = p_status_message,
           raw = p_raw,
           updated_at = now()
     where id = a.id;

    if p_status = 'PENDING' then
      v_resultado := 'pendiente';
    elsif p_status in ('DECLINED', 'VOIDED', 'ERROR') then
      update public.payment_attempts set estado = 'rechazado' where id = a.id;
      v_resultado := 'rechazado';
    elsif p_amount_in_cents is distinct from a.amount_in_cents or coalesce(p_moneda, 'COP') <> a.moneda then
      update public.payment_attempts set estado = 'monto_no_coincide' where id = a.id;
      v_resultado := 'monto_no_coincide';
    elsif b.estado = 'pendiente_pago' then
      insert into public.payments (booking_id, metodo, estado, monto, moneda, referencia, provider, simulated,
                                   provider_transaction_id, metodo_wompi)
      values (b.id, public.metodo_pago_desde_wompi(p_metodo), 'aprobado', b.monto_total, a.moneda, a.referencia,
              'wompi', false, p_transaction_id, p_metodo);
      update public.bookings set estado = 'confirmada' where id = b.id;
      update public.payment_attempts set estado = 'aprobado' where id = a.id;
      -- Los demás intentos abiertos de esta reserva ya no tienen sentido.
      update public.payment_attempts set estado = 'expirado', updated_at = now()
       where booking_id = b.id and id <> a.id and estado = 'pendiente';
      v_resultado := 'confirmada';
    else
      -- Aprobado cuando la reserva ya venció, se canceló o ya estaba pagada:
      -- no se confirma; el cobro se devuelve completo.
      update public.payment_attempts set estado = 'aprobado_tarde' where id = a.id;
      insert into public.refunds (booking_id, referencia, wompi_transaction_id, monto, porcentaje, origen, motivo)
      values (b.id, 'RF-' || a.referencia, p_transaction_id, round(a.amount_in_cents / 100.0, 2), 100, 'pago_tardio',
              case when b.estado = 'confirmada'
                   then 'Segundo cobro de una reserva ya pagada: devolución del 100 %'
                   else 'Pago aprobado después de vencer o cancelarse la reserva: devolución del 100 %' end)
      on conflict (referencia) do nothing;
      v_resultado := 'aprobado_tarde';
    end if;
  end if;

  select * into v_refund from public.refunds where referencia = 'RF-' || a.referencia and origen = 'pago_tardio';
  select * into v_pago from public.payments where booking_id = b.id and estado in ('aprobado', 'reembolsado')
   order by created_at limit 1;
  select * into b from public.bookings where id = b.id;
  select * into a from public.payment_attempts where id = a.id;

  return json_build_object(
    'resultado', v_resultado,
    'attempt_estado', a.estado,
    'referencia', a.referencia,
    'booking_id', b.id,
    'booking_codigo', b.codigo,
    'booking_estado', b.estado,
    'metodo', coalesce(v_pago.metodo::text, public.metodo_pago_desde_wompi(a.metodo_wompi)::text),
    'refund_id', v_refund.id,
    'refund_estado', v_refund.estado
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Cancelación con política de reembolso
-- ---------------------------------------------------------------------
create or replace function public.cancelar_reserva(p_booking_id uuid, p_viajero_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  d record;
  v_pago public.payments;
  v_refund public.refunds;
  v_ya boolean := false;
  v_horas numeric;
  v_motivo text;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if b.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if b.viajero_id <> p_viajero_id then
    raise exception 'NO_ES_DUENO';
  end if;

  if b.estado = 'cancelada' then
    -- Reintento tras una cancelación ya hecha: solo si dejó un reembolso (para poder reanudarlo).
    select * into v_refund from public.refunds where booking_id = b.id and origen = 'cancelacion';
    if v_refund.id is null then
      raise exception 'ESTADO_INVALIDO';
    end if;
    v_ya := true;
    v_motivo := v_refund.motivo;
  elsif b.estado not in ('pendiente_pago', 'confirmada') then
    raise exception 'ESTADO_INVALIDO';
  else
    -- La decisión se toma ANTES de cambiar el estado (depende de b.estado y del pago).
    select * into d from public.reembolso_por_politica(b.id);
    v_horas := d.horas_antes;
    v_motivo := d.motivo;

    update public.bookings set estado = 'cancelada', cancelled_at = now() where id = b.id;
    -- Liberar cupos (con tope para nunca exceder cupo_total)
    update public.plan_dates
       set cupo_disponible = least(cupo_total, cupo_disponible + b.pax)
     where id = b.plan_date_id;
    update public.payment_attempts set estado = 'expirado', updated_at = now()
     where booking_id = b.id and estado = 'pendiente';

    if d.aplica then
      select * into v_pago from public.payments
       where booking_id = b.id and estado = 'aprobado' order by created_at limit 1;
      insert into public.refunds (booking_id, payment_id, referencia, wompi_transaction_id, monto, porcentaje,
                                  estado, origen, simulado, motivo)
      values (b.id, v_pago.id, 'RF-' || b.codigo, v_pago.provider_transaction_id, d.monto, d.porcentaje,
              case when v_pago.provider = 'wompi' and not v_pago.simulated then 'pendiente' else 'aprobado' end,
              'cancelacion', not (v_pago.provider = 'wompi' and not v_pago.simulated), d.motivo)
      returning * into v_refund;
      -- Pago heredado del modo simulado: no hay pasarela a la que pedir nada.
      if v_refund.simulado then
        update public.payments set estado = 'reembolsado' where id = v_pago.id;
      end if;
    end if;
  end if;

  return json_build_object(
    'booking_id', b.id,
    'estado', 'cancelada',
    'ya_cancelada', v_ya,
    'horas_antes', v_horas,
    'reembolso', json_build_object(
      'aplica', v_refund.id is not null,
      'porcentaje', coalesce(v_refund.porcentaje, 0),
      'monto', coalesce(v_refund.monto, 0),
      'estado', coalesce(v_refund.estado, 'no_aplica'),
      'motivo', v_motivo,
      'refund_id', v_refund.id,
      'wompi_refund_id', v_refund.wompi_refund_id,
      'wompi_transaction_id', v_refund.wompi_transaction_id,
      'simulado', coalesce(v_refund.simulado, false)
    )
  );
end;
$$;

-- Registra el desenlace de un reembolso que la Edge Function pidió a Wompi
-- (o que Wompi notificó por webhook). Un estado final no retrocede.
create or replace function public.registrar_resultado_reembolso(
  p_refund_id uuid,
  p_estado text,
  p_wompi_refund_id text,
  p_raw jsonb,
  p_motivo text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.refunds;
begin
  if p_estado not in ('pendiente', 'aprobado', 'rechazado') then
    raise exception 'ESTADO_REEMBOLSO_INVALIDO';
  end if;
  select * into r from public.refunds where id = p_refund_id for update;
  if r.id is null then
    raise exception 'REEMBOLSO_NO_EXISTE';
  end if;

  if r.estado = 'pendiente' then
    update public.refunds
       set estado = p_estado,
           wompi_refund_id = coalesce(p_wompi_refund_id, wompi_refund_id),
           raw = coalesce(p_raw, raw),
           motivo = coalesce(p_motivo, motivo),
           updated_at = now()
     where id = r.id
    returning * into r;
    if r.estado = 'aprobado' and r.payment_id is not null then
      update public.payments set estado = 'reembolsado' where id = r.payment_id;
    end if;
  elsif r.wompi_refund_id is null and p_wompi_refund_id is not null then
    update public.refunds set wompi_refund_id = p_wompi_refund_id, updated_at = now()
     where id = r.id returning * into r;
  end if;

  return json_build_object('refund_id', r.id, 'estado', r.estado, 'wompi_refund_id', r.wompi_refund_id,
                           'booking_id', r.booking_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Vencimiento: libera TODOS los cupos y cierra los intentos abiertos
-- ---------------------------------------------------------------------
-- (La versión 0001 liberaba una sola reserva por fecha cuando varias vencían
-- a la vez: UPDATE … FROM con varias filas por destino aplica solo una.)
create or replace function public.expire_stale_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with stale as (
    update public.bookings
       set estado = 'cancelada', cancelled_at = now()
     where estado = 'pendiente_pago'
       and created_at < now() - interval '30 minutes'
    returning id, plan_date_id, pax
  ), cerrados as (
    update public.payment_attempts
       set estado = 'expirado', updated_at = now()
     where estado = 'pendiente' and booking_id in (select id from stale)
    returning 1
  ), liberados as (
    update public.plan_dates pd
       set cupo_disponible = least(pd.cupo_total, pd.cupo_disponible + t.pax)
      from (select plan_date_id, sum(pax)::int as pax from stale group by plan_date_id) t
     where pd.id = t.plan_date_id
    returning 1
  )
  select count(*) into v_count from stale;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Permisos
-- ---------------------------------------------------------------------
-- Supabase concede EXECUTE a anon/authenticated por defecto en public:
-- se revoca explícitamente además de PUBLIC.
-- En proyectos con auto_expose_new_tables = false (nuevo valor por defecto en la nube)
-- nada es alcanzable sin GRANT explícito: service_role recibe sus permisos aquí.
grant select, insert, update, delete on public.payment_attempts, public.refunds to service_role;

drop function public.confirm_payment(uuid, public.payment_method, text, boolean);
drop function public.cancel_booking(uuid);

revoke all on function public.aplicar_politica_desde_texto() from public, anon, authenticated;
revoke all on function public.reembolso_por_politica(uuid) from public, anon, authenticated;
revoke all on function public.crear_intento_pago(uuid, uuid) from public, anon, authenticated;
revoke all on function public.aplicar_resultado_pago(text, text, text, bigint, text, jsonb, text, text) from public, anon, authenticated;
revoke all on function public.cancelar_reserva(uuid, uuid) from public, anon, authenticated;
revoke all on function public.registrar_resultado_reembolso(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.vista_previa_cancelacion(uuid) from public, anon;

grant execute on function public.aplicar_politica_desde_texto() to service_role;
grant execute on function public.reembolso_por_politica(uuid) to service_role;
grant execute on function public.crear_intento_pago(uuid, uuid) to service_role;
grant execute on function public.aplicar_resultado_pago(text, text, text, bigint, text, jsonb, text, text) to service_role;
grant execute on function public.cancelar_reserva(uuid, uuid) to service_role;
grant execute on function public.registrar_resultado_reembolso(uuid, text, text, jsonb, text) to service_role;
grant execute on function public.vista_previa_cancelacion(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 9. Vencimiento programado (pg_cron) cada 5 minutos
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('expirar-reservas-pendientes', '*/5 * * * *', 'select public.expire_stale_bookings()');
  else
    raise warning 'pg_cron no está disponible: programa expire_stale_bookings() con un cron externo';
  end if;
end $$;
