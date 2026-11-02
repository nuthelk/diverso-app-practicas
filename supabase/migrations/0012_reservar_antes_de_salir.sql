-- =====================================================================
-- Diverso App — 0012: no se reserva ni se paga un viaje que ya salió
-- =====================================================================
-- Hasta 0011, create_booking solo exigía pd.fecha >= current_date: las salidas de HOY que ya partieron
-- (p. ej. a las 06:00 cuando son las 15:00) seguían siendo reservables, y como cancelar_reserva las
-- rechaza con RESERVA_YA_SALIO (0008), el viajero podía pagar un viaje que ya salió sin poder cancelarlo.
--
--   * create_booking: nuevo error FECHA_YA_SALIO cuando la salida (pd.fecha + plans.hora_salida,
--     interpretada en America/Bogota, igual que bookings.salida_at en 0005) es <= now().
--   * crear_intento_pago (el paso SQL que llama pagos-iniciar): RESERVA_YA_SALIO cuando la salida
--     congelada de la reserva (bookings.salida_at) es <= now(). La Edge Function ya traduce ese código
--     a HTTP 409; su contrato no cambia.
--   * «Hoy» pasa a ser la fecha de Bogotá, no current_date (UTC): de 19:00 a 24:00 en Bogotá el servidor
--     ya está en el día siguiente y rechazaba como FECHA_PASADA salidas de hoy que aún no parten.
--     FECHA_PASADA sigue significando «fecha anterior a hoy» (hoy = Bogotá).
--   * Las firmas, security definer, search_path y permisos son los de 0005 / 0003; solo cambian los cuerpos.
-- No toca datos: solo reemplaza dos funciones.

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
  v_pendiente uuid;
  v_hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if v_viajero is null then
    raise exception 'NO_AUTENTICADO';
  end if;
  if p_pax is null or p_pax < 1 or p_pax > 20 then
    raise exception 'PAX_INVALIDO';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('diverso.reserva:' || v_viajero::text || ':' || coalesce(p_plan_date_id::text, ''), 0));
  select b.id into v_pendiente
    from public.bookings b
   where b.viajero_id = v_viajero
     and b.plan_date_id = p_plan_date_id
     and b.estado = 'pendiente_pago'
     and b.created_at + interval '30 minutes' > now()
   order by b.created_at desc
   limit 1;
  if v_pendiente is not null then
    raise exception 'RESERVA_PENDIENTE_EXISTENTE' using detail = v_pendiente::text;
  end if;

  -- Decremento atómico condicional: la fila solo se actualiza si hay cupo, el plan es vendible y
  -- la salida (fecha + hora_salida, Bogotá) aún no ocurrió; dos reservas simultáneas no pueden sobrevender.
  update public.plan_dates pd
     set cupo_disponible = pd.cupo_disponible - p_pax
   where pd.id = p_plan_date_id
     and pd.cupo_disponible >= p_pax
     and pd.fecha >= v_hoy
     and exists (select 1 from public.plans p
                  where p.id = pd.plan_id
                    and p.estado = 'publicado'
                    and public.agencia_habilitada(p.agency_id)
                    and ((pd.fecha + p.hora_salida) at time zone 'America/Bogota') > now())
  returning pd.fecha, pd.cupo_disponible into v_fecha, v_cupo;

  if not found then
    select pd.fecha, p.id, p.estado, p.agency_id,
           ((pd.fecha + p.hora_salida) at time zone 'America/Bogota') as salida
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
    elsif v_plan.fecha < v_hoy then
      raise exception 'FECHA_PASADA';
    elsif v_plan.salida <= now() then
      raise exception 'FECHA_YA_SALIO';
    else
      raise exception 'SIN_CUPO';
    end if;
  end if;

  select p.id, p.titulo, p.precio_cop into v_plan
    from public.plan_dates pd
    join public.plans p on p.id = pd.plan_id
   where pd.id = p_plan_date_id;

  v_codigo := 'DIV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  -- La política y la salida del plan se congelan en la reserva (disparador bookings_politica_congelada).
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

revoke all on function public.create_booking(uuid, int) from public, anon;
grant execute on function public.create_booking(uuid, int) to authenticated, service_role;

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
  -- Un viaje que ya salió no se paga (tampoco se podría cancelar: 0008).
  if b.salida_at <= now() then
    raise exception 'RESERVA_YA_SALIO';
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

revoke all on function public.crear_intento_pago(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crear_intento_pago(uuid, uuid) to service_role;
