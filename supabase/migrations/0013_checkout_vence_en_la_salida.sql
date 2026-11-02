-- =====================================================================
-- Diverso App — 0013: el checkout de Wompi vence a más tardar en la salida
-- =====================================================================
-- 0012 impide iniciar el pago de un viaje que ya salió, pero la expiración que se firma para Wompi seguía
-- siendo created_at + 30 minutos: una reserva hecha 10 minutos antes de la salida podía pagarse hasta 20
-- minutos después de partir (y entonces ya no se puede cancelar: 0008).
--   * crear_intento_pago: expira_at = least(created_at + 30 min, salida_at). La retención de 30 minutos
--     (RESERVA_VENCIDA) y el rechazo por salida ya pasada (RESERVA_YA_SALIO) no cambian.
--   * Firma, security definer, search_path y permisos son los de 0012; solo cambia el cuerpo.
-- No toca datos: solo reemplaza una función.

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
  if b.created_at + interval '30 minutes' <= now() then
    raise exception 'RESERVA_VENCIDA';
  end if;
  -- Un viaje que ya salió no se paga (tampoco se podría cancelar: 0008).
  if b.salida_at <= now() then
    raise exception 'RESERVA_YA_SALIO';
  end if;

  -- El checkout firmado (pagos-iniciar) vence con la retención o en la salida, lo que ocurra primero:
  -- una reserva hecha minutos antes de partir no se puede pagar después de que el viaje salió.
  v_expira := least(b.created_at + interval '30 minutes', b.salida_at);

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
