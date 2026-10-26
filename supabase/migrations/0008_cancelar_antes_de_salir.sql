-- =====================================================================
-- Diverso App — 0008: no se cancela una reserva después de la salida
-- =====================================================================
-- Hasta 0007, cancelar_reserva y vista_previa_cancelacion aceptaban reservas cuyo viaje ya había salido
-- (el reembolso daba 0 %, pero la reserva pasaba a «cancelada» y se «liberaban» cupos de una fecha pasada).
-- Ahora, si bookings.salida_at (la salida congelada de 0005) ya pasó y la reserva sigue viva
-- (pendiente_pago o confirmada), ambas lanzan RESERVA_YA_SALIO.
--   * El reintento de una cancelación que ya existe (estado 'cancelada' con su reembolso) NO cambia:
--     sigue siendo idempotente para poder reanudar un reembolso pendiente aunque el viaje ya haya salido.
--   * Las firmas, el modo de ejecución y los permisos son los de 0003; solo cambia el cuerpo.
-- No toca datos: solo reemplaza dos funciones.

create or replace function public.vista_previa_cancelacion(p_booking_id uuid)
returns json
language plpgsql stable security definer
set search_path = public
as $$
declare
  b public.bookings;
  r record;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if b.viajero_id is distinct from auth.uid() then
    raise exception 'NO_ES_DUENO';
  end if;
  -- Una reserva viva cuyo viaje ya salió no se cancela: no hay nada que previsualizar.
  if b.estado in ('pendiente_pago', 'confirmada') and b.salida_at <= now() then
    raise exception 'RESERVA_YA_SALIO';
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
    -- Cancelar solo tiene sentido antes de la salida (después se perdería la plaza y el cupo ya no sirve).
    if b.salida_at <= now() then
      raise exception 'RESERVA_YA_SALIO';
    end if;
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

-- Permisos: los mismos de 0003 (create or replace los conserva; se repiten por si acaso).
revoke all on function public.cancelar_reserva(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancelar_reserva(uuid, uuid) to service_role;
revoke all on function public.vista_previa_cancelacion(uuid) from public, anon;
grant execute on function public.vista_previa_cancelacion(uuid) to authenticated, service_role;
