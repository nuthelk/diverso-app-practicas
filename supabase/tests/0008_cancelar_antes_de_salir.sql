-- Pruebas de la migración 0008 (no se cancela una reserva después de la salida):
-- cancelar_reserva y vista_previa_cancelacion lanzan RESERVA_YA_SALIO cuando bookings.salida_at ya pasó
-- y la reserva sigue viva; sin efectos (estado, cupos, pagos y reembolsos intactos). Antes de la salida
-- todo funciona como antes, y el reintento de una cancelación ya hecha sigue siendo idempotente.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0008_cancelar_antes_de_salir.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
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

-- Reserva de prueba insertada directamente (como hacen el seed y las demás pruebas).
create or replace function pg_temp.mk_reserva(p_pd uuid, p_estado public.booking_status, p_email text,
                                               p_pago text default null, p_pax int default 2) returns uuid language plpgsql as $$
declare v_b uuid; v_precio numeric;
begin
  select pl.precio_cop into v_precio from plan_dates pd join plans pl on pl.id = pd.plan_id where pd.id = p_pd;
  update plan_dates set cupo_disponible = cupo_disponible - p_pax where id = p_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T8-' || upper(substr(md5(random()::text), 1, 8)), p_pd, pg_temp.uid(p_email), p_pax, v_precio * p_pax, p_estado)
  returning id into v_b;
  if p_pago is not null then
    insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
    values (v_b, 'tarjeta', 'aprobado', v_precio * p_pax, 'P8-' || substr(md5(random()::text), 1, 10),
            p_pago, p_pago = 'simulado',
            case when p_pago = 'wompi' then 'tx8-' || substr(md5(random()::text), 1, 10) end);
  end if;
  return v_b;
end $$;

-- Estado observable de una reserva, para comprobar que un rechazo no deja rastro.
create or replace function pg_temp.huella(p_b uuid) returns text language sql as $$
  select b.estado::text || '|' || coalesce(b.cancelled_at::text, '-') || '|' || pd.cupo_disponible
         || '|' || (select count(*) from refunds r where r.booking_id = b.id)
         || '|' || coalesce((select string_agg(p.estado::text, ',' order by p.created_at) from payments p where p.booking_id = b.id), '-')
    from bookings b join plan_dates pd on pd.id = b.plan_date_id where b.id = p_b $$;

-- 1. Reserva confirmada y pagada cuyo viaje salió hace 1 minuto ------------------------------------------
do $$
declare v_b uuid; v_antes text;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  update bookings set salida_at = now() - interval '1 minute' where id = v_b;
  v_antes := pg_temp.huella(v_b);
  perform set_config('test.b_salio', v_b::text, false);

  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  perform pg_temp.falla_con(format($q$select public.vista_previa_cancelacion(%L)$q$, v_b),
                            'RESERVA_YA_SALIO', 'la vista previa de una reserva que ya salió se rechaza');
  reset role;

  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'cancelar una reserva confirmada que ya salió se rechaza');
  reset role;

  perform pg_temp.ok(pg_temp.huella(v_b) = v_antes,
                     'el rechazo no cambia estado, cupos, pagos ni reembolsos (' || v_antes || ')');
end $$;

-- 2. Justo en la salida (salida_at = ahora) también cuenta como «ya salió» -------------------------------
do $$
declare v_b uuid := current_setting('test.b_salio')::uuid;
begin
  update bookings set salida_at = now() where id = v_b;
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'con salida_at = ahora la cancelación se rechaza');
  reset role;
end $$;

-- 3. Una reserva pendiente de pago cuyo viaje ya salió tampoco se cancela ---------------------------------
do $$
declare v_b uuid; v_antes text;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  update bookings set salida_at = now() - interval '1 hour' where id = v_b;
  v_antes := pg_temp.huella(v_b);
  set local role service_role;
  perform pg_temp.falla_con(format($q$select public.cancelar_reserva(%L, %L)$q$, v_b, pg_temp.uid('viajero@demo.com')),
                            'RESERVA_YA_SALIO', 'una pendiente de pago que ya salió no se cancela');
  reset role;
  perform pg_temp.ok(pg_temp.huella(v_b) = v_antes, 'la pendiente rechazada queda intacta');
end $$;

-- 4. PRESERVE: antes de la salida cancelar funciona igual que en 0003–0007 ------------------------------
do $$
declare v_pd uuid; v_b uuid; j json;
begin
  -- Lejos de la salida: 100 % de reembolso y cupos devueltos.
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b := pg_temp.mk_reserva(v_pd, 'confirmada', 'viajero@demo.com', 'wompi');
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  j := public.vista_previa_cancelacion(v_b);
  reset role;
  perform pg_temp.ok((j->>'porcentaje')::int = 100 and (j->>'monto')::numeric = 200000,
                     'PRESERVE: la vista previa antes de la salida sigue dando 100 % (200000)');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->>'estado' = 'cancelada' and (j->'reembolso'->>'porcentaje')::int = 100
                     and (j->'reembolso'->>'monto')::numeric = 200000 and (j->>'ya_cancelada')::boolean = false,
                     'PRESERVE: cancelar 100 h antes devuelve el 100 %');
  perform pg_temp.ok((select estado = 'cancelada' from bookings where id = v_b)
                     and (select cupo_disponible = 10 from plan_dates where id = v_pd),
                     'PRESERVE: la reserva queda cancelada y los cupos vuelven');

  -- Un minuto antes de salir: se puede cancelar (sin reembolso por la política).
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  update bookings set salida_at = now() + interval '1 minute' where id = v_b;
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->>'estado' = 'cancelada' and (j->'reembolso'->>'porcentaje')::int = 0
                     and (select estado = 'cancelada' from bookings where id = v_b),
                     'PRESERVE: a 1 minuto de la salida todavía se cancela (0 % por la política)');

  -- Pendiente de pago con salida futura: se cancela sin reembolso.
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok(j->>'estado' = 'cancelada' and (j->'reembolso'->>'aplica')::boolean = false,
                     'PRESERVE: una pendiente con salida futura se cancela sin reembolso');
end $$;

-- 5. PRESERVE: el reintento de una cancelación ya hecha sigue siendo idempotente aunque el viaje ya salió -
do $$
declare v_b uuid; j json; j2 json;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  update bookings set salida_at = now() - interval '1 day' where id = v_b;
  set local role service_role;
  j2 := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j2->>'ya_cancelada')::boolean and (j2->'reembolso'->>'refund_id') = (j->'reembolso'->>'refund_id'),
                     'PRESERVE: repetir la cancelación tras la salida devuelve el mismo reembolso (idempotente)');
end $$;

-- 6. Permisos intactos ------------------------------------------------------------------------------------
select pg_temp.ok(has_function_privilege('authenticated', 'public.vista_previa_cancelacion(uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.vista_previa_cancelacion(uuid)', 'execute'),
                  'vista_previa_cancelacion sigue siendo del viajero autenticado');
select pg_temp.ok(has_function_privilege('service_role', 'public.cancelar_reserva(uuid,uuid)', 'execute')
                  and not has_function_privilege('authenticated', 'public.cancelar_reserva(uuid,uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.cancelar_reserva(uuid,uuid)', 'execute'),
                  'cancelar_reserva sigue siendo solo de service_role');

rollback;
