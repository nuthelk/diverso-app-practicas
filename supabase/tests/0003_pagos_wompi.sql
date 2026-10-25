-- Pruebas de la migración 0003 (pagos Wompi sandbox, reembolsos por política, vencimiento programado).
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/0003_pagos_wompi.sql
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
end $$;
-- service_role no lee auth.users: los ids se guardan antes de cambiar de rol.
select set_config('test.uid_' || md5(e), (select id::text from auth.users where email = e), false)
  from unnest(array['viajero@demo.com', 'santiago@demo.com']) e;
create or replace function pg_temp.uid(p_email text) returns uuid language sql as $$
  select current_setting('test.uid_' || md5(p_email))::uuid $$;
create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FALLA: %', p_msg; end if;
  raise notice 'OK  %', p_msg;
end $$;
create or replace function pg_temp.falla_con(p_sql text, p_err text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm like '%' || p_err || '%' then raise notice 'OK  % (%)', p_msg, sqlerrm; return; end if;
    raise exception 'FALLA: % — error inesperado: %', p_msg, sqlerrm;
  end;
  raise exception 'FALLA: % — no lanzó %', p_msg, p_err;
end $$;
do $$ begin execute format('grant usage on schema %I to authenticated, anon, service_role', pg_my_temp_schema()::regnamespace); end $$;

-- Fecha de plan de prueba cuya salida ocurre dentro de p_horas (hora Bogotá), con la política dada.
create or replace function pg_temp.mk_fecha(p_f int, p_p int, p_x int, p_horas numeric) returns uuid language plpgsql as $$
declare v_plan uuid; v_local timestamp; v_pd uuid;
begin
  v_local := date_trunc('minute', (now() + make_interval(secs => (p_horas * 3600)::int)) at time zone 'America/Bogota');
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado,
                     horas_cancelacion_gratuita, horas_reembolso_parcial, porcentaje_reembolso_parcial, hora_salida)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST política', 'Guatapé', 'aventura', 100000, 'publicado',
          p_f, p_p, p_x, v_local::time)
  returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
  values (v_plan, v_local::date, 10, 10) returning id into v_pd;
  return v_pd;
end $$;

-- Reserva de prueba (resta cupos como lo hace create_booking). p_pago: 'wompi' | 'simulado' | null.
create or replace function pg_temp.mk_reserva(p_pd uuid, p_estado public.booking_status, p_email text,
                                               p_pago text default null, p_pax int default 2) returns uuid language plpgsql as $$
declare v_b uuid; v_precio numeric;
begin
  select pl.precio_cop into v_precio from plan_dates pd join plans pl on pl.id = pd.plan_id where pd.id = p_pd;
  update plan_dates set cupo_disponible = cupo_disponible - p_pax where id = p_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T-' || upper(substr(md5(random()::text), 1, 8)), p_pd, pg_temp.uid(p_email), p_pax, v_precio * p_pax, p_estado)
  returning id into v_b;
  if p_pago is not null then
    insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
    values (v_b, 'tarjeta', 'aprobado', v_precio * p_pax, 'P-' || substr(md5(random()::text), 1, 10),
            p_pago, p_pago = 'simulado',
            case when p_pago = 'wompi' then 'tx-' || substr(md5(random()::text), 1, 10) end);
  end if;
  return v_b;
end $$;

create or replace function pg_temp.cupo(p_booking uuid) returns int language sql as $$
  select pd.cupo_disponible from bookings b join plan_dates pd on pd.id = b.plan_date_id where b.id = p_booking $$;

-- 1. Contrato de permisos ----------------------------------------------------
select pg_temp.ok(to_regprocedure('public.confirm_payment(uuid,public.payment_method,text,boolean)') is null,
                  'confirm_payment ya no existe: ningún viajero puede marcar su reserva como pagada');
select pg_temp.ok(to_regprocedure('public.cancel_booking(uuid)') is null,
                  'cancel_booking ya no existe: no hay camino que evite la política de reembolso');

do $$
declare f text; r text;
begin
  foreach f in array array[
    'public.aplicar_resultado_pago(text,text,text,bigint,text,jsonb,text,text)',
    'public.registrar_resultado_reembolso(uuid,text,text,jsonb,text)',
    'public.cancelar_reserva(uuid,uuid)',
    'public.crear_intento_pago(uuid,uuid)',
    'public.reembolso_por_politica(uuid)',
    'public.aplicar_politica_desde_texto()'
  ] loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_function_privilege(r, f, 'execute') then
        raise exception 'FALLA: % puede ejecutar %', r, f;
      end if;
    end loop;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0) then
      raise exception 'FALLA: PUBLIC puede ejecutar %', f;
    end if;
    if not has_function_privilege('service_role', f, 'execute') then
      raise exception 'FALLA: service_role no puede ejecutar %', f;
    end if;
  end loop;
  raise notice 'OK  funciones de pago/reembolso: solo service_role (ni PUBLIC, ni anon, ni authenticated)';
end $$;
select pg_temp.ok(has_function_privilege('authenticated', 'public.vista_previa_cancelacion(uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.vista_previa_cancelacion(uuid)', 'execute'),
                  'solo authenticated puede pedir la vista previa de cancelación (solo lectura)');

select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con($q$select public.aplicar_resultado_pago('X','T','APPROVED',1,'CARD','{}'::jsonb)$q$,
                         'permission denied', 'authenticated no puede aplicar un resultado de pago');
select pg_temp.falla_con($q$select public.cancelar_reserva(gen_random_uuid(), gen_random_uuid())$q$,
                         'permission denied', 'authenticated no puede cancelar saltándose la pasarela');
select pg_temp.falla_con($q$select count(*) from public.payment_attempts$q$,
                         'permission denied', 'authenticated no lee payment_attempts');
select pg_temp.falla_con($q$insert into public.refunds (booking_id, referencia, monto, porcentaje, origen, motivo)
                            values (gen_random_uuid(), 'x', 1, 100, 'cancelacion', 'x')$q$,
                         'permission denied', 'authenticated no escribe reembolsos');
select pg_temp.falla_con($q$select raw from public.refunds$q$,
                         'permission denied', 'authenticated no lee el raw de Wompi');
reset role;
set role anon;
select pg_temp.falla_con($q$select public.vista_previa_cancelacion(gen_random_uuid())$q$,
                         'permission denied', 'anon no ve la vista previa de cancelación');
reset role;

-- 2. Programación de vencimientos (pg_cron) ------------------------------------
select pg_temp.ok(exists (select 1 from cron.job where jobname = 'expirar-reservas-pendientes'
                           and schedule = '*/5 * * * *' and command ilike '%expire_stale_bookings%' and active),
                  'pg_cron ejecuta expire_stale_bookings cada 5 minutos');

-- 3. Relleno de la política desde el texto del seed ------------------------------
select pg_temp.ok((select count(*) from plans where politica_cancelacion = 'Cancelación gratuita hasta 12 horas antes.'
                      and horas_cancelacion_gratuita = 12 and horas_reembolso_parcial is null) = 1,
                  'política de 12 h → ventana gratuita 12');
select pg_temp.ok((select count(*) from plans where politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes.'
                      and horas_cancelacion_gratuita = 24) = 5, 'política de 24 h → ventana gratuita 24');
select pg_temp.ok((select count(*) from plans where politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes.'
                      and horas_cancelacion_gratuita = 72) = 3, 'política de 72 h → ventana gratuita 72');
select pg_temp.ok((select count(*) from plans where politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes.'
                      and horas_cancelacion_gratuita = 48) = 6, 'política de 48 h → ventana gratuita 48');
select pg_temp.ok((select count(*) from plans
                    where politica_cancelacion like 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas%'
                      and horas_cancelacion_gratuita = 48 and horas_reembolso_parcial = 24
                      and porcentaje_reembolso_parcial = 50) = 1,
                  'política escalonada → 48 h / 24 h / 50 %');
select pg_temp.ok((select count(*) from plans
                    where politica_cancelacion = 'Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.'
                      and horas_cancelacion_gratuita = 168 and horas_reembolso_parcial = 0
                      and porcentaje_reembolso_parcial = 50) = 2,
                  '«Menos de 7 días: 50%» → 168 h gratis y 50 % hasta la salida');
select pg_temp.ok((select count(*) from plans where horas_reembolso_parcial is null) =
                  (select count(*) from plans where porcentaje_reembolso_parcial is null),
                  'ventana y porcentaje parcial siempre van juntos');
select pg_temp.ok((select hora_salida = time '05:30' from plans where itinerario->0->>'hora' = '05:30' limit 1),
                  'hora_salida sale de la primera hora del itinerario');
select pg_temp.ok(not exists (select 1 from plans
                               where itinerario->0->>'hora' ~ '\d{1,2}:\d{2}'
                                 and hora_salida <> (regexp_match(itinerario->0->>'hora', '(\d{1,2}:\d{2})'))[1]::time),
                  'hora_salida coincide con el itinerario también en planes de varios días («Día 1 - 06:30»)');
select pg_temp.falla_con($q$insert into plans (agency_id, titulo, destino, categoria, precio_cop, horas_cancelacion_gratuita)
                            values ((select id from agencies limit 1), 't', 'd', 'aventura', 1, 0)$q$,
                         'horas_cancelacion_gratuita', 'la ventana gratuita debe ser > 0');
select pg_temp.falla_con($q$insert into plans (agency_id, titulo, destino, categoria, precio_cop, horas_cancelacion_gratuita, horas_reembolso_parcial)
                            values ((select id from agencies limit 1), 't', 'd', 'aventura', 1, 48, 24)$q$,
                         'plans_politica_parcial', 'ventana parcial sin porcentaje es inválida');

-- 3b. PRESERVE: los INSERT de antes de 0003 (panel, seed) siguen funcionando con valores por omisión
do $$
declare v_plan uuid; v_b uuid; v_p public.payments;
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST legado', 'd', 'aventura', 1000)
  returning id into v_plan;
  perform pg_temp.ok((select horas_cancelacion_gratuita = 48 and horas_reembolso_parcial is null
                             and porcentaje_reembolso_parcial is null and hora_salida = time '06:00'
                        from plans where id = v_plan),
                     'un plan creado como antes recibe política por omisión (48 h, sin tramo parcial, 06:00)');
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com');
  insert into payments (booking_id, metodo, monto, referencia) values (v_b, 'nequi', 1, 'LEGADO-' || v_b)
  returning * into v_p;
  perform pg_temp.ok(v_p.provider = 'simulado' and v_p.simulated and v_p.estado = 'pendiente'
                     and v_p.provider_transaction_id is null and v_p.metodo_wompi is null,
                     'un pago insertado como antes conserva sus valores por omisión (simulado)');
end $$;

-- 4. Cálculo de la política (100 % / porcentaje / 0 %) -----------------------------
do $$
declare v_b uuid; r record;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 100 and r.aplica and r.monto = 200000, 'salida en 100 h con ventana 48 h → 100 %');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 49), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 100, 'salida en 49 h (justo sobre la ventana de 48 h) → 100 %');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 47), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50 and r.monto = 100000, 'salida en 47 h (entre 48 h y 24 h) → 50 %');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 30), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50, 'salida en 30 h → 50 %');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 10), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 0 and not r.aplica and r.monto = 0, 'salida en 10 h (< 24 h) → sin reembolso');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, null, null, 30), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 0, 'plan sin tramo parcial, salida en 30 h (< 48 h) → sin reembolso');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(168, 0, 50, 5), 'confirmada', 'viajero@demo.com', 'wompi');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50, '«Menos de 7 días: 50%» con salida en 5 h → 50 %');

  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(not r.aplica and r.porcentaje = 0, 'reserva sin pago: nada que reembolsar');
end $$;

-- 5. Vista previa para el viajero (solo lectura) -----------------------------------
do $$ begin
  perform set_config('test.res_prev', pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 30), 'confirmada', 'viajero@demo.com', 'wompi')::text, false);
end $$;
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((public.vista_previa_cancelacion(current_setting('test.res_prev')::uuid)->>'porcentaje')::int = 50
                  and (public.vista_previa_cancelacion(current_setting('test.res_prev')::uuid)->>'aplica')::boolean,
                  'el dueño ve que cancelar ahora da 50 %');
reset role;
select pg_temp.ok((select estado = 'confirmada' from bookings where id = current_setting('test.res_prev')::uuid),
                  'la vista previa no cancela nada');
select pg_temp.como('santiago@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$select public.vista_previa_cancelacion(%L)$q$, current_setting('test.res_prev')),
                         'NO_ES_DUENO', 'otro viajero no ve la vista previa de una reserva ajena');
reset role;

-- 6. crear_intento_pago ----------------------------------------------------------------
do $$
declare v_b uuid; v_pd uuid; j json; j2 json; v_otro uuid;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b := pg_temp.mk_reserva(v_pd, 'pendiente_pago', 'viajero@demo.com');
  set local role service_role;
  j := public.crear_intento_pago(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->>'referencia') = (select codigo from bookings where id = v_b) || '-1'
                     and (j->>'amount_in_cents')::bigint = 20000000
                     and (j->>'moneda') = 'COP', 'primer intento: referencia <codigo>-1 y monto en centavos');
  perform pg_temp.ok((j->>'expira_at')::timestamptz = (select created_at + interval '30 minutes' from bookings where id = v_b),
                     'el intento vence cuando vence la retención de 30 min');
  set local role service_role;
  j2 := public.crear_intento_pago(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j2->>'referencia') = (select codigo from bookings where id = v_b) || '-2',
                     'segundo intento: referencia <codigo>-2 (única)');
  perform pg_temp.ok((select count(*) from payment_attempts where booking_id = v_b and estado = 'pendiente') = 2,
                     'quedan dos intentos pendientes registrados');

  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_b, pg_temp.uid('santiago@demo.com')),
                            'NO_ES_DUENO', 'reserva ajena no admite intento');
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, gen_random_uuid(), pg_temp.uid('viajero@demo.com')),
                            'RESERVA_NO_EXISTE', 'reserva inexistente');
  reset role;
  v_otro := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_otro, pg_temp.uid('viajero@demo.com')),
                            'ESTADO_INVALIDO', 'reserva ya confirmada no admite intento');
  reset role;
  v_otro := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  update bookings set created_at = now() - interval '31 minutes' where id = v_otro;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_otro, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_VENCIDA', 'retención de 30 min vencida no admite intento');
  reset role;
  perform pg_temp.ok((select count(*) from payment_attempts where booking_id = v_otro) = 0, 'el intento rechazado no deja filas');
end $$;

-- 7. aplicar_resultado_pago --------------------------------------------------------------
create or replace function pg_temp.mk_intento(p_b uuid) returns text language plpgsql as $$
declare j json;
begin
  set local role service_role;
  j := public.crear_intento_pago(p_b, (select viajero_id from bookings where id = p_b));
  reset role;
  return j->>'referencia';
end $$;

do $$
declare v_b uuid; v_ref text; j json; v_monto bigint;
begin
  -- 7.1 aprobado
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-ok-1', 'APPROVED', 20000000, 'NEQUI', '{"status":"APPROVED"}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'confirmada' and j->>'booking_estado' = 'confirmada', 'APPROVED confirma la reserva');
  perform pg_temp.ok((select estado = 'confirmada' from bookings where id = v_b), 'la reserva quedó confirmada');
  perform pg_temp.ok((select count(*) = 1 and bool_and(provider = 'wompi' and not simulated and estado = 'aprobado'
                                                     and metodo = 'nequi' and provider_transaction_id = 'tx-ok-1'
                                                     and referencia = v_ref and monto = 200000)
                        from payments where booking_id = v_b),
                     'un pago aprobado, provider wompi, simulated=false, método nequi, referencia del intento');
  perform pg_temp.ok((select estado = 'aprobado' and wompi_transaction_id = 'tx-ok-1' from payment_attempts where referencia = v_ref),
                     'el intento quedó aprobado con su transacción');

  -- 7.2 reenvío idempotente
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-ok-1', 'APPROVED', 20000000, 'NEQUI', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'ya_confirmada', 'reenviar APPROVED responde ya_confirmada');
  perform pg_temp.ok((select count(*) from payments where booking_id = v_b) = 1, 'el reenvío no duplica el pago');

  -- 7.3 rechazado / error / anulado dejan la reserva pendiente
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-dec-1', 'DECLINED', 20000000, 'CARD', '{}'::jsonb, 'COP', 'Fondos insuficientes');
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'rechazado' and j->>'booking_estado' = 'pendiente_pago', 'DECLINED no confirma');
  perform pg_temp.ok((select estado = 'rechazado' and status_message = 'Fondos insuficientes' from payment_attempts where referencia = v_ref),
                     'el intento queda rechazado con el mensaje');
  perform pg_temp.ok((select count(*) from payments where booking_id = v_b) = 0, 'rechazado no crea pago');
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-err-1', 'ERROR', 20000000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'rechazado' and (select estado from bookings where id = v_b) = 'pendiente_pago',
                     'ERROR tampoco confirma (la reserva sigue pendiente mientras dure la retención)');
  -- un reintento aprobado posterior sí confirma la misma reserva
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-ok-2', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'confirmada', 'tras un rechazo, un segundo intento aprobado confirma');

  -- 7.4 pendiente
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-pen-1', 'PENDING', 20000000, 'BANCOLOMBIA_TRANSFER', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'pendiente' and (select estado from payment_attempts where referencia = v_ref) = 'pendiente',
                     'PENDING deja el intento pendiente');
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-pen-1', 'APPROVED', 20000000, 'BANCOLOMBIA_TRANSFER', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'confirmada'
                     and (select metodo from payments where booking_id = v_b) = 'bancolombia',
                     'PENDING→APPROVED confirma y BANCOLOMBIA_TRANSFER se mapea a bancolombia');

  -- 7.5 monto distinto
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-mm-1', 'APPROVED', 100, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'monto_no_coincide' and (select estado from bookings where id = v_b) = 'pendiente_pago'
                     and (select count(*) from payments where booking_id = v_b) = 0
                     and (select estado from payment_attempts where referencia = v_ref) = 'monto_no_coincide',
                     'APPROVED con monto distinto no confirma ni crea pago');
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-mm-2', 'APPROVED', 20000000, 'CARD', '{}'::jsonb, 'USD');
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'monto_no_coincide' and (select estado from bookings where id = v_b) = 'pendiente_pago',
                     'APPROVED en otra moneda tampoco confirma');

  -- 7.6 referencia desconocida
  set local role service_role;
  j := public.aplicar_resultado_pago('NO-EXISTE-1', 'tx-x', 'APPROVED', 1, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'referencia_desconocida', 'referencia desconocida se ignora sin error');

  -- 7.7 aprobación tardía (reserva vencida) → reembolso obligatorio del 100 %
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  update bookings set created_at = now() - interval '40 minutes' where id = v_b;
  perform public.expire_stale_bookings();
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-late-1', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'aprobado_tarde' and (select estado from bookings where id = v_b) = 'cancelada',
                     'aprobación tardía: la reserva vencida NO se confirma');
  perform pg_temp.ok((select estado = 'aprobado_tarde' from payment_attempts where referencia = v_ref), 'el intento queda aprobado_tarde');
  perform pg_temp.ok((select count(*) from payments where booking_id = v_b) = 0, 'aprobación tardía no cuenta como venta');
  perform pg_temp.ok((select count(*) = 1 and bool_and(porcentaje = 100 and monto = 200000 and estado = 'pendiente'
                                                       and origen = 'pago_tardio' and wompi_transaction_id = 'tx-late-1'
                                                       and not simulado)
                        from refunds where booking_id = v_b),
                     'queda una obligación de reembolso del 100 % pendiente de la pasarela');
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx-late-1', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'ya_aprobado_tarde' and (select count(*) from refunds where booking_id = v_b) = 1,
                     'reenviar la aprobación tardía no duplica el reembolso');
  perform pg_temp.ok(pg_temp.cupo(v_b) = 10, 'los cupos de la reserva vencida siguen liberados (no se vuelven a restar)');

  -- 7.8 doble pago de una reserva ya confirmada → el segundo cobro se devuelve
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  declare v_ref2 text; begin
    v_ref2 := pg_temp.mk_intento(v_b);
    set local role service_role;
    perform public.aplicar_resultado_pago(v_ref, 'tx-dup-1', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
    j := public.aplicar_resultado_pago(v_ref2, 'tx-dup-2', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
    reset role;
  end;
  perform pg_temp.ok(j->>'resultado' = 'aprobado_tarde' and (select count(*) from payments where booking_id = v_b) = 1
                     and (select count(*) from refunds where booking_id = v_b and wompi_transaction_id = 'tx-dup-2') = 1,
                     'un segundo cobro aprobado de la misma reserva queda como un solo pago y se devuelve');

  -- 7.9 métodos
  perform pg_temp.ok(public.metodo_pago_desde_wompi('CARD') = 'tarjeta' and public.metodo_pago_desde_wompi('PSE') = 'pse'
                     and public.metodo_pago_desde_wompi('NEQUI') = 'nequi' and public.metodo_pago_desde_wompi('DAVIPLATA') = 'daviplata'
                     and public.metodo_pago_desde_wompi('BANCOLOMBIA_QR') = 'bancolombia'
                     and public.metodo_pago_desde_wompi('PCOL') = 'otro' and public.metodo_pago_desde_wompi(null) = 'otro',
                     'mapa de métodos Wompi → enum (lo desconocido no rompe un pago ya cobrado)');
end $$;

-- 8. cancelar_reserva ------------------------------------------------------------------------
do $$
declare v_b uuid; j json; v_cupo0 int; v_pd uuid; v_rid uuid;
begin
  -- 8.1 100 %
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b := pg_temp.mk_reserva(v_pd, 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->>'estado' = 'cancelada' and (j->'reembolso'->>'aplica')::boolean
                     and (j->'reembolso'->>'porcentaje')::int = 100 and (j->'reembolso'->>'monto')::numeric = 200000
                     and j->'reembolso'->>'estado' = 'pendiente', 'cancelar con 100 h: reembolso 100 % pendiente de la pasarela');
  perform pg_temp.ok((select estado = 'cancelada' and cancelled_at is not null from bookings where id = v_b), 'reserva cancelada');
  perform pg_temp.ok(pg_temp.cupo(v_b) = 10, 'cancelar libera los cupos (con tope en cupo_total)');
  perform pg_temp.ok((select count(*) = 1 and bool_and(origen = 'cancelacion' and porcentaje = 100 and monto = 200000
                                                        and estado = 'pendiente' and not simulado
                                                        and wompi_transaction_id is not null and payment_id is not null)
                        from refunds where booking_id = v_b), 'queda una fila de reembolso lista para la pasarela');
  perform pg_temp.ok((select estado = 'aprobado' from payments where booking_id = v_b),
                     'el pago sigue «aprobado» hasta que la pasarela confirme el reembolso');
  -- idempotente
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->>'ya_cancelada')::boolean and (select count(*) from refunds where booking_id = v_b) = 1
                     and pg_temp.cupo(v_b) = 10, 'cancelar dos veces devuelve la misma decisión y no duplica nada');
  -- la pasarela confirma
  select id into v_rid from refunds where booking_id = v_b;
  set local role service_role;
  perform public.registrar_resultado_reembolso(v_rid, 'aprobado', 'rf-1', '{"status":"APPROVED"}'::jsonb);
  reset role;
  perform pg_temp.ok((select estado = 'aprobado' and wompi_refund_id = 'rf-1' from refunds where id = v_rid)
                     and (select estado = 'reembolsado' from payments where booking_id = v_b),
                     'reembolso aprobado por la pasarela → pago «reembolsado»');
  set local role service_role;
  perform public.registrar_resultado_reembolso(v_rid, 'pendiente', 'rf-1', '{}'::jsonb);
  reset role;
  perform pg_temp.ok((select estado = 'aprobado' from refunds where id = v_rid), 'un estado final de reembolso no retrocede');
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.registrar_resultado_reembolso(%L, 'raro', null, '{}'::jsonb)$q$, v_rid),
                            'ESTADO_REEMBOLSO_INVALIDO', 'estado de reembolso inválido');
  reset role;

  -- 8.2 50 %
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 30), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->'reembolso'->>'porcentaje')::int = 50 and (j->'reembolso'->>'monto')::numeric = 100000
                     and (select monto = 100000 and porcentaje = 50 from refunds where booking_id = v_b),
                     'cancelar con 30 h: reembolso del 50 %');

  -- 8.3 0 %
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 10), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(not (j->'reembolso'->>'aplica')::boolean and (j->'reembolso'->>'porcentaje')::int = 0
                     and j->'reembolso'->>'estado' = 'no_aplica' and (j->'reembolso'->>'monto')::numeric = 0
                     and (select estado = 'cancelada' from bookings where id = v_b)
                     and (select count(*) from refunds where booking_id = v_b) = 0
                     and (select estado = 'aprobado' from payments where booking_id = v_b),
                     'cancelar con 10 h: sin reembolso, no se crea fila y el pago sigue aprobado');

  -- 8.4 pendiente de pago: cancela sin reembolso y cierra los intentos
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  perform pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->'reembolso'->>'estado' = 'no_aplica' and (select estado = 'cancelada' from bookings where id = v_b)
                     and pg_temp.cupo(v_b) = 10
                     and (select bool_and(estado = 'expirado') from payment_attempts where booking_id = v_b),
                     'cancelar una reserva sin pagar: sin reembolso, cupos liberados e intentos cerrados');

  -- 8.5 pago simulado heredado: reembolso inmediato sin pasarela
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'simulado');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->'reembolso'->>'estado' = 'aprobado'
                     and (select simulado and estado = 'aprobado' from refunds where booking_id = v_b)
                     and (select estado = 'reembolsado' from payments where booking_id = v_b),
                     'pago simulado heredado: reembolso aprobado al instante, sin llamar a la pasarela');

  -- 8.6 errores
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('santiago@demo.com')),
                            'NO_ES_DUENO', 'cancelar una reserva ajena');
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, gen_random_uuid(), pg_temp.uid('viajero@demo.com')),
                            'RESERVA_NO_EXISTE', 'cancelar una reserva inexistente');
  reset role;
  perform pg_temp.ok((select estado = 'confirmada' from bookings where id = v_b), 'los intentos fallidos no tocan la reserva');
  update bookings set estado = 'completada' where id = v_b;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'ESTADO_INVALIDO', 'una reserva completada no se cancela');
  reset role;
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'cancelada', 'viajero@demo.com');
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'ESTADO_INVALIDO', 'una reserva cancelada sin reembolso previo no se vuelve a cancelar');
  reset role;
end $$;

-- 9. Reembolsos: visibilidad por RLS ------------------------------------------------------------------------
do $$
declare v_b uuid;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  perform public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform set_config('test.res_rls', v_b::text, false);
end $$;
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) from public.refunds where booking_id = current_setting('test.res_rls')::uuid) = 1,
                  'el viajero ve el reembolso de su reserva');
select pg_temp.ok((select count(*) from public.refunds where booking_id = current_setting('test.res_rls')::uuid
                    and estado = 'pendiente' and porcentaje = 100) = 1,
                  'el viajero lee estado y porcentaje (columnas sin raw)');
reset role;
select pg_temp.como('santiago@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) from public.refunds where booking_id = current_setting('test.res_rls')::uuid) = 0,
                  'otro viajero no ve reembolsos ajenos');
reset role;

-- 10. Vencimiento: marca intentos y libera todos los cupos ---------------------------------------------------
do $$
declare v_pd uuid; v_b1 uuid; v_b2 uuid; v_n int;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b1 := pg_temp.mk_reserva(v_pd, 'pendiente_pago', 'viajero@demo.com', null, 2);
  v_b2 := pg_temp.mk_reserva(v_pd, 'pendiente_pago', 'santiago@demo.com', null, 3);
  perform pg_temp.mk_intento(v_b1);
  update bookings set created_at = now() - interval '31 minutes' where id in (v_b1, v_b2);
  select public.expire_stale_bookings() into v_n;
  perform pg_temp.ok(v_n >= 2, 'expire_stale_bookings cuenta las reservas vencidas');
  perform pg_temp.ok((select count(*) from bookings where id in (v_b1, v_b2) and estado = 'cancelada') = 2, 'ambas reservas vencidas se cancelan');
  perform pg_temp.ok((select cupo_disponible from plan_dates where id = v_pd) = 10,
                     'se liberan los cupos de TODAS las reservas vencidas de la misma fecha (5 de 5)');
  perform pg_temp.ok((select estado = 'expirado' from payment_attempts where booking_id = v_b1), 'el intento pendiente pasa a expirado');
  v_b1 := pg_temp.mk_reserva(v_pd, 'pendiente_pago', 'viajero@demo.com');
  perform public.expire_stale_bookings();
  perform pg_temp.ok((select estado = 'pendiente_pago' from bookings where id = v_b1), 'una reserva dentro de los 30 min no se toca');
end $$;

rollback;
