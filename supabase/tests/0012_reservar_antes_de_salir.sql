-- Pruebas de la migración 0012 (no se reserva ni se paga un viaje que ya salió):
--   * create_booking lanza FECHA_YA_SALIO si fecha + hora_salida del plan (Bogotá) es <= now(), sin tocar
--     cupos ni crear reservas; una salida futura (más tarde hoy o mañana) se reserva como siempre.
--   * crear_intento_pago lanza RESERVA_YA_SALIO si bookings.salida_at (la salida congelada) ya pasó,
--     sin crear intentos de pago.
--   * PRESERVE: los demás errores de create_booking y sus permisos no cambian.
-- Todo con fixtures propios (plan y fecha creados aquí): no depende del seed ni de la hora del día.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0012_reservar_antes_de_salir.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
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

create or replace function pg_temp.cupo(p_pd uuid) returns int language sql as $$
  select cupo_disponible from plan_dates where id = p_pd $$;
create or replace function pg_temp.reservas_de(p_pd uuid) returns bigint language sql as $$
  select count(*) from bookings where plan_date_id = p_pd $$;

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

-- 1. Un viaje de hoy que salió hace 1 minuto no se reserva ------------------------------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '-1 minute'); v_cupo int; v_n bigint;
begin
  v_cupo := pg_temp.cupo(v_pd);
  v_n := pg_temp.reservas_de(v_pd);
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 2)$q$, v_pd),
                            'FECHA_YA_SALIO', 'una salida de hace 1 minuto no se reserva');
  reset role;
  perform pg_temp.ok(pg_temp.cupo(v_pd) = v_cupo and pg_temp.reservas_de(v_pd) = v_n,
                     'el rechazo no cambia el cupo (' || v_cupo || ') ni crea reservas');
end $$;

-- 2. Justo en la salida (salida = ahora) también cuenta como «ya salió» ----------------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '0');
begin
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 2)$q$, v_pd),
                            'FECHA_YA_SALIO', 'con salida = ahora la reserva se rechaza');
  reset role;
  perform pg_temp.ok(pg_temp.cupo(v_pd) = 10 and pg_temp.reservas_de(v_pd) = 0, 'sin efectos en cupo ni reservas');
end $$;

-- 3. Una salida hace 5 horas (hoy, o el día de la salida de hoy en Bogotá) tampoco; sin cupo también ------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '-5 hours', 1);
begin
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 1)$q$, v_pd),
                            'FECHA_YA_SALIO', 'una salida de hace 5 horas no se reserva');
  reset role;
end $$;

-- 4. Salidas futuras se reservan como siempre: dentro de 1 minuto (hoy) y mañana --------------------------
do $$
declare v_hoy uuid := pg_temp.mk_fecha(interval '1 minute'); v_manana uuid := pg_temp.mk_fecha(interval '1 day');
        j json; v_salida timestamptz;
begin
  j := pg_temp.reservar(v_hoy, 2);
  perform pg_temp.ok(pg_temp.cupo(v_hoy) = 8 and (j->>'cupos_restantes')::int = 8 and pg_temp.reservas_de(v_hoy) = 1,
                     'una salida dentro de 1 minuto se reserva y descuenta los cupos');
  select salida_at into v_salida from bookings where id = (j->>'booking_id')::uuid;
  perform pg_temp.ok(v_salida = now() + interval '1 minute', 'la reserva congela esa salida (' || v_salida || ')');

  j := pg_temp.reservar(v_manana, 3);
  perform pg_temp.ok(pg_temp.cupo(v_manana) = 7 and pg_temp.reservas_de(v_manana) = 1,
                     'una salida de mañana se reserva y descuenta los cupos');
end $$;

-- 5. Iniciar el pago de una reserva pendiente cuya salida ya pasó -----------------------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '1 day'); v_b uuid; j json;
        v_n int; v_cupo int; v_estado text;
begin
  v_b := (pg_temp.reservar(v_pd, 2)->>'booking_id')::uuid;

  set local role service_role;
  j := public.crear_intento_pago(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->>'referencia') is not null and (select count(*) from payment_attempts where booking_id = v_b) = 1,
                     'antes de la salida se crea el intento de pago (' || (j->>'referencia') || ')');

  delete from payment_attempts where booking_id = v_b;
  update bookings set salida_at = now() - interval '1 minute' where id = v_b;
  v_cupo := pg_temp.cupo(v_pd);
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'pagar una reserva cuya salida pasó hace 1 minuto se rechaza');
  reset role;

  update bookings set salida_at = now() where id = v_b;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.crear_intento_pago(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'con salida = ahora el pago también se rechaza');
  reset role;

  select count(*), max(estado::text) into v_n, v_estado from payment_attempts where booking_id = v_b;
  perform pg_temp.ok(v_n = 0 and pg_temp.cupo(v_pd) = v_cupo
                     and (select estado from bookings where id = v_b) = 'pendiente_pago',
                     'el rechazo no crea intentos ni cambia cupo ni estado de la reserva');
end $$;

-- 6. PRESERVE: los demás errores de create_booking siguen igual y no dejan rastro -------------------------
do $$
declare v_pd uuid := pg_temp.mk_fecha(interval '1 day'); v_borrador uuid := pg_temp.mk_fecha(interval '1 day', 10, 'borrador');
        v_pasada uuid := pg_temp.mk_fecha(interval '-2 days'); v_una uuid := pg_temp.mk_fecha(interval '1 day', 1);
begin
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 0)$q$, v_pd), 'PAX_INVALIDO', 'pax 0 sigue siendo PAX_INVALIDO');
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 21)$q$, v_pd), 'PAX_INVALIDO', 'pax 21 sigue siendo PAX_INVALIDO');
  perform pg_temp.falla_con($q$select public.create_booking(gen_random_uuid(), 1)$q$, 'FECHA_NO_EXISTE', 'fecha inexistente sigue igual');
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 1)$q$, v_borrador), 'PLAN_NO_PUBLICADO', 'plan en borrador sigue igual');
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 1)$q$, v_pasada), 'FECHA_PASADA', 'una fecha de hace 2 días sigue siendo FECHA_PASADA');
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 2)$q$, v_una), 'SIN_CUPO', 'más pax que cupos sigue siendo SIN_CUPO');
  reset role;
  perform pg_temp.ok(pg_temp.cupo(v_pd) = 10 and pg_temp.cupo(v_borrador) = 10 and pg_temp.cupo(v_pasada) = 10
                     and pg_temp.cupo(v_una) = 1
                     and pg_temp.reservas_de(v_pd) + pg_temp.reservas_de(v_borrador) + pg_temp.reservas_de(v_pasada)
                         + pg_temp.reservas_de(v_una) = 0,
                     'ninguno de esos rechazos cambia cupos ni crea reservas');

  perform pg_temp.reservar(v_pd, 1);
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.create_booking(%L, 1)$q$, v_pd),
                            'RESERVA_PENDIENTE_EXISTENTE', 'una segunda reserva pendiente de la misma fecha sigue rechazándose');
  reset role;
  perform pg_temp.ok(pg_temp.cupo(v_pd) = 9 and pg_temp.reservas_de(v_pd) = 1, 'solo cuenta la primera reserva');
end $$;

-- 7. Permisos intactos ------------------------------------------------------------------------------------
select pg_temp.ok(has_function_privilege('authenticated', 'public.create_booking(uuid,int)', 'execute')
                  and has_function_privilege('service_role', 'public.create_booking(uuid,int)', 'execute')
                  and not has_function_privilege('anon', 'public.create_booking(uuid,int)', 'execute'),
                  'create_booking: la ejecutan los viajeros autenticados y no anon');
select pg_temp.ok(has_function_privilege('service_role', 'public.crear_intento_pago(uuid,uuid)', 'execute')
                  and not has_function_privilege('authenticated', 'public.crear_intento_pago(uuid,uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.crear_intento_pago(uuid,uuid)', 'execute'),
                  'crear_intento_pago sigue siendo solo de service_role');
select pg_temp.ok((select prosecdef from pg_proc where oid = 'public.create_booking(uuid,int)'::regprocedure)
                  and (select prosecdef from pg_proc where oid = 'public.crear_intento_pago(uuid,uuid)'::regprocedure),
                  'ambas siguen siendo security definer');

rollback;
