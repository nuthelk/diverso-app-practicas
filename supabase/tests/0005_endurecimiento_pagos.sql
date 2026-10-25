-- Pruebas de la migración 0005 (endurecimiento de pagos tras la verificación independiente):
-- política CONGELADA en la reserva, comparación exacta de ventanas, reembolso por monto distinto,
-- una sola reserva pendiente por viajero y fecha, política texto↔números y versión legal.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/0005_endurecimiento_pagos.sql
-- Todo corre dentro de una transacción que termina en ROLLBACK.
-- Los textos de política de la sección 1 son LOS MISMOS vectores que
-- apps/panel_svelte/src/lib/politica.test.ts («vectores compartidos con la BD»): SQL y TypeScript
-- deben producir exactamente las mismas cadenas.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
end $$;
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

-- Reserva de prueba insertada directamente (como hacen el seed y las demás pruebas).
create or replace function pg_temp.mk_reserva(p_pd uuid, p_estado public.booking_status, p_email text,
                                               p_pago text default null, p_pax int default 2) returns uuid language plpgsql as $$
declare v_b uuid; v_precio numeric;
begin
  select pl.precio_cop into v_precio from plan_dates pd join plans pl on pl.id = pd.plan_id where pd.id = p_pd;
  update plan_dates set cupo_disponible = cupo_disponible - p_pax where id = p_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T5-' || upper(substr(md5(random()::text), 1, 8)), p_pd, pg_temp.uid(p_email), p_pax, v_precio * p_pax, p_estado)
  returning id into v_b;
  if p_pago is not null then
    insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
    values (v_b, 'tarjeta', 'aprobado', v_precio * p_pax, 'P5-' || substr(md5(random()::text), 1, 10),
            p_pago, p_pago = 'simulado',
            case when p_pago = 'wompi' then 'tx5-' || substr(md5(random()::text), 1, 10) end);
  end if;
  return v_b;
end $$;

create or replace function pg_temp.mk_intento(p_b uuid) returns text language plpgsql as $$
declare j json;
begin
  set local role service_role;
  j := public.crear_intento_pago(p_b, (select viajero_id from bookings where id = p_b));
  reset role;
  return j->>'referencia';
end $$;

-- 1. Texto de política: mismos vectores que el panel (politica.ts) ---------------------------
create or replace function pg_temp.vector(p_f int, p_p int, p_x int, p_esperado text) returns void language plpgsql as $$
begin
  perform pg_temp.ok(public.texto_politica(p_f, p_p, p_x) = p_esperado,
                     format('texto_politica(%s, %s, %s) = «%s»', p_f, coalesce(p_p::text, 'null'), coalesce(p_x::text, 'null'), p_esperado));
end $$;
select pg_temp.vector(48, null, null, 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.');
select pg_temp.vector(48, 24, 50, 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.');
select pg_temp.vector(1, null, null, 'Cancelación gratuita hasta 1 hora antes. Menos de 1 hora: sin reembolso.');
select pg_temp.vector(48, 1, 30, 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 1 hora: reembolso del 30 %. Menos de 1 hora: sin reembolso.');
select pg_temp.vector(168, 0, 50, 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %.');
select pg_temp.vector(72, 24, 40, 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso.');
select pg_temp.vector(24, 12, 100, 'Cancelación gratuita hasta 24 horas antes. Entre 24 y 12 horas: reembolso del 100 %. Menos de 12 horas: sin reembolso.');
select pg_temp.vector(12, 0, 0, 'Cancelación gratuita hasta 12 horas antes. Menos de 12 horas: reembolso del 0 %.');
select pg_temp.ok(public.texto_politica(48, 24, null) = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.'
                  and public.texto_politica(48, null, 50) = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
                  'un tramo parcial incompleto se trata como «sin tramo» (igual que el panel)');

-- Leer un texto devuelve los números (los de legado y los canónicos); el texto canónico vuelve a dar los mismos números.
select pg_temp.ok((select (gratuita, parcial_h, parcial_pct) is not distinct from (12, null, null)
                     from public.politica_desde_texto('Cancelación gratuita hasta 12 horas antes.')),
                  'texto de legado «hasta 12 horas» → 12 / sin tramo');
select pg_temp.ok((select (gratuita, parcial_h, parcial_pct) = (168, 0, 50)
                     from public.politica_desde_texto('Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.')),
                  'texto de legado «7 días … 50%» → 168 / 0 / 50');
select pg_temp.ok((select (gratuita, parcial_h, parcial_pct) = (48, 24, 50)
                     from public.politica_desde_texto('Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50%. Menos de 24 horas: sin reembolso.')),
                  'texto escalonado de legado → 48 / 24 / 50');
select pg_temp.ok((select gratuita is null and parcial_h is null and parcial_pct is null
                     from public.politica_desde_texto('Cancelación flexible, consulta a la agencia')),
                  'un texto sin ventana reconocible no produce números');
select pg_temp.ok((select bool_and((s.g, s.p, s.x) is not distinct from (r.gratuita, r.parcial_h, r.parcial_pct))
                     from (values (48, null::int, null::int), (48, 24, 50), (1, null, null), (48, 1, 30),
                                  (168, 0, 50), (72, 24, 40), (24, 12, 100), (12, 0, 0)) as s(g, p, x),
                          lateral public.politica_desde_texto(public.texto_politica(s.g, s.p, s.x)) r),
                  'leer(texto_politica(n)) = n para todos los vectores (ida y vuelta)');

-- 2. Disparador de plans: texto y números siempre coherentes -----------------------------------
do $$
declare v_plan uuid; p public.plans;
begin
  -- 2.1 cambian los números → el texto se regenera (aunque el texto viejo siga ahí)
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, horas_cancelacion_gratuita,
                     horas_reembolso_parcial, porcentaje_reembolso_parcial, politica_cancelacion)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST política texto', 'd', 'aventura', 1000,
          72, 24, 40, 'texto cualquiera') returning id into v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso.'
                     and (p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (72, 24, 40),
                     'INSERT con números: los números mandan y el texto se genera');

  update plans set horas_cancelacion_gratuita = 96, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null
   where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_cancelacion = 'Cancelación gratuita hasta 96 horas antes. Menos de 96 horas: sin reembolso.',
                     'UPDATE de números: el texto se regenera con el mismo formato que el panel');

  -- 2.2 el panel legado edita SOLO el texto → se leen los números y el texto queda canónico
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) is not distinct from (24, null, null)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso.',
                     'UPDATE solo del texto (panel legado): números leídos del texto y texto canónico');

  update plans set politica_cancelacion = 'Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (168, 0, 50)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %.',
                     'texto de legado en días con 50 % → 168 h / 0 / 50 y texto canónico');

  update plans set politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50%. Menos de 24 horas: sin reembolso.'
   where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (48, 24, 50)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso.',
                     'texto escalonado → 48 / 24 / 50 y texto canónico');

  -- 2.3 texto ilegible o incoherente: los números no cambian y el texto vuelve a ser el de los números
  update plans set politica_cancelacion = 'Política flexible, pregunta a la agencia' where id = v_plan;
  select * into p from plans where id = v_plan;
  -- (0006) el texto ilegible ya no se descarta: pasa a politica_notas, detrás del texto canónico de los números.
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (48, 24, 50)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso. Política flexible, pregunta a la agencia',
                     'texto ilegible: los números no cambian, el texto no los contradice y la frase se conserva como nota');
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Entre 24 y 48 horas: reembolso del 50%.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (48, 24, 50),
                     'texto con ventana parcial mayor que la gratuita (incoherente): se ignora');

  -- 2.4 números y texto cambian a la vez: mandan los números
  update plans set horas_cancelacion_gratuita = 36, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null,
                   politica_cancelacion = 'Cancelación gratuita hasta 10 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 36
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 36 horas antes. Menos de 36 horas: sin reembolso.',
                     'si cambian números y texto a la vez, mandan los números');

  -- 2.5 PRESERVE: editar otra columna no toca la política
  update plans set titulo = 'TEST política texto 2', hora_salida = '07:15' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 36 and p.hora_salida = time '07:15'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 36 horas antes. Menos de 36 horas: sin reembolso.',
                     'editar título u hora de salida no altera la política');

  -- 2.6 INSERT solo con texto (panel legado / seed): se leen los números
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, politica_cancelacion)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST legado texto', 'd', 'aventura', 1000,
          'Cancelación gratuita hasta 12 horas antes.') returning * into p;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) is not distinct from (12, null, null)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 12 horas antes. Menos de 12 horas: sin reembolso.',
                     'INSERT solo con texto (legado): números leídos del texto');
  insert into plans (agency_id, titulo, destino, categoria, precio_cop)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST sin política', 'd', 'aventura', 1000)
  returning * into p;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) is not distinct from (48, null, null)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
                     'INSERT sin política: valores por omisión (48 h) con su texto');
end $$;

-- (0006) el texto lleva además las notas del plan (texto_politica_con_notas = texto_politica cuando no hay notas).
select pg_temp.ok(not exists (select 1 from plans p
                               where p.politica_cancelacion is distinct from
                                     public.texto_politica_con_notas(p.horas_cancelacion_gratuita, p.horas_reembolso_parcial,
                                                                     p.porcentaje_reembolso_parcial, p.politica_notas)),
                  'TODOS los planes tienen el texto que generan sus números y sus notas (relleno de la migración incluido)');

-- 3. Política congelada en la reserva (B1) ---------------------------------------------------------
select pg_temp.ok(not exists (select 1 from bookings
                               where politica_horas_gratuita is null or politica_texto is null or salida_at is null),
                  'toda reserva (también las anteriores a 0005) tiene su política y su salida congeladas');

do $$ begin
  -- Reserva creada por la RPC real, como la crea el viajero.
  perform set_config('test.pd_cong', pg_temp.mk_fecha(48, 24, 50, 100)::text, false);
end $$;
create or replace function pg_temp.crear_como(p_email text, p_pd uuid, p_pax int default 2) returns uuid language plpgsql as $$
declare v_b uuid;
begin
  perform pg_temp.como(p_email);
  set local role authenticated;
  v_b := (public.create_booking(p_pd, p_pax)->>'booking_id')::uuid;
  reset role;
  return v_b;
end $$;

do $$
declare v_b uuid; v_pd uuid := current_setting('test.pd_cong')::uuid; r record; bk bookings; pl plans;
begin
  v_b := pg_temp.crear_como('viajero@demo.com', v_pd);
  update bookings set estado = 'confirmada' where id = v_b;
  insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
  values (v_b, 'tarjeta', 'aprobado', 200000, 'P5-' || substr(md5(random()::text), 1, 10), 'wompi', false, 'tx5-' || v_b);
  perform set_config('test.b_cong', v_b::text, false);

  select * into bk from bookings where id = v_b;
  select pl2.* into pl from plans pl2 join plan_dates pd on pd.plan_id = pl2.id where pd.id = v_pd;
  perform pg_temp.ok((bk.politica_horas_gratuita, bk.politica_horas_parcial, bk.politica_porcentaje_parcial) = (48, 24, 50)
                     and bk.politica_texto = pl.politica_cancelacion
                     and bk.salida_at = ((select fecha from plan_dates where id = v_pd) + pl.hora_salida) at time zone 'America/Bogota',
                     'create_booking congela la política (48/24/50), su texto y la salida (fecha + hora, Bogotá)');

  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 100 and r.monto = 200000, 'con salida en 100 h: reembolso del 100 %');

  -- La agencia endurece la política y mueve la hora después de que el viajero pagó.
  update plans set horas_cancelacion_gratuita = 500, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null,
                   hora_salida = '00:01' where id = pl.id;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 100 and r.aplica and r.monto = 200000,
                     'la agencia cambió política y hora de salida: la reserva ya pagada conserva su 100 %');
  select * into bk from bookings where id = v_b;
  perform pg_temp.ok(bk.politica_horas_gratuita = 48 and bk.politica_horas_parcial = 24 and bk.politica_porcentaje_parcial = 50,
                     'la política congelada de la reserva no cambia');
end $$;

-- La vista previa del dueño también lee la política congelada.
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((public.vista_previa_cancelacion(current_setting('test.b_cong')::uuid)->>'porcentaje')::int = 100,
                  'la vista previa del dueño usa la política congelada, no la actual del plan');
reset role;

-- La fecha de un plan con reservas vivas no se mueve ni se borra.
select pg_temp.falla_con(format($q$update plan_dates set fecha = fecha + 1 where id = %L$q$, current_setting('test.pd_cong')),
                         'FECHA_CON_RESERVAS', 'no se cambia la fecha con una reserva confirmada');
select pg_temp.falla_con(format($q$delete from plan_dates where id = %L$q$, current_setting('test.pd_cong')),
                         'FECHA_CON_RESERVAS', 'no se borra una fecha con una reserva confirmada');
do $$
declare v_pd uuid := current_setting('test.pd_cong')::uuid; v_b uuid;
begin
  update plan_dates set cupo_total = 12, cupo_disponible = cupo_disponible + 2 where id = v_pd;
  perform pg_temp.ok((select cupo_total = 12 from plan_dates where id = v_pd), 'PRESERVE: los cupos de la fecha siguen editables');

  v_b := pg_temp.crear_como('santiago@demo.com', v_pd);   -- pendiente_pago
  perform pg_temp.falla_con(format($q$update plan_dates set fecha = fecha + 1 where id = %L$q$, v_pd),
                            'FECHA_CON_RESERVAS', 'tampoco con una reserva pendiente de pago');

  -- Solo reservas canceladas: la fecha vuelve a ser editable.
  update bookings set estado = 'cancelada' where plan_date_id = v_pd;
  update plan_dates set fecha = fecha + 1 where id = v_pd;
  perform pg_temp.ok(true, 'con solo reservas canceladas la fecha se puede mover');
end $$;
do $$
declare v_pd uuid;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  update plan_dates set fecha = fecha + 1 where id = v_pd;
  delete from plan_dates where id = v_pd;
  perform pg_temp.ok(true, 'PRESERVE: una fecha sin reservas se mueve y se borra como antes');
end $$;

-- Cancelar usa la política congelada aunque el plan cambie.
do $$
declare v_pd uuid; v_b uuid; j json;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b := pg_temp.mk_reserva(v_pd, 'confirmada', 'viajero@demo.com', 'wompi');
  update plans set horas_cancelacion_gratuita = 500, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null
   where id = (select plan_id from plan_dates where id = v_pd);
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->'reembolso'->>'porcentaje')::int = 100 and (j->'reembolso'->>'monto')::numeric = 200000
                     and j->'reembolso'->>'motivo' like '%48 h%',
                     'cancelar_reserva aplica la política con la que se pagó (100 %, ventana de 48 h)');
end $$;

-- Ataques sobre una reserva ya pagada (B1): ni el viajero ni la agencia pueden cambiarle la política ni la salida.
do $$
declare
  v_pd uuid; v_plan uuid; v_b uuid; v_dueno text; n int; r record; bk bookings; j json;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_plan := (select plan_id from plan_dates where id = v_pd);
  v_dueno := (select owner_user_id::text from agencies where numero_rnt = '85421');
  v_b := pg_temp.crear_como('viajero@demo.com', v_pd);
  update bookings set estado = 'confirmada' where id = v_b;
  insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
  values (v_b, 'tarjeta', 'aprobado', 200000, 'P5-' || substr(md5(random()::text), 1, 10), 'wompi', false, 'tx5-' || v_b);

  -- el viajero intenta reescribir su propia política y la salida
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  begin
    update bookings set politica_horas_gratuita = 1, politica_horas_parcial = null, politica_porcentaje_parcial = null,
                        politica_texto = 'Cancelación gratuita hasta 1 hora antes.', salida_at = now() where id = v_b;
    get diagnostics n = row_count;
  exception when insufficient_privilege then
    n := 0;
  end;
  reset role;
  perform pg_temp.ok(n = 0, 'el viajero no puede reescribir la política ni la salida de su reserva (0 filas o permiso denegado)');

  -- la agencia dueña del plan intenta lo mismo sobre la reserva, y endurece el plan, y lo borra
  perform set_config('request.jwt.claim.sub', v_dueno, false);
  set local role authenticated;
  begin
    update bookings set politica_horas_gratuita = 999 where id = v_b;
    get diagnostics n = row_count;
  exception when insufficient_privilege then
    n := 0;
  end;
  perform pg_temp.ok(n = 0, 'la agencia no puede reescribir la política de la reserva de un viajero (0 filas o permiso denegado)');
  update plans set horas_cancelacion_gratuita = 999, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null,
                   hora_salida = '23:59' where id = v_plan;
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 5000 horas antes.' where id = v_plan;
  perform pg_temp.ok((select horas_cancelacion_gratuita from plans where id = v_plan) = 5000,
                     'la agencia sí puede cambiar el plan (la reserva ya pagada no lo nota)');
  perform pg_temp.falla_con(format($q$delete from plans where id = %L$q$, v_plan),
                            'FECHA_CON_RESERVAS', 'la agencia no puede borrar el plan (ni su fecha) mientras haya una reserva viva');
  reset role;

  select * into bk from bookings where id = v_b;
  perform pg_temp.ok((bk.politica_horas_gratuita, bk.politica_horas_parcial, bk.politica_porcentaje_parcial) = (48, 24, 50)
                     and bk.politica_texto <> 'Cancelación gratuita hasta 1 hora antes.' and bk.salida_at > now() + interval '90 hours',
                     'tras los ataques, la reserva conserva su política (48/24/50) y su salida');

  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  j := public.vista_previa_cancelacion(v_b);
  reset role;
  perform pg_temp.ok((j->>'porcentaje')::int = 100 and (j->>'monto')::numeric = 200000,
                     'la vista previa del viajero sigue en 100 % tras el endurecimiento del plan');
  set local role service_role;
  j := public.cancelar_reserva(v_b, pg_temp.uid('viajero@demo.com'));
  reset role;
  perform pg_temp.ok((j->'reembolso'->>'porcentaje')::int = 100 and (j->'reembolso'->>'monto')::numeric = 200000,
                     'cancelar la reserva pagada devuelve el 100 % que prometía la política congelada');
end $$;

-- 4. Ventanas exactas (SF2) -------------------------------------------------------------------------
do $$
declare v_b uuid; r record;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'confirmada', 'viajero@demo.com', 'wompi');

  update bookings set salida_at = now() + interval '48 hours' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 100, 'exactamente 48 h antes: reembolso del 100 % (la ventana incluye su borde)');

  update bookings set salida_at = now() + interval '48 hours' - interval '10 seconds' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50 and r.monto = 100000,
                     '48 h menos 10 s: reembolso del 50 %, no del 100 % (no se redondea a 2 decimales para decidir)');
  -- (0007) la cifra mostrada se trunca a 2 decimales: 48 h − 10 s ya no se muestra como 48.00 junto al tramo del 50 %.
  perform pg_temp.ok(r.horas_antes = 47.99, 'solo la cifra mostrada (horas_antes) se trunca a 2 decimales');

  update bookings set salida_at = now() + interval '48 hours' - interval '1 second' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50 and r.monto = 100000 and r.aplica, '48 h menos 1 s: reembolso del 50 %');

  update bookings set salida_at = now() + interval '30 hours' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50 and r.monto = 100000, '30 h antes (dentro del tramo parcial): reembolso del 50 %');

  update bookings set salida_at = now() + interval '24 hours' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 50, 'exactamente 24 h antes: tramo del 50 %');

  update bookings set salida_at = now() + interval '24 hours' - interval '10 seconds' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 0 and not r.aplica and r.monto = 0, '24 h menos 10 s: sin reembolso');

  update bookings set salida_at = now() - interval '1 hour' where id = v_b;
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.porcentaje = 0 and not r.aplica, 'salida ya pasada: sin reembolso');
end $$;

-- 5. Cobro aprobado con monto distinto: se devuelve lo cobrado (SF3) ---------------------------------
do $$
declare v_b uuid; v_ref text; j json; n int;
begin
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-mm-1', 'APPROVED', 15000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'monto_no_coincide' and (select estado from bookings where id = v_b) = 'pendiente_pago'
                     and (select count(*) from payments where booking_id = v_b) = 0,
                     'APPROVED con otro monto: la reserva sigue pendiente y no hay pago');
  perform pg_temp.ok((select count(*) = 1 and bool_and(origen = 'monto_no_coincide' and porcentaje = 100 and monto = 150
                                                       and estado = 'pendiente' and wompi_transaction_id = 'tx5-mm-1'
                                                       and not simulado and referencia = 'RF-' || v_ref)
                        from refunds where booking_id = v_b),
                     'queda una obligación de reembolso del 100 % de lo REALMENTE cobrado ($150) para la pasarela');
  perform pg_temp.ok(j->>'refund_estado' = 'pendiente' and (j->>'refund_id') is not null,
                     'el resultado trae el reembolso para que la Edge Function lo pida a Wompi');

  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-mm-1', 'APPROVED', 15000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok((select count(*) from refunds where booking_id = v_b) = 1, 'el reenvío del evento no duplica el reembolso');

  -- Otra moneda con el monto correcto: también se devuelve lo cobrado.
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-mm-2', 'APPROVED', 20000000, 'CARD', '{}'::jsonb, 'USD');
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'monto_no_coincide'
                     and (select count(*) = 1 and bool_and(monto = 200000 and origen = 'monto_no_coincide')
                           from refunds where booking_id = v_b),
                     'APPROVED en otra moneda: reembolso del 100 % de lo cobrado');

  -- Sin monto utilizable no hay nada que devolver (y no falla).
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-mm-3', 'APPROVED', null, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'monto_no_coincide' and (select count(*) from refunds where booking_id = v_b) = 0,
                     'APPROVED sin monto: no se inventa un reembolso');

  -- PRESERVE: un monto correcto sigue confirmando y un rechazo no genera reembolso.
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-ok-1', 'APPROVED', 20000000, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'confirmada' and (select count(*) from refunds where booking_id = v_b) = 0,
                     'PRESERVE: un cobro correcto confirma y no genera reembolso');
  v_b := pg_temp.mk_reserva(pg_temp.mk_fecha(48, 24, 50, 100), 'pendiente_pago', 'viajero@demo.com');
  v_ref := pg_temp.mk_intento(v_b);
  set local role service_role;
  j := public.aplicar_resultado_pago(v_ref, 'tx5-dec-1', 'DECLINED', 100, 'CARD', '{}'::jsonb);
  reset role;
  perform pg_temp.ok(j->>'resultado' = 'rechazado' and (select count(*) from refunds where booking_id = v_b) = 0,
                     'PRESERVE: un cobro rechazado (aunque el monto no coincida) no genera reembolso');

  -- El reembolso por monto distinto lo ve el viajero con sus columnas permitidas.
  perform set_config('test.b_mm', v_b::text, false);
end $$;

-- 6. Una sola reserva pendiente por viajero y fecha (servidor) ------------------------------------
do $$
declare v_pd uuid; v_otro uuid; v_b1 uuid; v_b2 uuid; v_detalle text; v_msg text; v_cupo int;
begin
  v_pd := pg_temp.mk_fecha(48, 24, 50, 100);
  v_otro := pg_temp.mk_fecha(48, 24, 50, 100);
  v_b1 := pg_temp.crear_como('viajero@demo.com', v_pd, 2);
  select cupo_disponible into v_cupo from plan_dates where id = v_pd;

  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  begin
    perform public.create_booking(v_pd, 3);
    reset role;
    raise exception 'FALLA: la segunda reserva pendiente de la misma fecha no se rechazó';
  exception when others then
    reset role;
    get stacked diagnostics v_detalle = pg_exception_detail;
    v_msg := sqlerrm;
  end;
  perform pg_temp.ok(v_msg like '%RESERVA_PENDIENTE_EXISTENTE%' and v_detalle = v_b1::text,
                     format('segunda reserva pendiente de la misma fecha: RESERVA_PENDIENTE_EXISTENTE con el id de la existente (%s)', v_msg));
  perform pg_temp.ok((select cupo_disponible from plan_dates where id = v_pd) = v_cupo
                     and (select count(*) from bookings where plan_date_id = v_pd) = 1,
                     'el rechazo no retiene cupos ni crea reserva');

  v_b2 := pg_temp.crear_como('viajero@demo.com', v_otro, 1);
  perform pg_temp.ok(v_b2 is not null, 'PRESERVE: otra fecha sí admite su reserva pendiente');
  v_b2 := pg_temp.crear_como('santiago@demo.com', v_pd, 1);
  perform pg_temp.ok(v_b2 is not null, 'PRESERVE: otro viajero reserva la misma fecha sin problema');

  -- Vencida (más de 30 min, aún sin barrer por el cron): ya no bloquea.
  update bookings set created_at = now() - interval '31 minutes' where id = v_b1;
  v_b2 := pg_temp.crear_como('viajero@demo.com', v_pd, 1);
  perform pg_temp.ok(v_b2 is not null, 'una reserva pendiente vencida no impide crear otra');

  -- Cancelada o pagada: tampoco bloquea.
  update bookings set estado = 'cancelada' where id = v_b2;
  v_b2 := pg_temp.crear_como('viajero@demo.com', v_pd, 1);
  perform pg_temp.ok(v_b2 is not null, 'tras cancelar la pendiente se puede reservar de nuevo');
  update bookings set estado = 'confirmada' where id = v_b2;
  v_b2 := pg_temp.crear_como('viajero@demo.com', v_pd, 1);
  perform pg_temp.ok(v_b2 is not null, 'PRESERVE: con una reserva ya pagada de la fecha, comprar otra sigue permitido');
end $$;

-- 7. Contrato de permisos ---------------------------------------------------------------------------
do $$
declare f text; r text;
begin
  foreach f in array array[
    'public.texto_politica(int,int,int)',
    'public.politica_desde_texto(text)',
    'public.plans_sincronizar_politica()',
    'public.bookings_congelar_politica()',
    'public.plan_dates_proteger_fecha()'
  ] loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_function_privilege(r, f, 'execute') then raise exception 'FALLA: % puede ejecutar %', r, f; end if;
    end loop;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0) then
      raise exception 'FALLA: PUBLIC puede ejecutar %', f;
    end if;
  end loop;
  raise notice 'OK  funciones nuevas: ni PUBLIC, ni anon, ni authenticated';
  foreach f in array array[
    'public.aplicar_resultado_pago(text,text,text,bigint,text,jsonb,text,text)',
    'public.cancelar_reserva(uuid,uuid)',
    'public.crear_intento_pago(uuid,uuid)',
    'public.reembolso_por_politica(uuid)',
    'public.registrar_resultado_reembolso(uuid,text,text,jsonb,text)',
    'public.aplicar_politica_desde_texto()'
  ] loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_function_privilege(r, f, 'execute') then raise exception 'FALLA: % puede ejecutar %', r, f; end if;
    end loop;
    if not has_function_privilege('service_role', f, 'execute') then raise exception 'FALLA: service_role no ejecuta %', f; end if;
  end loop;
  raise notice 'OK  las funciones reemplazadas siguen siendo solo de service_role';
end $$;
select pg_temp.ok(has_function_privilege('authenticated', 'public.create_booking(uuid,int)', 'execute')
                  and not has_function_privilege('anon', 'public.create_booking(uuid,int)', 'execute'),
                  'create_booking: la ejecutan los viajeros autenticados y no anon');
select pg_temp.ok(has_function_privilege('authenticated', 'public.vista_previa_cancelacion(uuid)', 'execute')
                  and not has_function_privilege('anon', 'public.vista_previa_cancelacion(uuid)', 'execute'),
                  'vista_previa_cancelacion sigue siendo del viajero autenticado');
select pg_temp.como('viajero@demo.com');
set role anon;
select pg_temp.falla_con($q$select public.create_booking(gen_random_uuid(), 1)$q$,
                         'permission denied', 'anon no puede reservar');
reset role;

-- 8. Dispersión: el momento de salida es el congelado --------------------------------------------
do $$
declare v_b uuid; v_ag uuid; v_pd uuid;
begin
  v_ag := (select id from agencies where numero_rnt = '85421');
  v_pd := pg_temp.mk_fecha(48, 24, 50, 20);
  v_b := pg_temp.mk_reserva(v_pd, 'confirmada', 'viajero@demo.com', 'wompi');
  update bookings set created_at = now() - interval '3 hours' where id = v_b;
  perform pg_temp.ok(exists (select 1 from public.candidatos_anticipo(now()) where booking_id = v_b),
                     'una reserva pagada que sale en 20 h entra en el anticipo de las 48 h');
  -- La agencia mueve la hora de salida del plan: el anticipo sigue el momento congelado de la reserva.
  update plans set hora_salida = '00:01' where id = (select plan_id from plan_dates where id = v_pd);
  perform pg_temp.ok(exists (select 1 from public.candidatos_anticipo(now()) where booking_id = v_b),
                     'cambiar la hora del plan después no saca la reserva del anticipo (usa la salida congelada)');
  update bookings set salida_at = now() - interval '1 hour' where id = v_b;
  perform pg_temp.ok(not exists (select 1 from public.candidatos_anticipo(now()) where booking_id = v_b),
                     'con la salida congelada ya pasada, no hay anticipo');
  perform pg_temp.ok(public.contar_servicios_prestados(v_ag, now()) >= 1,
                     'esa reserva cuenta como servicio prestado (salida congelada pasada)');
end $$;

-- 9. Versión de los documentos legales ----------------------------------------------------------------
select pg_temp.ok(public.version_documentos_legales() = 'v2-2026-10',
                  'versión legal vigente: v2-2026-10 (los textos ahora describen Wompi en modo de prueba)');
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con($q$select public.registrar_consentimiento('terminos_viajero', 'v1-2026-10')$q$,
                         'VERSION_DESACTUALIZADA', 'aceptar la versión anterior ya no se admite');
select public.registrar_consentimiento('terminos_viajero', 'v2-2026-10');
select public.registrar_consentimiento('tratamiento_datos', 'v2-2026-10');
reset role;
select pg_temp.ok((select count(*) from consents where user_id = pg_temp.uid('viajero@demo.com') and version = 'v2-2026-10') = 2,
                  'la aceptación de la versión nueva queda registrada');

rollback;
