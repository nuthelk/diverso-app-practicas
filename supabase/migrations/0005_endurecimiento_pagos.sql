-- =====================================================================
-- Diverso App — endurecimiento de pagos tras la verificación independiente (T6a)
--
--  B1  La política de cancelación se CONGELA en la reserva: lo que el viajero
--      pagó es lo que se le aplica, aunque la agencia edite después el plan
--      (política, hora de salida) o su fecha. Una fecha con reservas vivas ya
--      no se mueve ni se borra.
--  SF2 Las ventanas de reembolso se comparan en exacto (intervalos); solo la
--      cifra que se muestra se redondea.
--  SF3 Un cobro APROBADO con monto o moneda distintos al de la reserva genera
--      una obligación de reembolso del 100 % de lo realmente cobrado.
--  +   aplicar_resultado_pago bloquea primero la reserva y luego el intento
--      (mismo orden que cancelar_reserva y expire_stale_bookings: sin deadlocks).
--  +   create_booking rechaza una segunda reserva pendiente (no vencida) del
--      mismo viajero para la misma fecha (RESERVA_PENDIENTE_EXISTENTE).
--  +   El texto de la política y sus números nunca se contradicen: los números
--      son la fuente de verdad (mismo formato que apps/panel_svelte/src/lib/politica.ts).
--  +   Versión de los documentos legales v2-2026-10 (los textos describen Wompi
--      en modo de prueba): los usuarios deben volver a aceptar.
--
-- Segura sobre una BD con 0001–0004 aplicadas (no borra datos) y sobre una BD
-- nueva (migraciones + seed.sql, que no cambia: sus planes y reservas pasan por
-- los disparadores de esta migración).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Texto de la política generado desde los números (y su lectura inversa)
-- ---------------------------------------------------------------------
-- Mismas frases que textoPolitica() de apps/panel_svelte/src/lib/politica.ts; las dos pruebas
-- (SQL y vitest) afirman las mismas cadenas.
create or replace function public.texto_politica(p_gratuita int, p_parcial int, p_porcentaje int)
returns text
language plpgsql immutable
set search_path = public
as $$
declare
  v_g text;
  v_p text;
  v_base text;
begin
  if p_gratuita is null then
    return null;
  end if;
  v_g := p_gratuita || case when p_gratuita = 1 then ' hora' else ' horas' end;
  v_p := p_parcial || case when p_parcial = 1 then ' hora' else ' horas' end;  -- null si no hay tramo
  v_base := 'Cancelación gratuita hasta ' || v_g || ' antes.';
  if p_parcial is null or p_porcentaje is null then
    return v_base || ' Menos de ' || v_g || ': sin reembolso.';
  elsif p_parcial = 0 then
    return v_base || ' Menos de ' || v_g || ': reembolso del ' || p_porcentaje || ' %.';
  end if;
  return v_base || ' Entre ' || p_gratuita || ' y ' || v_p || ': reembolso del ' || p_porcentaje
         || ' %. Menos de ' || v_p || ': sin reembolso.';
end;
$$;

-- Lee los números de un texto de política: los textos de legado del seed y del panel antiguo
-- («hasta 12 horas», «hasta 7 días … Menos de 7 días: 50%», «Entre 48 y 24 horas: reembolso del 50%»)
-- y los canónicos que genera texto_politica. Sin ventana reconocible, o con números que la tabla
-- rechazaría (ventana parcial >= gratuita, porcentaje fuera de 0–100), devuelve todo NULL.
create or replace function public.politica_desde_texto(
  p_texto text,
  out gratuita int,
  out parcial_h int,
  out parcial_pct int
)
language plpgsql immutable
set search_path = public
as $$
declare
  v_libre text[];
  v_entre text[];
  v_pct text[];
begin
  v_libre := regexp_match(p_texto, 'gratuita hasta (\d{1,6}) (horas?|días?)');
  if v_libre is null then
    return;
  end if;
  gratuita := v_libre[1]::int * case when v_libre[2] like 'd%' then 24 else 1 end;

  v_entre := regexp_match(p_texto, 'Entre \d{1,6} y (\d{1,6}) (horas?|días?)');
  if v_entre is not null then
    parcial_h := v_entre[1]::int * case when v_entre[2] like 'd%' then 24 else 1 end;
    v_pct := regexp_match(p_texto, 'Entre \d{1,6} y \d{1,6} (?:horas?|días?): (?:reembolso del )?(\d{1,3})\s?%');
    if v_pct is null then
      v_pct := regexp_match(p_texto, '(\d{1,3})\s?%');
    end if;
  else
    v_pct := regexp_match(p_texto, 'Menos de \d{1,6} (?:horas?|días?): (?:reembolso del )?(\d{1,3})\s?%');
    if v_pct is not null then
      parcial_h := 0;  -- «Menos de X: 50 %»: el porcentaje rige hasta la salida
    end if;
  end if;
  parcial_pct := v_pct[1]::int;

  if parcial_pct is null then
    parcial_h := null;
  end if;
  if gratuita <= 0 or (parcial_h is not null and parcial_h >= gratuita)
     or (parcial_pct is not null and parcial_pct > 100) then
    gratuita := null;
    parcial_h := null;
    parcial_pct := null;
  end if;
end;
$$;

-- Carga inicial (seed.sql la llama tras insertar los planes): números y hora de salida desde el
-- texto y el itinerario. Ahora lee con politica_desde_texto, así que acepta también los textos
-- canónicos (con su tramo «Menos de X: reembolso del N %»). Solo para carga inicial.
create or replace function public.aplicar_politica_desde_texto()
returns int
language plpgsql
set search_path = public
as $$
declare
  v_n int;
begin
  with leido as (
    select p.id, t.gratuita, t.parcial_h, t.parcial_pct,
           (regexp_match(coalesce(p.itinerario->0->>'hora', ''), '(\d{1,2}):(\d{2})')) as salida
      from public.plans p
      cross join lateral public.politica_desde_texto(p.politica_cancelacion) t
  )
  update public.plans p
     set horas_cancelacion_gratuita   = l.gratuita,
         horas_reembolso_parcial      = l.parcial_h,
         porcentaje_reembolso_parcial = l.parcial_pct,
         hora_salida = coalesce(case when l.salida is not null and l.salida[1]::int < 24 and l.salida[2]::int < 60
                                     then make_time(l.salida[1]::int, l.salida[2]::int, 0) end,
                                p.hora_salida)
    from leido l
   where l.id = p.id
     and l.gratuita is not null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. plans: texto y números coherentes SIEMPRE (los números son la fuente de verdad)
-- ---------------------------------------------------------------------
-- Cambian los números → se regenera el texto. Cambia solo el texto (panel Flutter antiguo, seed) → se
-- leen los números del texto (si se entienden) y el texto queda en su forma canónica. En un INSERT, los
-- números «por omisión» (48 h, sin tramo) ceden ante un texto que sí diga otra cosa.
create or replace function public.plans_sincronizar_politica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_cambian boolean;
begin
  if new.horas_cancelacion_gratuita is null or new.horas_cancelacion_gratuita <= 0 then
    return new;  -- NOT NULL / CHECK de la tabla rechazan la fila
  end if;

  if tg_op = 'UPDATE' then
    v_cambian := (new.horas_cancelacion_gratuita, new.horas_reembolso_parcial, new.porcentaje_reembolso_parcial)
                 is distinct from (old.horas_cancelacion_gratuita, old.horas_reembolso_parcial, old.porcentaje_reembolso_parcial);
  else
    v_cambian := (new.horas_cancelacion_gratuita, new.horas_reembolso_parcial, new.porcentaje_reembolso_parcial)
                 is distinct from (48, null::int, null::int);
  end if;
  if not v_cambian and (tg_op = 'INSERT' or new.politica_cancelacion is distinct from old.politica_cancelacion) then
    select * into v from public.politica_desde_texto(new.politica_cancelacion);
    if v.gratuita is not null then
      new.horas_cancelacion_gratuita := v.gratuita;
      new.horas_reembolso_parcial := v.parcial_h;
      new.porcentaje_reembolso_parcial := v.parcial_pct;
    end if;
  end if;

  new.politica_cancelacion := public.texto_politica(new.horas_cancelacion_gratuita,
                                                    new.horas_reembolso_parcial,
                                                    new.porcentaje_reembolso_parcial);
  return new;
end;
$$;

-- Relleno de lo existente (antes del disparador, para no leer dos veces).
update public.plans
   set politica_cancelacion = public.texto_politica(horas_cancelacion_gratuita, horas_reembolso_parcial,
                                                    porcentaje_reembolso_parcial)
 where politica_cancelacion is distinct from public.texto_politica(horas_cancelacion_gratuita, horas_reembolso_parcial,
                                                                   porcentaje_reembolso_parcial);

create trigger plans_politica_sincronizada
  before insert or update of politica_cancelacion, horas_cancelacion_gratuita, horas_reembolso_parcial,
                             porcentaje_reembolso_parcial
  on public.plans
  for each row execute function public.plans_sincronizar_politica();

-- ---------------------------------------------------------------------
-- 3. bookings: política y salida congeladas al reservar (B1)
-- ---------------------------------------------------------------------
alter table public.bookings
  add column politica_horas_gratuita     int,
  add column politica_horas_parcial      int,
  add column politica_porcentaje_parcial int,
  add column politica_texto              text,
  add column salida_at                   timestamptz;

-- Las reservas existentes congelan lo que su plan dice hoy (es lo mejor que se sabe de ellas).
update public.bookings b
   set politica_horas_gratuita     = pl.horas_cancelacion_gratuita,
       politica_horas_parcial      = pl.horas_reembolso_parcial,
       politica_porcentaje_parcial = pl.porcentaje_reembolso_parcial,
       politica_texto              = pl.politica_cancelacion,
       salida_at                   = (pd.fecha + pl.hora_salida) at time zone 'America/Bogota'
  from public.plan_dates pd
  join public.plans pl on pl.id = pd.plan_id
 where pd.id = b.plan_date_id;

alter table public.bookings
  alter column politica_horas_gratuita set not null,
  alter column politica_texto set not null,
  alter column salida_at set not null,
  add constraint bookings_politica_coherente check (
    politica_horas_gratuita > 0
    and (politica_horas_parcial is null) = (politica_porcentaje_parcial is null)
    and (politica_horas_parcial is null or politica_horas_parcial < politica_horas_gratuita)
  );

-- Todo INSERT (create_booking, seed, pruebas) congela la política y la salida del plan en ese instante.
-- Si quien inserta ya trae los valores, se respetan.
create or replace function public.bookings_congelar_politica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  if new.politica_horas_gratuita is null or new.politica_texto is null or new.salida_at is null then
    select pl.horas_cancelacion_gratuita as g, pl.horas_reembolso_parcial as p,
           pl.porcentaje_reembolso_parcial as x, pl.politica_cancelacion as t,
           (pd.fecha + pl.hora_salida) at time zone 'America/Bogota' as s
      into v
      from public.plan_dates pd
      join public.plans pl on pl.id = pd.plan_id
     where pd.id = new.plan_date_id;
    if new.politica_horas_gratuita is null then
      new.politica_horas_gratuita := v.g;
      new.politica_horas_parcial := v.p;
      new.politica_porcentaje_parcial := v.x;
    end if;
    new.politica_texto := coalesce(new.politica_texto, v.t);
    new.salida_at := coalesce(new.salida_at, v.s);
  end if;
  return new;
end;
$$;

create trigger bookings_politica_congelada
  before insert on public.bookings
  for each row execute function public.bookings_congelar_politica();

-- La fecha de un plan con reservas vivas no se mueve ni se borra: la salida congelada de esas
-- reservas dejaría de corresponder con lo que anuncia el plan.
create or replace function public.plan_dates_proteger_fecha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'DELETE' or new.fecha is distinct from old.fecha)
     and exists (select 1 from public.bookings b
                  where b.plan_date_id = old.id and b.estado in ('pendiente_pago', 'confirmada')) then
    raise exception 'FECHA_CON_RESERVAS';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger plan_dates_fecha_protegida
  before update of fecha or delete
  on public.plan_dates
  for each row execute function public.plan_dates_proteger_fecha();

-- ---------------------------------------------------------------------
-- 4. Reembolso por política: lee la política congelada y compara en exacto (B1, SF2)
-- ---------------------------------------------------------------------
create or replace function public.reembolso_por_politica(p_booking_id uuid)
returns table (horas_antes numeric, porcentaje int, monto numeric, aplica boolean, motivo text)
language plpgsql stable
set search_path = public
as $$
declare
  b public.bookings;
  v_pago public.payments;
  v_restante interval;
  v_horas numeric;
  v_pct int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;

  -- La decisión compara el intervalo exacto; solo la cifra mostrada se redondea.
  v_restante := b.salida_at - now();
  v_horas := round(extract(epoch from v_restante) / 3600, 2);

  select * into v_pago from public.payments
   where booking_id = b.id and estado = 'aprobado'
   order by created_at limit 1;

  if b.estado = 'pendiente_pago' or v_pago.id is null then
    return query select v_horas, 0, 0::numeric, false, 'Reserva sin pago confirmado: no hay nada que reembolsar'::text;
    return;
  end if;

  if v_restante >= make_interval(hours => b.politica_horas_gratuita) then
    return query select v_horas, 100, round(v_pago.monto, 2), true,
      format('Cancelación con al menos %s h de anticipación: reembolso del 100 %%', b.politica_horas_gratuita);
  elsif b.politica_horas_parcial is not null and v_restante >= make_interval(hours => b.politica_horas_parcial) then
    v_pct := b.politica_porcentaje_parcial;
    return query select v_horas, v_pct, round(v_pago.monto * v_pct / 100, 2), v_pct > 0,
      format('Cancelación con menos de %s h y al menos %s h de anticipación: reembolso del %s %%',
             b.politica_horas_gratuita, b.politica_horas_parcial, v_pct);
  else
    return query select v_horas, 0, 0::numeric, false,
      format('Cancelación con menos de %s h de anticipación: sin reembolso',
             coalesce(b.politica_horas_parcial, b.politica_horas_gratuita));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Resultado de pago: bloqueo en el orden de las demás funciones y reembolso por monto distinto
-- ---------------------------------------------------------------------
alter table public.refunds drop constraint refunds_origen_check;
alter table public.refunds add constraint refunds_origen_check
  check (origen in ('cancelacion', 'pago_tardio', 'monto_no_coincide'));

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
  v_booking_id uuid;
  v_pago public.payments;
  v_refund public.refunds;
  v_resultado text;
begin
  -- Mismo orden de bloqueo que cancelar_reserva y expire_stale_bookings: primero la reserva, después el intento.
  select booking_id into v_booking_id from public.payment_attempts where referencia = p_referencia;
  if v_booking_id is null then
    return json_build_object('resultado', 'referencia_desconocida');
  end if;
  select * into b from public.bookings where id = v_booking_id for update;
  select * into a from public.payment_attempts where referencia = p_referencia for update;

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
      -- Wompi COBRÓ algo distinto de lo que pedía la reserva: no se confirma y se devuelve lo cobrado.
      update public.payment_attempts set estado = 'monto_no_coincide' where id = a.id;
      if p_amount_in_cents > 0 then
        insert into public.refunds (booking_id, referencia, wompi_transaction_id, monto, porcentaje, origen, motivo)
        values (b.id, 'RF-' || a.referencia, p_transaction_id, round(p_amount_in_cents / 100.0, 2), 100,
                'monto_no_coincide',
                'El monto cobrado no coincide con el de la reserva: devolución del 100 % de lo cobrado')
        on conflict (referencia) do nothing;
      end if;
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

  select * into v_refund from public.refunds
   where referencia = 'RF-' || a.referencia and origen in ('pago_tardio', 'monto_no_coincide');
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
-- 6. Reserva: una sola pendiente (no vencida) por viajero y fecha
-- ---------------------------------------------------------------------
-- Como 0002 (cupo atómico, plan publicado, fecha futura, agencia habilitada) más la regla anti-duplicados
-- que antes solo aplicaba la app. El bloqueo consultivo por viajero+fecha serializa dos peticiones
-- simultáneas; el error lleva el id de la reserva existente en el detalle (PostgREST: `details`).
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

-- ---------------------------------------------------------------------
-- 7. Dispersión: la salida de cada reserva es la congelada
-- ---------------------------------------------------------------------
-- Servicios prestados = reservas pagadas y vigentes cuya salida (congelada) ya pasó.
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
     and b.salida_at < p_ahora;
$$;

create or replace function public.candidatos_anticipo(p_ahora timestamptz)
returns table (agency_id uuid, booking_id uuid, fecha date, bruto numeric, comision numeric)
language sql stable security definer
set search_path = public
as $$
  select pl.agency_id, b.id, (b.salida_at at time zone 'America/Bogota')::date,
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
     and b.salida_at > p_ahora
     and b.salida_at <= p_ahora + interval '48 hours'
     and not exists (select 1 from public.liquidacion_items i where i.booking_id = b.id and i.tipo = 'anticipo');
$$;

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
       and (b.salida_at at time zone 'America/Bogota')::date <= p_fin
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
     and (b.salida_at at time zone 'America/Bogota')::date between p_inicio and p_fin
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

-- ---------------------------------------------------------------------
-- 8. Documentos legales: nueva versión (los textos ya no dicen «pagos simulados»)
-- ---------------------------------------------------------------------
create or replace function public.version_documentos_legales()
returns text language sql immutable as $$ select 'v2-2026-10'::text $$;

-- ---------------------------------------------------------------------
-- 9. Permisos
-- ---------------------------------------------------------------------
-- Supabase concede EXECUTE a anon/authenticated por defecto en public: se revoca explícitamente
-- además de PUBLIC. Los disparadores no necesitan EXECUTE para dispararse.
revoke all on function public.texto_politica(int, int, int) from public, anon, authenticated;
revoke all on function public.politica_desde_texto(text) from public, anon, authenticated;
revoke all on function public.plans_sincronizar_politica() from public, anon, authenticated;
revoke all on function public.bookings_congelar_politica() from public, anon, authenticated;
revoke all on function public.plan_dates_proteger_fecha() from public, anon, authenticated;
grant execute on function public.texto_politica(int, int, int) to service_role;
grant execute on function public.politica_desde_texto(text) to service_role;

-- Reservar es de los viajeros autenticados (anon recibía EXECUTE por omisión y solo fallaba con NO_AUTENTICADO).
revoke all on function public.create_booking(uuid, int) from public, anon;
grant execute on function public.create_booking(uuid, int) to authenticated, service_role;
