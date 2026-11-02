-- Pruebas de la migración 0013 (el checkout de Wompi no sobrevive a la salida):
--   * crear_intento_pago firma una expiración = least(created_at + 30 min, salida_at): una reserva hecha
--     minutos antes de partir no se puede pagar después de la salida.
--   * PRESERVE: una salida lejana conserva created_at + 30 min; la retención vencida sigue siendo
--     RESERVA_VENCIDA; la salida ya pasada sigue siendo RESERVA_YA_SALIO; los permisos no cambian.
-- Fixtures propios (plan y fecha creados aquí). Uso (sobre la BD local ya migrada; NO requiere db reset):
--   (echo "begin;"; cat supabase/tests/0013_checkout_vence_en_la_salida.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
end $$;
select set_config('test.uid_' || md5(e), (select id::text from auth.users where email = e), false)
  from unnest(array['viajero@demo.com']) e;
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

-- Fecha de plan de prueba cuya salida (fecha + hora_salida, Bogotá) ocurre dentro de p_desfase respecto a
-- now() (negativo = ya salió). now() es fijo dentro de la transacción: p_desfase = 0 es exactamente «ahora».
create or replace function pg_temp.mk_fecha(p_desfase interval, p_cupo int default 10,
                                             p_estado public.plan_status default 'publicado') returns uuid language plpgsql as $$
declare v_plan uuid; v_local timestamp; v_pd uuid;
begin
  v_local := (now() + p_desfase) at time zone 'America/Bogota';
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado, hora_salida)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST salida', 'Guatapé', 'aventura', 100000,
          p_estado, v_local::time)
  returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
  values (v_plan, v_local::date, p_cupo, p_cupo) returning id into v_pd;
  return v_pd;
end $$;

-- Fecha de plan de prueba cuya salida (fecha + hora_salida, Bogotá) ocurre dentro de p_desfase respecto a
-- now() (negativo = ya salió). now() es fijo dentro de la transacción: p_desfase = 0 es exactamente «ahora».
create or replace function pg_temp.mk_fecha(p_desfase interval, p_cupo int default 10,
                                             p_estado public.plan_status default 'publicado') returns uuid language plpgsql as $$
declare v_plan uuid; v_local timestamp; v_pd uuid;
begin
  v_local := (now() + p_desfase) at time zone 'America/Bogota';
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado, hora_salida)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST salida', 'Guatapé', 'aventura', 100000,
          p_estado, v_local::time)
  returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
  values (v_plan, v_local::date, p_cupo, p_cupo) returning id into v_pd;
  return v_pd;
end $$;

-- Reserva como el viajero autenticado (la RPC real).
create or replace function pg_temp.reservar(p_pd uuid, p_pax int default 2) returns json language plpgsql as $$
declare j json;
begin
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  j := public.create_booking(p_pd, p_pax);
  reset role;
  return j;
end $$;

-- 1. Reserva hecha 10 minutos antes de la salida: el checkout vence en la salida, no 30 min después -------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '10 minutes'); v_b uuid; j json;
begin
  v_b := (pg_temp.reservar(v_pd, 1)->>'booking_id')::uuid;
  set local role service_role;
  j := public.crear_intento_pago(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->>'expira_at')::timestamptz <= (select salida_at from bookings where id = v_b),
                     'el checkout de Wompi vence a más tardar en la salida');
  perform pg_temp.ok((select expira_at from payment_attempts where booking_id = v_b) = (j->>'expira_at')::timestamptz,
                     'el intento guardado tiene esa misma expiración');
end $$;

-- 2. PRESERVE: una salida dentro de 2 días conserva created_at + 30 minutos ----------------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '2 days'); v_b uuid; j json;
begin
  v_b := (pg_temp.reservar(v_pd, 1)->>'booking_id')::uuid;
  set local role service_role;
  j := public.crear_intento_pago(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->>'expira_at')::timestamptz = (select created_at + interval '30 minutes' from bookings where id = v_b),
                     'con salida lejana el checkout sigue venciendo a los 30 minutos de la reserva');
end $$;

-- 3. PRESERVE: la retención vencida y la salida pasada se siguen rechazando con su código ------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '2 days'); v_b uuid;
begin
  v_b := (pg_temp.reservar(v_pd, 1)->>'booking_id')::uuid;
  update bookings set created_at = now() - interval '31 minutes' where id = v_b;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_VENCIDA', 'una retención de más de 30 minutos sigue siendo RESERVA_VENCIDA');
  reset role;

  update bookings set created_at = now(), salida_at = now() - interval '1 minute' where id = v_b;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'una salida ya pasada sigue siendo RESERVA_YA_SALIO');
  reset role;
  perform pg_temp.ok((select count(*) from payment_attempts where booking_id = v_b) = 0, 'ninguno de los rechazos crea intentos');
end $$;

-- 4. Permisos intactos ------------------------------------------------------------------------------------
select pg_temp.ok(has_function_privilege('service_role', 'public.crear_intento_pago(uuid,uuid)', 'execute')
                  and not has_function_privilege('authenticated', 'public.crear_intento_pago(uuid,uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.crear_intento_pago(uuid,uuid)', 'execute'),
                  'crear_intento_pago sigue siendo solo de service_role');
select pg_temp.ok((select prosecdef from pg_proc where oid = 'public.crear_intento_pago(uuid,uuid)'::regprocedure),
                  'crear_intento_pago sigue siendo security definer');

rollback;
