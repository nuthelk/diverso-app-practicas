-- Pruebas de la migración 0004 (dispersión de prueba a agencias: liquidaciones semanales, anticipos,
-- cuentas para dispersiones, permisos). Nada de esto mueve dinero real.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/0004_dispersiones.sql
-- Todo corre dentro de una transacción que termina en ROLLBACK.
-- Las fechas son fijas (febrero de 2026) y el «ahora» se pasa a las funciones de trabajo
-- (procesar_*), de modo que el resultado no depende del día en que se ejecute la prueba.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text, p_rol text default 'authenticated') returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
  perform set_config('request.jwt.claim.role', p_rol, false);
end $$;
select set_config('test.uid_' || md5(e), (select id::text from auth.users where email = e), false)
  from unnest(array['viajero@demo.com', 'ecoandes@demo.com', 'graffiti@demo.com', 'patrimonio@demo.com', 'admin@demo.com']) e;
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

-- Agencia de prueba (guarda su id bajo test.ag_<clave>).
create or replace function pg_temp.mk_agencia(p_clave text, p_rnt text, p_owner text, p_comision numeric default 12)
returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into agencies (owner_user_id, nombre, numero_rnt, matricula_camara_comercio, comision_pct)
  values (case when p_owner is null then null else pg_temp.uid(p_owner) end, 'TEST ' || p_clave, p_rnt, '12345678', p_comision)
  returning id into v;
  perform set_config('test.ag_' || p_clave, v::text, false);
  return v;
end $$;
create or replace function pg_temp.ag(p_clave text) returns uuid language sql as $$
  select current_setting('test.ag_' || p_clave)::uuid $$;

-- Servicio de prueba: plan + fecha + reserva (+ pago). Devuelve el id de la reserva y lo guarda bajo test.b_<clave>.
create or replace function pg_temp.mk_serv(p_clave text, p_ag uuid, p_fecha date, p_hora time, p_monto numeric,
                                           p_estado public.booking_status default 'confirmada',
                                           p_pago public.payment_status default 'aprobado',
                                           p_creada timestamptz default timestamptz '2026-01-01 12:00Z')
returns uuid language plpgsql as $$
declare v_plan uuid; v_pd uuid; v_b uuid;
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, hora_salida)
  values (p_ag, 'TEST dispersión', 'Guatapé', 'aventura', p_monto, p_hora) returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible) values (v_plan, p_fecha, 10, 10) returning id into v_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado, created_at)
  values ('T4-' || upper(substr(md5(random()::text), 1, 8)), v_pd, pg_temp.uid('viajero@demo.com'), 1, p_monto, p_estado, p_creada)
  returning id into v_b;
  if p_pago is not null then
    insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated)
    values (v_b, 'tarjeta', p_pago, p_monto, 'P4-' || substr(md5(random()::text), 1, 12), 'wompi', false);
  end if;
  perform set_config('test.b_' || p_clave, v_b::text, false);
  return v_b;
end $$;
create or replace function pg_temp.b(p_clave text) returns uuid language sql as $$
  select current_setting('test.b_' || p_clave)::uuid $$;

-- n servicios ya prestados en enero de 2026 (confirmados y pagados).
create or replace function pg_temp.mk_pasados(p_ag uuid, p_n int) returns void language plpgsql as $$
begin
  for i in 1..p_n loop
    perform pg_temp.mk_serv('pas' || i, p_ag, date '2026-01-04' + i, time '06:00', 50000);
  end loop;
end $$;

-- Cancela una reserva como lo deja reservas-cancelar: con un reembolso de cancelación del p_pct %
-- en el estado p_estado (el pago pasa a «reembolsado» solo si Wompi lo aprobó).
create or replace function pg_temp.reembolsar(p_b uuid, p_pct int default 100, p_estado text default 'aprobado')
returns void language plpgsql as $$
declare v_m numeric;
begin
  update bookings set estado = 'cancelada', cancelled_at = now() where id = p_b returning monto_total into v_m;
  insert into refunds (booking_id, payment_id, referencia, monto, porcentaje, estado, origen, motivo)
  values (p_b, (select id from payments where booking_id = p_b), 'RF-T4-' || substr(md5(random()::text), 1, 10),
          round(v_m * p_pct / 100, 2), p_pct, p_estado, 'cancelacion', 'prueba');
  if p_estado = 'aprobado' then
    update payments set estado = 'reembolsado' where booking_id = p_b;
  end if;
end $$;

-- Reembolso que Wompi resuelve después (webhook).
create or replace function pg_temp.resolver_reembolso(p_b uuid, p_estado text) returns void language plpgsql as $$
begin
  update refunds set estado = p_estado where booking_id = p_b and origen = 'cancelacion';
  if p_estado = 'aprobado' then
    update payments set estado = 'reembolsado' where booking_id = p_b;
  end if;
end $$;

-- Cancelación sin reembolso (política 0 %): no hay fila en refunds y el pago sigue «aprobado».
create or replace function pg_temp.cancelar_sin_reembolso(p_b uuid) returns void language plpgsql as $$
begin
  update bookings set estado = 'cancelada', cancelled_at = now() where id = p_b;
end $$;

create or replace function pg_temp.guarda(p_clave text, p_val text) returns void language sql as $$
  select set_config('test.r_' || p_clave, p_val, false) $$;
create or replace function pg_temp.r(p_clave text) returns json language sql as $$
  select current_setting('test.r_' || p_clave)::json $$;

-- 1. Contrato de permisos y cron -----------------------------------------------------
do $$
declare f text; r text;
begin
  -- Trabajo interno (cron / service_role): nadie más.
  foreach f in array array[
    'public.procesar_liquidaciones(date,timestamptz)',
    'public.procesar_anticipos(timestamptz)',
    'public.candidatos_anticipo(timestamptz)',
    'public.candidatos_semana(date,date)',
    'public.contar_servicios_prestados(uuid,timestamptz)',
    'public.exigir_admin_o_servicio()'
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
  end loop;
  -- Puntos de entrada del panel: authenticated (la función exige admin) y service_role; nunca anon ni PUBLIC.
  foreach f in array array[
    'public.generar_liquidaciones(date)',
    'public.generar_anticipos()',
    'public.ejecutar_liquidacion(uuid)'
  ] loop
    if has_function_privilege('anon', f, 'execute') then
      raise exception 'FALLA: anon puede ejecutar %', f;
    end if;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0) then
      raise exception 'FALLA: PUBLIC puede ejecutar %', f;
    end if;
    if not has_function_privilege('service_role', f, 'execute') then
      raise exception 'FALLA: service_role no puede ejecutar %', f;
    end if;
  end loop;
  raise notice 'OK  funciones de dispersión: ni PUBLIC ni anon; el trabajo interno tampoco para authenticated';
end $$;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if has_function_privilege(r, 'public.expire_stale_bookings()', 'execute') then
      raise exception 'FALLA: % puede ejecutar expire_stale_bookings()', r;
    end if;
  end loop;
  if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
              where p.oid = 'public.expire_stale_bookings()'::regprocedure and a.grantee = 0) then
    raise exception 'FALLA: PUBLIC puede ejecutar expire_stale_bookings()';
  end if;
  raise notice 'OK  expire_stale_bookings() ya no la ejecutan anon ni authenticated';
end $$;
select pg_temp.ok(has_function_privilege('service_role', 'public.expire_stale_bookings()', 'execute'),
                  'service_role conserva expire_stale_bookings()');
select pg_temp.ok(exists (select 1 from cron.job where jobname = 'expirar-reservas-pendientes' and active
                           and command ilike '%expire_stale_bookings%'),
                  'pg_cron sigue ejecutando expire_stale_bookings (corre como postgres)');
select pg_temp.ok(exists (select 1 from cron.job where jobname = 'liquidacion-semanal' and active
                           and schedule = '0 11 * * 1' and command ilike '%procesar_liquidaciones%'),
                  'pg_cron: liquidación semanal los lunes 11:00 UTC (06:00 Bogotá)');
select pg_temp.ok(exists (select 1 from cron.job where jobname = 'anticipos-por-hora' and active
                           and schedule = '0 * * * *' and command ilike '%procesar_anticipos%'),
                  'pg_cron: anticipos cada hora');

-- Tablas: anon no toca nada; authenticated nunca escribe liquidaciones.
select pg_temp.como(null, 'anon');
set role anon;
select pg_temp.falla_con($q$select count(*) from public.agency_payout_accounts$q$, 'permission denied', 'anon no lee cuentas para dispersiones');
select pg_temp.falla_con($q$select count(*) from public.liquidaciones$q$, 'permission denied', 'anon no lee liquidaciones');
select pg_temp.falla_con($q$select count(*) from public.liquidacion_items$q$, 'permission denied', 'anon no lee items de liquidación');
select pg_temp.falla_con($q$select public.generar_anticipos()$q$, 'permission denied', 'anon no puede generar anticipos');
select pg_temp.falla_con($q$select public.procesar_anticipos()$q$, 'permission denied', 'anon no puede llamar el trabajo interno');
reset role;

-- 2. Escenario ------------------------------------------------------------------------
-- D: dueña ecoandes, 12 %, 10 servicios pasados.   G: dueña graffiti, 10 pasados.
-- E9: 9 pasados (más 3 cancelados que no cuentan).  BL: dueña patrimonio, 10 pasados, anticipo bloqueado.
-- Q: comisión 10 %, para probar los límites de la semana.
select pg_temp.mk_agencia('D', '9900001', 'ecoandes@demo.com');
select pg_temp.mk_agencia('G', '9900002', 'graffiti@demo.com');
select pg_temp.mk_agencia('E9', '9900003', null);
select pg_temp.mk_agencia('BL', '9900004', 'patrimonio@demo.com');
select pg_temp.mk_agencia('Q', '9900005', null, 10);
select pg_temp.mk_agencia('V', '9900006', null);
select pg_temp.mk_serv('V1', pg_temp.ag('V'), date '2026-01-12', time '06:00', 50000);
select pg_temp.mk_pasados(pg_temp.ag('D'), 10);
select pg_temp.mk_pasados(pg_temp.ag('G'), 10);
select pg_temp.mk_pasados(pg_temp.ag('E9'), 9);
select pg_temp.mk_pasados(pg_temp.ag('BL'), 10);
do $$ begin
  for i in 1..3 loop
    perform pg_temp.mk_serv('can' || i, pg_temp.ag('E9'), date '2026-01-20', time '06:00', 50000, 'cancelada', 'reembolsado');
  end loop;
  perform pg_temp.mk_serv('pend9', pg_temp.ag('E9'), date '2026-01-21', time '06:00', 50000, 'pendiente_pago', null);
end $$;
update agencies set anticipo_bloqueado = true where id = pg_temp.ag('BL');

select pg_temp.ok((select anticipo_bloqueado = false from agencies where id = pg_temp.ag('D')),
                  'agencies.anticipo_bloqueado vale false por omisión');
select pg_temp.ok(public.contar_servicios_prestados(pg_temp.ag('E9'), timestamptz '2026-02-03 11:00Z') = 9,
                  '9 servicios prestados (las canceladas y las pendientes de pago no cuentan)');
select pg_temp.ok(public.contar_servicios_prestados(pg_temp.ag('D'), timestamptz '2026-02-03 11:00Z') = 10,
                  '10 servicios prestados');
select pg_temp.ok(public.contar_servicios_prestados(pg_temp.ag('D'), timestamptz '2026-01-08 10:59Z') = 3,
                  'solo cuentan los servicios cuya salida ya pasó en ese momento (la del 8 de enero, 06:00 Bogotá = 11:00Z, no)');

-- Servicios con salida en la ventana de anticipo (salida 2026-02-04 06:00 Bogotá = 11:00Z).
select pg_temp.mk_serv('K1', pg_temp.ag('D'), date '2026-02-04', time '06:00', 100000);
select pg_temp.mk_serv('K2', pg_temp.ag('D'), date '2026-02-05', time '06:00', 200000);       -- justo 48 h
select pg_temp.mk_serv('K3', pg_temp.ag('D'), date '2026-02-05', time '06:00:01', 100000);    -- 48 h y 1 s: fuera
select pg_temp.mk_serv('K4', pg_temp.ag('D'), date '2026-02-04', time '06:00', 80000);        -- se reembolsa luego
select pg_temp.mk_serv('K5', pg_temp.ag('D'), date '2026-02-07', time '06:00', 60000);        -- sin anticipo, se reembolsa
select pg_temp.mk_serv('K6', pg_temp.ag('D'), date '2026-02-04', time '06:00', 90000, 'pendiente_pago', null);  -- sin pagar
select pg_temp.mk_serv('K7', pg_temp.ag('D'), date '2026-02-04', time '06:00', 90000, 'cancelada', 'reembolsado'); -- cancelada
select pg_temp.mk_serv('F1', pg_temp.ag('E9'), date '2026-02-04', time '06:00', 100000);
select pg_temp.mk_serv('L1', pg_temp.ag('BL'), date '2026-02-04', time '06:00', 100000);
select pg_temp.mk_serv('G1', pg_temp.ag('G'), date '2026-02-03', time '06:00', 90000);

-- 3. Anticipos --------------------------------------------------------------------------
select pg_temp.guarda('ant0', public.procesar_anticipos(timestamptz '2026-02-03 11:00:00Z')::text);

select pg_temp.ok((select count(*) = 1 from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'anticipo'),
                  'agencia con 10 servicios: un solo lote de anticipo');
select pg_temp.ok((select count(*) = 3 from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('D') and i.tipo = 'anticipo'
                      and i.booking_id in (pg_temp.b('K1'), pg_temp.b('K2'), pg_temp.b('K4'))),
                  'anticipo de K1, K2 (justo a 48 h) y K4');
select pg_temp.ok(not exists (select 1 from liquidacion_items where booking_id in (pg_temp.b('K3'), pg_temp.b('K5'), pg_temp.b('K6'), pg_temp.b('K7'))),
                  'sin anticipo: a 48 h y 1 s, fuera de ventana (K5), sin pagar (K6) o cancelada (K7)');
select pg_temp.ok((select i.monto_bruto = 30000 and i.comision = 3600 and i.monto_neto = 26400
                     from liquidacion_items i where i.booking_id = pg_temp.b('K1') and i.tipo = 'anticipo'),
                  'anticipo = 30 % del neto: bruto 30.000, comisión 3.600 (12 %), neto 26.400');
select pg_temp.ok((select l.monto_bruto = 114000 and l.comision = 13680 and l.monto_neto = 100320
                          and l.anticipos_descontados = 0 and l.monto_a_pagar = 100320
                          and l.estado = 'pendiente' and l.referencia_prueba is null
                          and l.periodo_inicio = date '2026-02-04' and l.periodo_fin = date '2026-02-05'
                     from liquidaciones l where l.agency_id = pg_temp.ag('D') and l.tipo = 'anticipo'),
                  'liquidación de anticipo: totales = suma de sus items, pendiente y sin referencia');
select pg_temp.ok((select count(*) = 0 from liquidacion_items where booking_id = pg_temp.b('F1')),
                  '9 servicios prestados: sin anticipo');
select pg_temp.ok((select count(*) = 0 from liquidacion_items where booking_id = pg_temp.b('L1')),
                  'agencia con anticipo bloqueado: sin anticipo aunque tenga 10 servicios');

-- 10.º servicio → ya hay anticipo; desbloqueo → ya hay anticipo.
select pg_temp.mk_serv('pas10', pg_temp.ag('E9'), date '2026-01-30', time '06:00', 50000);
update agencies set anticipo_bloqueado = false where id = pg_temp.ag('BL');
select pg_temp.guarda('ant1', public.procesar_anticipos(timestamptz '2026-02-03 11:00:00Z')::text);
select pg_temp.ok((select count(*) = 1 from liquidacion_items where booking_id = pg_temp.b('F1') and tipo = 'anticipo'),
                  'con el servicio n.º 10 la agencia recibe anticipo');
select pg_temp.ok((select count(*) = 1 from liquidacion_items where booking_id = pg_temp.b('L1') and tipo = 'anticipo'),
                  'al desbloquear la agencia recibe su anticipo');
select pg_temp.ok((select count(*) = 1 from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'anticipo')
                  and (select count(*) = 3 from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                        where l.agency_id = pg_temp.ag('D') and i.tipo = 'anticipo'),
                  'idempotente: repetir los anticipos no duplica items ni liquidaciones');
select pg_temp.falla_con(format($q$insert into liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto)
                                    values (%L, %L, 'anticipo', 1, 0, 1)$q$,
                                (select id from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'anticipo'), pg_temp.b('K1')),
                         'liquidacion_items_booking_id_tipo_key', 'la restricción (booking_id, tipo) impide duplicar un item');

-- K4 y K5 se reembolsan antes de la liquidación semanal.
select pg_temp.reembolsar(pg_temp.b('K4'));
select pg_temp.reembolsar(pg_temp.b('K5'));

-- 4. Liquidación semanal ------------------------------------------------------------------
-- Q: límites de la semana lun 2 – dom 8 de febrero de 2026.
select pg_temp.mk_serv('Q_ant', pg_temp.ag('Q'), date '2026-02-01', time '06:00', 70000);   -- domingo anterior: fuera
select pg_temp.mk_serv('Q_lun', pg_temp.ag('Q'), date '2026-02-02', time '06:00', 100000);  -- lunes: dentro
select pg_temp.mk_serv('Q_mie', pg_temp.ag('Q'), date '2026-02-04', time '06:00', 20000, 'completada');
select pg_temp.mk_serv('Q_dom', pg_temp.ag('Q'), date '2026-02-08', time '23:00', 50000);   -- domingo: dentro
select pg_temp.mk_serv('Q_sig', pg_temp.ag('Q'), date '2026-02-09', time '06:00', 30000);   -- lunes siguiente: fuera
select pg_temp.mk_serv('Q_pen', pg_temp.ag('Q'), date '2026-02-03', time '06:00', 60000, 'pendiente_pago', null);
select pg_temp.mk_serv('Q_can', pg_temp.ag('Q'), date '2026-02-03', time '06:00', 40000, 'cancelada', 'reembolsado');
select pg_temp.mk_serv('Q_reem', pg_temp.ag('Q'), date '2026-02-03', time '06:00', 25000, 'confirmada', 'reembolsado');

-- La semana debe haber terminado en hora de Bogotá: domingo 8 de febrero 23:59:59 aún no.
select pg_temp.falla_con($q$select public.procesar_liquidaciones(date '2026-02-04', timestamptz '2026-02-09 04:59:59Z')$q$,
                         'SEMANA_NO_TERMINADA', 'domingo 23:59:59 en Bogotá (lunes en UTC): la semana aún no termina');
select pg_temp.falla_con($q$select public.procesar_liquidaciones(date '2026-02-09', timestamptz '2026-02-12 11:00Z')$q$,
                         'SEMANA_NO_TERMINADA', 'una semana en curso no se liquida');
select pg_temp.ok((select count(*) = 0 from liquidaciones where tipo = 'semanal'), 'los intentos rechazados no dejan liquidaciones');

-- Lunes 06:00 Bogotá (11:00Z): sin semana → la anterior (lun 2 – dom 8).
select pg_temp.guarda('sem0', public.procesar_liquidaciones(null, timestamptz '2026-02-09 11:00:00Z')::text);
select pg_temp.ok((pg_temp.r('sem0')->>'periodo_inicio') = '2026-02-02' and (pg_temp.r('sem0')->>'periodo_fin') = '2026-02-08',
                  'sin semana indicada se liquida la anterior, de lunes a domingo (Bogotá)');

select pg_temp.ok((select l.monto_bruto = 170000 and l.comision = 17000 and l.monto_neto = 153000
                          and l.anticipos_descontados = 0 and l.monto_a_pagar = 153000 and l.estado = 'pendiente'
                          and l.periodo_inicio = date '2026-02-02' and l.periodo_fin = date '2026-02-08'
                     from liquidaciones l where l.agency_id = pg_temp.ag('Q') and l.tipo = 'semanal'),
                  'Q (10 %): lunes + miércoles completado + domingo = 170.000 bruto, 17.000 comisión, 153.000 neto');
select pg_temp.ok((select array_agg(i.booking_id order by i.booking_id) = (select array_agg(x order by x) from unnest(array[pg_temp.b('Q_lun'), pg_temp.b('Q_mie'), pg_temp.b('Q_dom')]) x)
                     from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('Q') and l.tipo = 'semanal'),
                  'Q: quedan fuera el domingo anterior, el lunes siguiente, pendiente de pago, cancelada y reembolsada');
select pg_temp.ok((select count(*) = 3 and bool_and(i.tipo = 'servicio') from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('Q')),
                  'Q: tres items de tipo servicio');

-- D: descuento de anticipos y ajuste negativo por reembolso.
select pg_temp.ok((select count(*) = 3 from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('D') and l.tipo = 'semanal' and i.tipo = 'servicio'
                      and i.booking_id in (pg_temp.b('K1'), pg_temp.b('K2'), pg_temp.b('K3'))),
                  'D: se liquidan K1, K2 y K3; K4 y K5 (reembolsadas), K6 (sin pagar) y K7 (cancelada) quedan fuera');
select pg_temp.ok((select i.monto_bruto = -24000 and i.comision = -2880 and i.monto_neto = -21120
                     from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('D') and l.tipo = 'semanal' and i.tipo = 'ajuste' and i.booking_id = pg_temp.b('K4')),
                  'K4 reembolsada con anticipo: ajuste negativo igual al anticipo (−24.000 / −2.880 / −21.120)');
select pg_temp.ok((select count(*) = 0 from liquidacion_items where booking_id = pg_temp.b('K5') and tipo = 'ajuste'),
                  'K5 reembolsada sin anticipo: no hay ajuste');
select pg_temp.ok((select l.monto_bruto = 376000 and l.comision = 45120 and l.monto_neto = 330880
                          and l.anticipos_descontados = 79200 and l.monto_a_pagar = 251680
                     from liquidaciones l where l.agency_id = pg_temp.ag('D') and l.tipo = 'semanal'),
                  'D: neto 352.000 − ajuste 21.120 = 330.880; anticipos descontados 79.200 (K1 + K2, no K3); a pagar 251.680');
select pg_temp.ok((select bool_and(l.monto_bruto = s.b and l.comision = s.c and l.monto_neto = s.n
                                    and l.monto_a_pagar = s.n - l.anticipos_descontados)
                     from liquidaciones l
                     join lateral (select sum(monto_bruto) b, sum(comision) c, sum(monto_neto) n
                                     from liquidacion_items where liquidacion_id = l.id) s on true
                    where l.agency_id in (pg_temp.ag('D'), pg_temp.ag('Q'), pg_temp.ag('G'))),
                  'los totales de cada liquidación son la suma de sus items y a pagar = neto − anticipos descontados');
select pg_temp.ok((select count(*) = 1 from liquidaciones where agency_id = pg_temp.ag('G') and tipo = 'semanal'),
                  'G: una liquidación semanal por su servicio de la semana');
select pg_temp.ok((select count(*) = 0 from liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'semanal'),
                  'agencia sin servicios en la semana: sin liquidación semanal');

-- Idempotencia: repetir, o pedir la misma semana con otra fecha de ella, no cambia nada.
create temp table t4_antes as
  select (select count(*) from liquidaciones) l, (select count(*) from liquidacion_items) i,
         (select sum(monto_a_pagar) from liquidaciones) pagar;
select pg_temp.guarda('sem1', public.procesar_liquidaciones(date '2026-02-04', timestamptz '2026-02-09 11:00:00Z')::text);
select pg_temp.guarda('sem2', public.procesar_liquidaciones(date '2026-02-02', timestamptz '2026-02-20 11:00:00Z')::text);
select pg_temp.ok((select (a.l, a.i, a.pagar) = (select count(*), (select count(*) from liquidacion_items), sum(monto_a_pagar) from liquidaciones)
                     from t4_antes a),
                  'idempotente: generar dos veces la semana (también con otra fecha de la misma semana) no duplica nada');
select pg_temp.ok((pg_temp.r('sem1')->>'periodo_inicio') = '2026-02-02', 'un miércoles se normaliza al lunes de su semana');
select pg_temp.ok((pg_temp.r('sem1')->>'liquidaciones')::int = 0 and (pg_temp.r('sem1')->>'items')::int = 0,
                  'la segunda generación informa 0 liquidaciones y 0 items nuevos');
select pg_temp.falla_con(format($q$insert into liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto)
                                    values (%L, %L, 'servicio', 1, 0, 1)$q$,
                                (select id from liquidaciones where agency_id = pg_temp.ag('G') and tipo = 'semanal'), pg_temp.b('K1')),
                         'liquidacion_items_booking_id_tipo_key', 'un servicio no puede liquidarse dos veces');

-- 4b. Dinero retenido de cancelaciones y saldos que no se quedan colgados -------------------------
-- Semana lun 9 – dom 15 de febrero de 2026 (se liquida el lunes 16, 11:00Z) y la siguiente (lunes 23).
-- RA: sin anticipo.  RB/RN/RZ/RS: 10 servicios prestados (anticipo).  Todas al 12 %.
select pg_temp.mk_agencia('RA', '9900011', null);
select pg_temp.mk_agencia('RB', '9900012', null);
select pg_temp.mk_agencia('RN', '9900013', null);
select pg_temp.mk_agencia('RZ', '9900014', null);
select pg_temp.mk_agencia('RS', '9900015', null);
select pg_temp.mk_pasados(pg_temp.ag('RB'), 10);
select pg_temp.mk_pasados(pg_temp.ag('RN'), 10);
select pg_temp.mk_pasados(pg_temp.ag('RZ'), 10);
select pg_temp.mk_pasados(pg_temp.ag('RS'), 10);

-- RA: lo no reembolsado es de la agencia (menos la comisión de Diverso).
select pg_temp.mk_serv('X0', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);    -- 0 %: sin fila en refunds
select pg_temp.mk_serv('X50', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);   -- 50 % aprobado
select pg_temp.mk_serv('XP', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);    -- 50 % pendiente
select pg_temp.mk_serv('XR', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);    -- 50 % rechazado
select pg_temp.mk_serv('X100', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);  -- 100 % aprobado
select pg_temp.mk_serv('XS', pg_temp.ag('RA'), date '2026-02-10', time '06:00', 100000);    -- pago reembolsado sin fila de refund (dato incoherente)
select pg_temp.cancelar_sin_reembolso(pg_temp.b('X0'));
select pg_temp.reembolsar(pg_temp.b('X50'), 50, 'aprobado');
select pg_temp.reembolsar(pg_temp.b('XP'), 50, 'pendiente');
select pg_temp.reembolsar(pg_temp.b('XR'), 50, 'rechazado');
select pg_temp.reembolsar(pg_temp.b('X100'), 100, 'aprobado');
update bookings set estado = 'cancelada' where id = pg_temp.b('XS');
update payments set estado = 'reembolsado' where booking_id = pg_temp.b('XS');

-- RB / RN / RZ: con anticipo (salida el 11 de febrero 06:00 Bogotá = 48 h después del lunes 9, 11:00Z).
select pg_temp.mk_serv('B50', pg_temp.ag('RB'), date '2026-02-11', time '06:00', 200000);
select pg_temp.mk_serv('B80', pg_temp.ag('RB'), date '2026-02-11', time '06:00', 100000);
select pg_temp.mk_serv('N80', pg_temp.ag('RN'), date '2026-02-11', time '06:00', 100000);
select pg_temp.mk_serv('Z70', pg_temp.ag('RZ'), date '2026-02-11', time '06:00', 100000);
-- RS: reservas creadas hace menos de 1 hora no reciben anticipo (protege la limpieza de las pruebas de integración).
select pg_temp.mk_serv('S15', pg_temp.ag('RS'), date '2026-02-10', time '06:00', 100000, 'confirmada', 'aprobado', timestamptz '2026-02-09 10:45Z');
select pg_temp.mk_serv('S90', pg_temp.ag('RS'), date '2026-02-10', time '06:00', 100000, 'confirmada', 'aprobado', timestamptz '2026-02-09 09:30Z');
select pg_temp.mk_serv('S05', pg_temp.ag('RS'), date '2026-02-10', time '06:00', 100000, 'confirmada', 'aprobado', timestamptz '2026-02-09 10:55Z');
select pg_temp.guarda('ant_r', public.procesar_anticipos(timestamptz '2026-02-09 11:00:00Z')::text);

select pg_temp.ok((select count(*) = 4 from liquidacion_items where tipo = 'anticipo'
                      and booking_id in (pg_temp.b('B50'), pg_temp.b('B80'), pg_temp.b('N80'), pg_temp.b('Z70'))),
                  'RB, RN y RZ reciben su anticipo del 30 %');
select pg_temp.ok(exists (select 1 from liquidacion_items where tipo = 'anticipo' and booking_id = pg_temp.b('S90'))
                  and not exists (select 1 from liquidacion_items where booking_id = pg_temp.b('S15')),
                  'anticipos: una reserva creada hace 15 min no recibe anticipo; la de hace 90 min sí');
-- Limpieza de las pruebas de integración (borran las reservas que crean, a los segundos): el cron no las tocó.
delete from payments where booking_id = pg_temp.b('S05');
delete from bookings where id = pg_temp.b('S05');
select pg_temp.ok(not exists (select 1 from bookings where id = pg_temp.b('S05')),
                  'anticipos: una reserva reciente (5 min) se puede borrar: el cron no le dejó items que lo impidan');
select pg_temp.falla_con(format($q$delete from bookings where id = %L$q$, pg_temp.b('S90')),
                         'liquidacion_items_booking_id_fkey', 'una reserva con anticipo entregado sí queda protegida contra el borrado');
select public.procesar_anticipos(timestamptz '2026-02-09 11:50:00Z');
select pg_temp.ok(exists (select 1 from liquidacion_items where tipo = 'anticipo' and booking_id = pg_temp.b('S15')),
                  'anticipos: cumplida la hora, la reserva reciente recibe su anticipo en la siguiente corrida');
select pg_temp.ok((select count(*) = 1 from liquidacion_items where booking_id = pg_temp.b('S90') and tipo = 'anticipo'),
                  'anticipos: la segunda corrida no duplica el de la reserva anterior');

select pg_temp.reembolsar(pg_temp.b('B50'), 50, 'aprobado');   -- se queda con 100.000
select pg_temp.reembolsar(pg_temp.b('B80'), 80, 'aprobado');   -- se queda con 20.000 (< anticipo de 30.000)
select pg_temp.reembolsar(pg_temp.b('N80'), 80, 'aprobado');
select pg_temp.reembolsar(pg_temp.b('Z70'), 70, 'aprobado');   -- se queda con 30.000 = el anticipo

-- Lo cancelado no se liquida antes de que termine la semana de la fecha del servicio.
select pg_temp.falla_con($q$select public.procesar_liquidaciones(date '2026-02-09', timestamptz '2026-02-15 12:00Z')$q$,
                         'SEMANA_NO_TERMINADA', 'lo retenido espera a que termine la semana de la fecha del servicio');

select pg_temp.guarda('sem_r', public.procesar_liquidaciones(date '2026-02-09', timestamptz '2026-02-16 11:00:00Z')::text);

-- RA
select pg_temp.ok((select l.monto_bruto = 150000 and l.comision = 18000 and l.monto_neto = 132000
                          and l.anticipos_descontados = 0 and l.monto_a_pagar = 132000 and l.estado = 'pendiente'
                          and l.periodo_inicio = date '2026-02-09' and l.periodo_fin = date '2026-02-15'
                     from liquidaciones l where l.agency_id = pg_temp.ag('RA') and l.tipo = 'semanal'),
                  'RA: 0 % deja 88.000 y 50 % deja 44.000 (neto de la comisión sobre lo retenido) = 132.000');
select pg_temp.ok((select i.monto_bruto = 100000 and i.comision = 12000 and i.monto_neto = 88000
                     from liquidacion_items i where i.booking_id = pg_temp.b('X0') and i.tipo = 'retencion'),
                  'cancelación al 0 %: la agencia recibe el neto del monto completo');
select pg_temp.ok((select i.monto_bruto = 50000 and i.comision = 6000 and i.monto_neto = 44000
                     from liquidacion_items i where i.booking_id = pg_temp.b('X50') and i.tipo = 'retencion'),
                  'cancelación al 50 %: la agencia recibe el neto de la mitad retenida');
select pg_temp.ok(not exists (select 1 from liquidacion_items where booking_id in (pg_temp.b('XP'), pg_temp.b('XR'), pg_temp.b('X100'), pg_temp.b('XS'))),
                  'reembolso pendiente o rechazado no se liquida; 100 % o pago reembolsado sin reembolso registrado tampoco');

-- RB: el anticipo se descuenta; si lo supera, la diferencia es un ajuste negativo.
select pg_temp.ok((select i.monto_neto = 88000 from liquidacion_items i where i.booking_id = pg_temp.b('B50') and i.tipo = 'retencion'),
                  'RB 50 %: retenido 100.000 → neto 88.000');
select pg_temp.ok((select count(*) = 0 from liquidacion_items where booking_id = pg_temp.b('B50') and tipo = 'ajuste'),
                  'RB 50 %: el anticipo (52.800) cabe en lo retenido: sin ajuste');
select pg_temp.ok((select i.monto_bruto = 20000 and i.comision = 2400 and i.monto_neto = 17600
                     from liquidacion_items i where i.booking_id = pg_temp.b('B80') and i.tipo = 'retencion'),
                  'RB 80 %: retenido 20.000 → neto 17.600');
select pg_temp.ok((select i.monto_bruto = -10000 and i.comision = -1200 and i.monto_neto = -8800
                     from liquidacion_items i where i.booking_id = pg_temp.b('B80') and i.tipo = 'ajuste'),
                  'RB 80 %: el anticipo (26.400) supera lo retenido (17.600): ajuste negativo de 8.800');
select pg_temp.ok((select l.monto_bruto = 110000 and l.comision = 13200 and l.monto_neto = 96800
                          and l.anticipos_descontados = 70400 and l.monto_a_pagar = 26400
                     from liquidaciones l where l.agency_id = pg_temp.ag('RB') and l.tipo = 'semanal'),
                  'RB: nunca se paga dos veces: (88.000 − 52.800) + (17.600 − 26.400) = 26.400 a pagar');

-- RZ: anticipo = retenido → exactamente 0, no queda pendiente.
select pg_temp.ok((select l.monto_neto = 26400 and l.anticipos_descontados = 26400 and l.monto_a_pagar = 0 and l.estado = 'sin_saldo'
                     from liquidaciones l where l.agency_id = pg_temp.ag('RZ') and l.tipo = 'semanal'),
                  'RZ: a pagar exactamente 0 → «sin_saldo», nunca pendiente');
select pg_temp.como('admin@demo.com');
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, (select id from liquidaciones where agency_id = pg_temp.ag('RZ') and tipo = 'semanal')),
                         'LIQUIDACION_NO_PENDIENTE', 'una liquidación sin saldo no se ejecuta');

-- RN: negativa → pendiente hasta que la siguiente semanal la absorba.
select pg_temp.ok((select l.monto_neto = 8800 and l.anticipos_descontados = 17600 and l.monto_a_pagar = -8800 and l.estado = 'pendiente'
                     from liquidaciones l where l.agency_id = pg_temp.ag('RN') and l.tipo = 'semanal'),
                  'RN: a pagar −8.800 (la agencia debe parte del anticipo) y queda pendiente de compensar');

-- Idempotencia de la semana
create temp table t4_antes_r as
  select (select count(*) from liquidaciones) l, (select count(*) from liquidacion_items) i, (select sum(monto_a_pagar) from liquidaciones) pagar;
select pg_temp.guarda('sem_r2', public.procesar_liquidaciones(date '2026-02-11', timestamptz '2026-02-16 11:00:00Z')::text);
select pg_temp.ok((select (a.l, a.i, a.pagar) = (select count(*), (select count(*) from liquidacion_items), sum(monto_a_pagar) from liquidaciones) from t4_antes_r a)
                  and (pg_temp.r('sem_r2')->>'liquidaciones')::int = 0,
                  'idempotente: repetir la semana con retenciones no duplica items ni liquidaciones');

-- Semana siguiente (lun 16 – dom 22): los reembolsos pendiente y rechazado se aprobaron,
-- RN vuelve a prestar un servicio y absorbe su saldo negativo.
select pg_temp.resolver_reembolso(pg_temp.b('XP'), 'aprobado');
select pg_temp.resolver_reembolso(pg_temp.b('XR'), 'aprobado');
select pg_temp.mk_serv('N_s2', pg_temp.ag('RN'), date '2026-02-17', time '06:00', 100000);
select pg_temp.guarda('sem_s', public.procesar_liquidaciones(date '2026-02-16', timestamptz '2026-02-23 11:00:00Z')::text);

select pg_temp.ok((select l.monto_neto = 88000 and l.monto_a_pagar = 88000 and l.periodo_inicio = date '2026-02-16'
                     from liquidaciones l where l.agency_id = pg_temp.ag('RA') and l.periodo_inicio = date '2026-02-16'),
                  'RA: lo que esperaba (XP y XR, ya aprobados, 50 % de 100.000 → 44.000 cada uno) entra en la siguiente corrida: 88.000');
select pg_temp.ok((select count(*) = 2 and bool_and(i.tipo = 'retencion') from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('RA') and l.periodo_inicio = date '2026-02-16'),
                  'RA: la liquidación de esa semana solo trae las dos retenciones que esperaban');
select pg_temp.ok((select i.monto_neto = -8800 and i.booking_id is null and i.tipo = 'saldo_anterior'
                     from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('RN') and l.periodo_inicio = date '2026-02-16' and i.tipo = 'saldo_anterior'),
                  'RN: la liquidación negativa entra como item «saldo_anterior» de −8.800');
select pg_temp.ok((select l.monto_neto = 79200 and l.anticipos_descontados = 0 and l.monto_a_pagar = 79200 and l.estado = 'pendiente'
                     from liquidaciones l where l.agency_id = pg_temp.ag('RN') and l.periodo_inicio = date '2026-02-16'),
                  'RN: servicio 88.000 − saldo anterior 8.800 = 79.200 a pagar');
select pg_temp.ok((select v.estado = 'compensada' and v.compensada_en = n.id
                     from liquidaciones v join liquidaciones n on n.agency_id = v.agency_id and n.periodo_inicio = date '2026-02-16'
                    where v.agency_id = pg_temp.ag('RN') and v.periodo_inicio = date '2026-02-09' and v.tipo = 'semanal'),
                  'RN: la negativa queda «compensada» con referencia a la nueva liquidación');
select pg_temp.ok((select count(*) = 0 from liquidaciones where agency_id = pg_temp.ag('RN') and estado = 'pendiente' and monto_a_pagar <= 0),
                  'RN: ya no queda ninguna liquidación pendiente con saldo ≤ 0');
select pg_temp.como('admin@demo.com');
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, (select id from liquidaciones where agency_id = pg_temp.ag('RN') and estado = 'compensada')),
                         'LIQUIDACION_NO_PENDIENTE', 'una liquidación compensada no se ejecuta');

-- RZ sin actividad posterior sigue visible como sin_saldo.
select pg_temp.ok((select estado = 'sin_saldo' from liquidaciones where agency_id = pg_temp.ag('RZ') and tipo = 'semanal'),
                  'RZ: sin actividad posterior se queda visible como «sin_saldo»');

-- Idempotencia de la compensación
create temp table t4_antes_s as
  select (select count(*) from liquidaciones) l, (select count(*) from liquidacion_items) i, (select count(*) from liquidacion_items where tipo = 'saldo_anterior') s;
select public.procesar_liquidaciones(date '2026-02-16', timestamptz '2026-02-23 11:00:00Z');
select public.procesar_liquidaciones(date '2026-02-09', timestamptz '2026-02-23 11:00:00Z');
select pg_temp.ok((select (a.l, a.i, a.s) = (select count(*), (select count(*) from liquidacion_items), (select count(*) from liquidacion_items where tipo = 'saldo_anterior') from liquidaciones) from t4_antes_s a),
                  'idempotente: repetir la compensación no vuelve a absorber el saldo ni duplica items');
select pg_temp.falla_con(format($q$insert into liquidacion_items (liquidacion_id, tipo, monto_bruto, comision, monto_neto, liquidacion_origen_id)
                                    values (%L, 'saldo_anterior', 1, 0, 1, %L)$q$,
                                (select id from liquidaciones where agency_id = pg_temp.ag('RN') and periodo_inicio = date '2026-02-16'),
                                (select id from liquidaciones where agency_id = pg_temp.ag('RN') and periodo_inicio = date '2026-02-09' and tipo = 'semanal')),
                         'liquidacion_items_liquidacion_origen_id', 'un saldo anterior solo se absorbe una vez');
select pg_temp.falla_con(format($q$insert into liquidacion_items (liquidacion_id, booking_id, tipo, monto_bruto, comision, monto_neto)
                                    values (%L, null, 'servicio', 1, 0, 1)$q$,
                                (select id from liquidaciones where agency_id = pg_temp.ag('RN') and periodo_inicio = date '2026-02-16')),
                         'liquidacion_items_', 'solo el saldo anterior puede ir sin reserva');

-- PRESERVE: 100 % con anticipo conserva su comportamiento (se revierte el anticipo y no se paga retención).
select pg_temp.ok((select count(*) = 1 from liquidacion_items where booking_id = pg_temp.b('K4') and tipo = 'ajuste')
                  and not exists (select 1 from liquidacion_items where booking_id = pg_temp.b('K4') and tipo = 'retencion'),
                  'PRESERVE: 100 % con anticipo sigue revirtiendo el anticipo y no genera retención');

-- 5. Cuentas para dispersiones y RLS --------------------------------------------------------
-- La dueña de D registra su cuenta.
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
values (pg_temp.ag('D'), 'Bancolombia', 'ahorros', '12345678904321', 'EcoAndes SAS', 'NIT', '9001234567');
select pg_temp.ok((select count(*) = 1 from public.agency_payout_accounts), 'la dueña registra y lee su cuenta');
select pg_temp.ok((select ultimos4 = '4321' and banco = 'Bancolombia' from public.cuentas_dispersion_resumen where agency_id = pg_temp.ag('D')),
                  'el resumen muestra solo los 4 últimos dígitos');
select pg_temp.ok(not exists (select 1 from information_schema.columns
                               where table_schema = 'public' and table_name = 'cuentas_dispersion_resumen'
                                 and column_name in ('numero_cuenta', 'numero_documento')),
                  'el resumen no incluye el número completo ni el documento');
update public.agency_payout_accounts set titular = 'EcoAndes SAS (actualizado)' where agency_id = pg_temp.ag('D');
select pg_temp.ok((select titular = 'EcoAndes SAS (actualizado)' and updated_at >= created_at from public.agency_payout_accounts), 'la dueña actualiza su cuenta');
select pg_temp.falla_con(format($q$insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
                                    values (%L, 'Bancolombia', 'ahorros', '99887766', 'Otra SAS', 'NIT', '9001234567')$q$, pg_temp.ag('G')),
                         'row-level security', 'no puede registrar una cuenta para otra agencia');
select pg_temp.falla_con(format($q$insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
                                    values (%L, 'Bancolombia', 'ahorros', '99887766', 'EcoAndes SAS', 'NIT', '9001234567')$q$, pg_temp.ag('D')),
                         'agency_payout_accounts_agency_id_key', 'una agencia tiene una sola cuenta');
select pg_temp.falla_con(format($q$insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
                                    values (%L, 'Bancolombia', 'ahorros', '12ab', 'X Y Z', 'NIT', '9001234567')$q$, pg_temp.ag('D')),
                         'numero_cuenta', 'el número de cuenta solo admite dígitos (6 a 20)');
select pg_temp.falla_con(format($q$update public.agency_payout_accounts set tipo_cuenta = 'ahorro' where agency_id = %L$q$, pg_temp.ag('D')),
                         'tipo_cuenta', 'el tipo de cuenta es ahorros o corriente');
select pg_temp.falla_con(format($q$update public.agency_payout_accounts set agency_id = %L where agency_id = %L$q$, pg_temp.ag('G'), pg_temp.ag('D')),
                         'row-level security', 'no puede mover su cuenta a otra agencia');
reset role;

-- La dueña de G registra la suya (y no ve la de D).
select pg_temp.como('graffiti@demo.com');
set role authenticated;
insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
values (pg_temp.ag('G'), 'Davivienda', 'corriente', '5566778899', 'Graffiti SAS', 'NIT', '9007654321');
select pg_temp.ok((select count(*) = 1 and bool_and(agency_id = pg_temp.ag('G')) from public.agency_payout_accounts),
                  'otra agencia solo ve su propia cuenta');
select pg_temp.ok((select count(*) = 1 and bool_and(agency_id = pg_temp.ag('G')) from public.cuentas_dispersion_resumen),
                  'otra agencia solo ve su propio resumen');
select pg_temp.ok((select count(*) = 0 from public.agency_payout_accounts where agency_id = pg_temp.ag('D')),
                  'otra agencia no ve la cuenta de D');
update public.agency_payout_accounts set titular = 'hack' where agency_id = pg_temp.ag('D');
reset role;
select pg_temp.ok((select titular = 'EcoAndes SAS (actualizado)' from agency_payout_accounts where agency_id = pg_temp.ag('D')),
                  'la cuenta de D no cambió');

-- Un viajero no ve ni crea nada.
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) = 0 from public.agency_payout_accounts), 'un viajero no ve cuentas');
select pg_temp.ok((select count(*) = 0 from public.cuentas_dispersion_resumen), 'un viajero no ve resúmenes de cuentas');
select pg_temp.ok((select count(*) = 0 from public.liquidaciones), 'un viajero no ve liquidaciones');
select pg_temp.ok((select count(*) = 0 from public.liquidacion_items), 'un viajero no ve items de liquidación');
select pg_temp.falla_con(format($q$insert into public.agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
                                    values (%L, 'Bancolombia', 'ahorros', '99887766', 'X Y Z', 'NIT', '9001234567')$q$, pg_temp.ag('E9')),
                         'row-level security', 'un viajero no registra cuentas');
reset role;

-- Liquidaciones: dueña, otra agencia, admin.
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) = 2 and bool_and(agency_id = pg_temp.ag('D')) from public.liquidaciones
                    where agency_id in (pg_temp.ag('D'), pg_temp.ag('G'), pg_temp.ag('Q'))),
                  'la dueña de D ve sus 2 liquidaciones (anticipo y semanal) y ninguna ajena');
select pg_temp.ok((select count(*) = 7 from public.liquidacion_items i join public.liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('D')),
                  've los 7 items de las suyas (3 anticipos + 3 servicios + 1 ajuste)');
reset role;
select pg_temp.como('graffiti@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) = 1 and bool_and(agency_id = pg_temp.ag('G')) from public.liquidaciones
                    where agency_id in (pg_temp.ag('D'), pg_temp.ag('G'), pg_temp.ag('Q'))),
                  'la dueña de G solo ve la liquidación de G');
select pg_temp.ok((select count(*) = 0 from public.liquidacion_items where booking_id = pg_temp.b('K1')),
                  'la dueña de G no ve items de D');
select pg_temp.falla_con($q$insert into public.liquidaciones (agency_id, tipo, periodo_inicio, periodo_fin, monto_bruto, comision, monto_neto, monto_a_pagar)
                            values (gen_random_uuid(), 'semanal', current_date, current_date, 1, 0, 1, 1)$q$,
                         'permission denied', 'una agencia no escribe liquidaciones');
select pg_temp.falla_con(format($q$update public.liquidaciones set monto_a_pagar = 999999999 where agency_id = %L$q$, pg_temp.ag('G')),
                         'permission denied', 'una agencia no modifica sus liquidaciones');
select pg_temp.falla_con($q$delete from public.liquidacion_items$q$, 'permission denied', 'una agencia no borra items');
reset role;

select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) >= 3 from public.liquidaciones where agency_id in (pg_temp.ag('D'), pg_temp.ag('G'), pg_temp.ag('Q'))),
                  'el admin ve las liquidaciones de todas las agencias');
select pg_temp.ok((select count(*) = 2 from public.agency_payout_accounts where agency_id in (pg_temp.ag('D'), pg_temp.ag('G'))),
                  'el admin ve las cuentas de dispersión');
reset role;

-- La cuenta no sale por el select público de agencies.
select pg_temp.ok(not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'agencies'
                               and column_name in ('numero_cuenta', 'banco', 'titular')),
                  'agencies no tiene datos bancarios (el select público no los puede exponer)');

-- Bloqueo de anticipo: lo gestiona solo el admin.
select pg_temp.como('patrimonio@demo.com');
set role authenticated;
update public.agencies set anticipo_bloqueado = true, descripcion = 'edita su descripción' where id = pg_temp.ag('BL');
reset role;
select pg_temp.ok((select anticipo_bloqueado = false and descripcion = 'edita su descripción' from agencies where id = pg_temp.ag('BL')),
                  'la dueña edita su agencia pero no puede bloquearse sola');
select pg_temp.como(null, 'postgres');
update agencies set anticipo_bloqueado = true where id = pg_temp.ag('BL');
select pg_temp.como('patrimonio@demo.com');
set role authenticated;
update public.agencies set anticipo_bloqueado = false where id = pg_temp.ag('BL');
reset role;
select pg_temp.ok((select anticipo_bloqueado from agencies where id = pg_temp.ag('BL')),
                  'la dueña no puede quitar el bloqueo de anticipo');
select pg_temp.como('admin@demo.com');
set role authenticated;
update public.agencies set anticipo_bloqueado = false where id = pg_temp.ag('BL');
reset role;
select pg_temp.ok((select not anticipo_bloqueado from agencies where id = pg_temp.ag('BL')), 'el admin bloquea y desbloquea el anticipo');
select pg_temp.como('patrimonio@demo.com');
set role authenticated;
select pg_temp.ok(public.servicios_prestados(pg_temp.ag('BL')) >= 10, 'la dueña consulta sus servicios prestados');
select pg_temp.falla_con(format($q$select public.servicios_prestados(%L)$q$, pg_temp.ag('D')),
                         'NO_AUTORIZADO', 'no consulta los servicios prestados de otra agencia');
reset role;

-- 6. Permisos de generación y ejecución ---------------------------------------------------------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con($q$select public.generar_liquidaciones(date '2026-02-02')$q$, 'NO_AUTORIZADO', 'un viajero no genera liquidaciones');
select pg_temp.falla_con($q$select public.generar_anticipos()$q$, 'NO_AUTORIZADO', 'un viajero no genera anticipos');
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, (select id from public.liquidaciones limit 1)),
                         'NO_AUTORIZADO', 'un viajero no ejecuta liquidaciones');
select pg_temp.falla_con($q$select public.procesar_anticipos()$q$, 'permission denied', 'un viajero no llama el trabajo interno');
reset role;
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.falla_con($q$select public.generar_liquidaciones(date '2026-02-02')$q$, 'NO_AUTORIZADO', 'una agencia no genera liquidaciones');
select pg_temp.falla_con($q$select public.generar_anticipos()$q$, 'NO_AUTORIZADO', 'una agencia no genera anticipos');
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, (select id from public.liquidaciones where agency_id = pg_temp.ag('D') limit 1)),
                         'NO_AUTORIZADO', 'una agencia no ejecuta ni sus propias liquidaciones');
select pg_temp.falla_con($q$select public.procesar_liquidaciones(null)$q$, 'permission denied', 'una agencia no llama el trabajo interno');
reset role;

-- El admin y service_role sí generan; el admin lo hace por el panel.
select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.guarda('adm_sem', public.generar_liquidaciones(date '2026-02-02')::text);
reset role;
select pg_temp.ok(pg_temp.r('adm_sem') is not null, 'el admin ejecuta generar_liquidaciones');

select pg_temp.como(null, 'service_role');
set role service_role;
select pg_temp.guarda('svc_ant', public.generar_anticipos()::text);
select pg_temp.guarda('svc_sem', public.procesar_liquidaciones(date '2026-02-02', timestamptz '2026-02-09 11:00Z')::text);
reset role;
select pg_temp.ok((pg_temp.r('svc_sem')->>'liquidaciones')::int = 0, 'service_role genera (idempotente) y llama el trabajo interno');

-- 7. Ejecución de la dispersión de prueba ------------------------------------------------------------
select set_config('test.liq_D', (select id::text from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'semanal'), false);
select set_config('test.liq_Q', (select id::text from liquidaciones where agency_id = pg_temp.ag('Q') and tipo = 'semanal' and periodo_inicio = date '2026-02-02'), false);
select set_config('test.liq_G', (select id::text from liquidaciones where agency_id = pg_temp.ag('G') and tipo = 'semanal'), false);
select set_config('test.liq_DA', (select id::text from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'anticipo'), false);

select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, current_setting('test.liq_Q')),
                         'CUENTA_NO_REGISTRADA', 'ejecutar exige que la agencia tenga cuenta para dispersiones');
select pg_temp.falla_con($q$select public.ejecutar_liquidacion(gen_random_uuid())$q$, 'LIQUIDACION_NO_EXISTE', 'liquidación inexistente');
reset role;
select pg_temp.ok((select estado = 'pendiente' and referencia_prueba is null and ejecutada_at is null
                     from liquidaciones where id = current_setting('test.liq_Q')::uuid),
                  'la ejecución rechazada deja la liquidación intacta');

select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.guarda('ej_D', public.ejecutar_liquidacion(current_setting('test.liq_D')::uuid)::text);
select pg_temp.guarda('ej_DA', public.ejecutar_liquidacion(current_setting('test.liq_DA')::uuid)::text);
select pg_temp.guarda('ej_G', public.ejecutar_liquidacion(current_setting('test.liq_G')::uuid)::text);
reset role;
select pg_temp.ok((select estado = 'pagada_prueba' and referencia_prueba like 'PRUEBA-%' and ejecutada_at is not null
                          and ejecutada_por = pg_temp.uid('admin@demo.com') and monto_a_pagar = 251680
                     from liquidaciones where id = current_setting('test.liq_D')::uuid),
                  'ejecutar: pagada_prueba con referencia PRUEBA-…, fecha y admin que la ejecutó');
select pg_temp.ok((pg_temp.r('ej_D')->>'estado') = 'pagada_prueba' and (pg_temp.r('ej_D')->>'referencia_prueba') like 'PRUEBA-%',
                  'la función devuelve el estado y la referencia');
select pg_temp.ok((select count(distinct referencia_prueba) = 3 from liquidaciones
                    where id in (current_setting('test.liq_D')::uuid, current_setting('test.liq_DA')::uuid, current_setting('test.liq_G')::uuid)),
                  'cada ejecución recibe una referencia PRUEBA distinta');
select pg_temp.falla_con(format($q$update liquidaciones set referencia_prueba = %L where id = %L$q$,
                                (select referencia_prueba from liquidaciones where id = current_setting('test.liq_D')::uuid), current_setting('test.liq_Q')),
                         'liquidaciones_referencia_prueba_key', 'la referencia de prueba es única');
select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, current_setting('test.liq_D')),
                         'LIQUIDACION_NO_PENDIENTE', 'no se ejecuta dos veces la misma liquidación');
reset role;
select pg_temp.ok((select referencia_prueba = (pg_temp.r('ej_D')->>'referencia_prueba') from liquidaciones where id = current_setting('test.liq_D')::uuid),
                  'la segunda ejecución no cambia la referencia');

-- Monto no positivo: no se dispersa.
insert into agency_payout_accounts (agency_id, banco, tipo_cuenta, numero_cuenta, titular, tipo_documento, numero_documento)
values (pg_temp.ag('Q'), 'Nequi', 'ahorros', '3001234567', 'Q SAS', 'NIT', '9001112223');
update liquidaciones set monto_a_pagar = 0 where id = current_setting('test.liq_Q')::uuid;
select pg_temp.como(null, 'service_role');
set role service_role;
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$, current_setting('test.liq_Q')),
                         'MONTO_NO_POSITIVO', 'un monto a pagar de 0 o negativo no se dispersa');
update public.liquidaciones set monto_a_pagar = 153000 where id = current_setting('test.liq_Q')::uuid;
select pg_temp.guarda('ej_Q', public.ejecutar_liquidacion(current_setting('test.liq_Q')::uuid)::text);
reset role;
select pg_temp.ok((select estado = 'pagada_prueba' and ejecutada_por is null from liquidaciones where id = current_setting('test.liq_Q')::uuid),
                  'service_role también ejecuta (sin usuario ejecutor)');

-- Ya ejecutada la liquidación semanal, regenerar la semana no la toca ni crea otra.
select public.procesar_liquidaciones(date '2026-02-02', timestamptz '2026-02-16 11:00Z');
select pg_temp.ok((select count(*) = 1 from liquidaciones where agency_id = pg_temp.ag('D') and tipo = 'semanal'),
                  'regenerar la semana después de ejecutarla no crea otra liquidación');

-- 8. PRESERVE: lo existente sigue igual ------------------------------------------------------------
select pg_temp.ok(to_regprocedure('public.aplicar_resultado_pago(text,text,text,bigint,text,jsonb,text,text)') is not null
                  and not has_function_privilege('authenticated', 'public.aplicar_resultado_pago(text,text,text,bigint,text,jsonb,text,text)', 'execute'),
                  '0003 intacta: aplicar_resultado_pago sigue siendo solo de service_role');
select pg_temp.ok(has_function_privilege('authenticated', 'public.vista_previa_cancelacion(uuid)', 'execute'),
                  '0003 intacta: vista_previa_cancelacion sigue disponible para el viajero');
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) >= 1 from public.agencies where id = pg_temp.ag('D')), 'el dueño sigue viendo su agencia');
update public.agencies set descripcion = 'sigue editable' where id = pg_temp.ag('D');
reset role;
select pg_temp.ok((select descripcion = 'sigue editable' from agencies where id = pg_temp.ag('D')), 'el dueño sigue editando su agencia');

-- 9. Escenario calculado a mano por la verificación independiente (T6a): anticipos, retención, ajuste y saldo anterior --
-- Una agencia con 10 servicios prestados y siete reservas de marzo de 2030 (lunes 4 a lunes 11):
--   b1 10-mar 100.000 · b2 6-mar 300.000 · b3 8-mar 200.000 · b4 5-mar 150.000 · b5 5-mar 100.000 · b6 11-mar 50.000 · b7 7-mar 80.000
-- Anticipos «a las 12:00 UTC del 4-mar» (salida entre ahora y +48 h): b2, b4 y b5.
-- Después: b3 se cancela con reembolso del 50 % aprobado, b4 sin reembolso (0 %), b5 con reembolso del 100 %,
-- y existe una semanal anterior con saldo de −5.000.
select pg_temp.mk_agencia('V', '99990', null);
select pg_temp.mk_pasados(pg_temp.ag('V'), 10);
select pg_temp.mk_serv('v1', pg_temp.ag('V'), date '2030-03-10', time '06:00', 100000);
select pg_temp.mk_serv('v2', pg_temp.ag('V'), date '2030-03-06', time '06:00', 300000);
select pg_temp.mk_serv('v3', pg_temp.ag('V'), date '2030-03-08', time '06:00', 200000);
select pg_temp.mk_serv('v4', pg_temp.ag('V'), date '2030-03-05', time '06:00', 150000);
select pg_temp.mk_serv('v5', pg_temp.ag('V'), date '2030-03-05', time '06:00', 100000);
select pg_temp.mk_serv('v6', pg_temp.ag('V'), date '2030-03-11', time '06:00', 50000);
select pg_temp.mk_serv('v7', pg_temp.ag('V'), date '2030-03-07', time '06:00', 80000);

select pg_temp.ok(((date '2030-03-06' + time '06:00') at time zone 'America/Bogota') = timestamptz '2030-03-06 11:00+00',
                  'la salida de las 06:00 de Bogotá es las 11:00 UTC');
select pg_temp.ok(pg_temp.ag('V') is not null and public.contar_servicios_prestados(pg_temp.ag('V'), timestamptz '2030-03-04 12:00+00') = 10,
                  'la agencia llega al anticipo con exactamente 10 servicios prestados');

select pg_temp.guarda('v_ant', public.procesar_anticipos(timestamptz '2030-03-04 12:00+00')::text);
select pg_temp.ok((select count(*) = 3 from liquidacion_items i where i.tipo = 'anticipo'
                      and i.booking_id in (pg_temp.b('v1'), pg_temp.b('v2'), pg_temp.b('v3'), pg_temp.b('v4'), pg_temp.b('v5'),
                                           pg_temp.b('v6'), pg_temp.b('v7'))),
                  'anticipo solo para las reservas que salen en las próximas 48 h (b2, b4, b5)');
select pg_temp.ok((select (monto_bruto, comision, monto_neto) = (90000, 10800, 79200) from liquidacion_items where booking_id = pg_temp.b('v2') and tipo = 'anticipo'),
                  'anticipo de b2: 30 % de 300.000 = 90.000 − 10.800 de comisión = 79.200');
select pg_temp.ok((select (monto_bruto, comision, monto_neto) = (45000, 5400, 39600) from liquidacion_items where booking_id = pg_temp.b('v4') and tipo = 'anticipo'),
                  'anticipo de b4: 45.000 − 5.400 = 39.600');
select pg_temp.ok((select (monto_bruto, comision, monto_neto) = (30000, 3600, 26400) from liquidacion_items where booking_id = pg_temp.b('v5') and tipo = 'anticipo'),
                  'anticipo de b5: 30.000 − 3.600 = 26.400');
select pg_temp.ok((select (count(*), sum(monto_bruto), sum(comision), sum(monto_neto), min(estado)) = (1, 165000, 19800, 145200, 'pendiente')
                     from liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'anticipo'),
                  'una liquidación de anticipo por 165.000 − 19.800 = 145.200');
select public.procesar_anticipos(timestamptz '2030-03-04 12:30+00');
select pg_temp.ok((select count(*) = 3 from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('V') and i.tipo = 'anticipo')
                  and (select count(*) = 1 from liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'anticipo'),
                  'repetir los anticipos no crea nada nuevo para la agencia (idempotente)');

select pg_temp.reembolsar(pg_temp.b('v3'), 50, 'aprobado');
select pg_temp.cancelar_sin_reembolso(pg_temp.b('v4'));
select pg_temp.reembolsar(pg_temp.b('v5'), 100, 'aprobado');
insert into liquidaciones (agency_id, tipo, periodo_inicio, periodo_fin, monto_bruto, comision, monto_neto, monto_a_pagar)
values (pg_temp.ag('V'), 'semanal', date '2030-02-25', date '2030-03-03', -5000, 0, -5000, -5000);

select pg_temp.falla_con($q$select public.procesar_liquidaciones(date '2030-03-11', timestamptz '2030-03-11 12:00+00')$q$,
                         'SEMANA_NO_TERMINADA', 'la semana en curso no se liquida');
select pg_temp.guarda('v_sem', public.procesar_liquidaciones(null, timestamptz '2030-03-11 12:00+00')::text);
select pg_temp.ok((pg_temp.r('v_sem')->>'periodo_inicio') = '2030-03-04' and (pg_temp.r('v_sem')->>'periodo_fin') = '2030-03-10',
                  'la semanal liquida el lunes 4 al domingo 10 de marzo');

create or replace function pg_temp.item(p_clave text, p_tipo text) returns numeric[] language sql as $$
  select array[i.monto_bruto, i.comision, i.monto_neto]
    from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
   where l.agency_id = pg_temp.ag('V') and l.tipo = 'semanal' and i.tipo = p_tipo
     and i.booking_id = pg_temp.b(p_clave) $$;
select pg_temp.ok(pg_temp.item('v1', 'servicio') = array[100000, 12000, 88000]::numeric[], 'servicio b1: 100.000 − 12.000 = 88.000');
select pg_temp.ok(pg_temp.item('v2', 'servicio') = array[300000, 36000, 264000]::numeric[], 'servicio b2: 300.000 − 36.000 = 264.000');
select pg_temp.ok(pg_temp.item('v7', 'servicio') = array[80000, 9600, 70400]::numeric[], 'servicio b7: 80.000 − 9.600 = 70.400');
select pg_temp.ok(pg_temp.item('v3', 'retencion') = array[100000, 12000, 88000]::numeric[],
                  'retención b3: lo no reembolsado (50 % de 200.000) menos comisión');
select pg_temp.ok(pg_temp.item('v4', 'retencion') = array[150000, 18000, 132000]::numeric[],
                  'retención b4: cancelada sin reembolso, todo es de la agencia menos comisión');
select pg_temp.ok(pg_temp.item('v5', 'ajuste') = array[-30000, -3600, -26400]::numeric[],
                  'ajuste b5: reembolso del 100 % devuelve el anticipo (−30.000 / −3.600 / −26.400)');
select pg_temp.ok((select count(*) = 0 from liquidacion_items i where i.booking_id in (pg_temp.b('v6'))),
                  'b6 (11-mar) cae en la semana siguiente: no entra');
select pg_temp.ok((select (i.monto_bruto, i.monto_neto) = (-5000, -5000) and i.comision = 0
                     from liquidacion_items i join liquidaciones l on l.id = i.liquidacion_id
                    where l.agency_id = pg_temp.ag('V') and l.tipo = 'semanal' and l.periodo_inicio = date '2030-03-04'
                      and i.tipo = 'saldo_anterior'),
                  'la semanal anterior con saldo −5.000 entra como saldo_anterior');
select pg_temp.ok((select (monto_bruto, comision, monto_neto, anticipos_descontados, monto_a_pagar, estado)
                          = (695000, 84000, 611000, 118800, 492200, 'pendiente')
                     from liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'semanal' and periodo_inicio = date '2030-03-04'),
                  'totales: bruto 695.000, comisión 84.000, neto 611.000, anticipos descontados 118.800, a pagar 492.200');
select pg_temp.ok((select estado = 'compensada' and compensada_en = (select id from liquidaciones where agency_id = pg_temp.ag('V')
                                                                      and tipo = 'semanal' and periodo_inicio = date '2030-03-04')
                     from liquidaciones where agency_id = pg_temp.ag('V') and periodo_inicio = date '2030-02-25'),
                  'la semanal anterior queda compensada en la nueva');
select pg_temp.ok((public.procesar_liquidaciones(null, timestamptz '2030-03-11 13:00+00')->>'liquidaciones')::int = 0
                  and (select count(*) = 2 from liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'semanal'),
                  'segunda corrida de la semana: 0 liquidaciones nuevas (idempotente)');
select pg_temp.como(null, 'service_role');
set role service_role;
select pg_temp.falla_con(format($q$select public.ejecutar_liquidacion(%L)$q$,
                         (select id from public.liquidaciones where agency_id = pg_temp.ag('V') and tipo = 'semanal' and estado = 'pendiente')),
                         'CUENTA_NO_REGISTRADA', 'sin cuenta para dispersiones no se ejecuta');
reset role;

rollback;
