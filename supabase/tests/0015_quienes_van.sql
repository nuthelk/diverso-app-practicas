-- Pruebas de la migración 0015 («Quiénes van» y reseñas recientes del panel de agencias):
--   * quienes_van(uuid[]): reservas pendiente_pago y confirmada de las fechas dadas, SOLO si el plan es de la agencia
--     de quien llama (auth.uid()). Nombre corto = primera palabra + inicial del último apellido + «.»; nunca teléfono,
--     correo, documento ni id de usuario.
--   * resenas_recientes_agencia(int): últimas reseñas de los planes de la agencia, la más nueva primero, tope de 20.
--   * Nada para otra agencia, un viajero o un admin; anon sin permiso; permisos y security definer + search_path.
-- Fixtures propios (planes, fechas, reservas y reseñas creados aquí; nombres de viajeros cambiados dentro de la
-- transacción). Uso (sobre la BD local ya migrada; NO requiere db reset):
--   (echo "begin;"; cat supabase/tests/0015_quienes_van.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
end $$;
select set_config('test.uid_' || md5(e), (select id::text from auth.users where email = e), false)
  from unnest(array['ecoandes@demo.com', 'patrimonio@demo.com', 'viajero@demo.com', 'admin@demo.com',
                    'andres@demo.com', 'camila@demo.com', 'daniela@demo.com', 'esteban@demo.com',
                    'santiago@demo.com', 'juandavid@demo.com', 'mariana@demo.com', 'laura@demo.com']) e;
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

-- Fecha de un plan (borrador: no todas las agencias demo están verificadas) de la agencia cuyo dueño es p_dueno (el plan se llama p_titulo).
create or replace function pg_temp.mk_fecha(p_dueno text, p_titulo text) returns uuid language plpgsql as $$
declare v_plan uuid; v_pd uuid;
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado)
  values ((select id from agencies where owner_user_id = pg_temp.uid(p_dueno)), p_titulo, 'Guatapé', 'aventura',
          100000, 'borrador')
  returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
  values (v_plan, current_date + 30, 20, 20) returning id into v_pd;
  return v_pd;
end $$;

-- Reserva de un viajero con su nombre (cambiado dentro de la transacción) y el estado pedido.
create or replace function pg_temp.mk_reserva(p_clave text, p_pd uuid, p_viajero text, p_nombre text, p_pax int,
                                              p_estado public.booking_status) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  update profiles set nombre = p_nombre where id = pg_temp.uid(p_viajero);
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T15-' || p_clave, p_pd, pg_temp.uid(p_viajero), p_pax, 100000 * p_pax, p_estado)
  returning id into v_id;
  perform set_config('test.' || p_clave, v_id::text, false);
  return v_id;
end $$;

-- 0. Existen, con la forma pedida: security definer, search_path fijo, stable, solo authenticated ---------------------
select pg_temp.ok((select p.prosecdef and p.provolatile = 's' and p.proconfig::text like '%search_path=%'
                     from pg_proc p where p.oid = 'public.quienes_van(uuid[])'::regprocedure),
                  'quienes_van es security definer, stable y con search_path fijo');
select pg_temp.ok((select p.prosecdef and p.provolatile = 's' and p.proconfig::text like '%search_path=%'
                     from pg_proc p where p.oid = 'public.resenas_recientes_agencia(int)'::regprocedure),
                  'resenas_recientes_agencia es security definer, stable y con search_path fijo');
select pg_temp.ok(has_function_privilege('authenticated', 'public.quienes_van(uuid[])', 'execute')
                  and has_function_privilege('authenticated', 'public.resenas_recientes_agencia(int)', 'execute'),
                  'authenticated puede ejecutar ambas');
select pg_temp.ok(not has_function_privilege('anon', 'public.quienes_van(uuid[])', 'execute')
                  and not has_function_privilege('anon', 'public.resenas_recientes_agencia(int)', 'execute')
                  and not has_function_privilege('service_role', 'public.quienes_van(uuid[])', 'execute')
                  and not has_function_privilege('service_role', 'public.resenas_recientes_agencia(int)', 'execute'),
                  'anon y service_role no pueden ejecutarlas');
select pg_temp.ok(not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                               where p.oid in ('public.quienes_van(uuid[])'::regprocedure,
                                               'public.resenas_recientes_agencia(int)'::regprocedure)
                                 and a.grantee = 0),
                  'ninguna está concedida a PUBLIC');
select pg_temp.ok((select p.proargnames::text from pg_proc p where p.oid = 'public.quienes_van(uuid[])'::regprocedure)
                  = '{p_plan_date_ids,plan_date_id,booking_id,codigo,nombre_corto,pax,estado}',
                  'quienes_van devuelve solo plan_date_id, booking_id, codigo, nombre_corto, pax, estado');
select pg_temp.ok((select p.proargnames::text from pg_proc p where p.oid = 'public.resenas_recientes_agencia(int)'::regprocedure)
                  = '{p_limite,calificacion,comentario,nombre_corto,plan_titulo,created_at}',
                  'resenas_recientes_agencia devuelve solo calificacion, comentario, nombre_corto, plan_titulo, created_at');
select pg_temp.ok(not exists (select 1 from pg_proc p, unnest(p.proargnames) n
                               where p.oid in ('public.quienes_van(uuid[])'::regprocedure,
                                               'public.resenas_recientes_agencia(int)'::regprocedure)
                                 and n ~* 'tel|mail|correo|docu|viajero_id|user|whatsapp'),
                  'ninguna columna es de contacto, documento ni id de usuario');

-- 1. Regla del nombre corto (función interna, ejecutable solo con permisos del dueño de la función) -----------------
select pg_temp.ok(public.nombre_corto_viajero('Laura Vélez') = 'Laura V.', 'dos palabras: «Laura V.»');
select pg_temp.ok(public.nombre_corto_viajero('Andrés Felipe Muñoz Gil') = 'Andrés G.',
                  'varias palabras: primera + inicial de la última');
select pg_temp.ok(public.nombre_corto_viajero('Carolina') = 'Carolina', 'una sola palabra: solo esa palabra');
select pg_temp.ok(public.nombre_corto_viajero('  maría   del  carmen  ñandú ') = 'maría Ñ.',
                  'espacios de más se ignoran y la inicial va en mayúscula');
select pg_temp.ok(public.nombre_corto_viajero('') = 'Viajero' and public.nombre_corto_viajero('   ') = 'Viajero'
                  and public.nombre_corto_viajero(null) = 'Viajero', 'vacío o nulo: «Viajero»');
select pg_temp.ok(not has_function_privilege('authenticated', 'public.nombre_corto_viajero(text)', 'execute')
                  and not has_function_privilege('anon', 'public.nombre_corto_viajero(text)', 'execute'),
                  'el ayudante del nombre no es invocable por authenticated ni anon');

-- 2. Fixtures -------------------------------------------------------------------------------------------------------
select set_config('test.pd1', pg_temp.mk_fecha('ecoandes@demo.com', 'TEST Quiénes van A')::text, false);
select set_config('test.pd2', pg_temp.mk_fecha('patrimonio@demo.com', 'TEST Quiénes van B')::text, false);

select pg_temp.mk_reserva('b1', current_setting('test.pd1')::uuid, 'andres@demo.com',  'Laura Vélez', 2, 'pendiente_pago');
select pg_temp.mk_reserva('b2', current_setting('test.pd1')::uuid, 'camila@demo.com',  'Andrés Felipe Muñoz Gil', 3, 'confirmada');
select pg_temp.mk_reserva('b3', current_setting('test.pd1')::uuid, 'daniela@demo.com', 'Carolina', 1, 'confirmada');
select pg_temp.mk_reserva('b4', current_setting('test.pd1')::uuid, 'esteban@demo.com', '', 1, 'confirmada');
select pg_temp.mk_reserva('b5', current_setting('test.pd1')::uuid, 'santiago@demo.com', 'Santiago Gaviria', 4, 'cancelada');
select pg_temp.mk_reserva('b6', current_setting('test.pd1')::uuid, 'juandavid@demo.com', 'Juan David Zapata', 2, 'completada');
select pg_temp.mk_reserva('b7', current_setting('test.pd1')::uuid, 'mariana@demo.com', 'maría   del  carmen  ñandú', 2, 'confirmada');
select pg_temp.mk_reserva('b8', current_setting('test.pd2')::uuid, 'laura@demo.com', 'Laura Vélez', 2, 'confirmada');

-- Reseñas: b7 la más nueva, luego b4, b3, b2 (más una de la otra agencia, la más nueva de todas).
insert into reviews (booking_id, calificacion, comentario, created_at) values
  (current_setting('test.b7')::uuid, 5, null,         now() + interval '4 days'),
  (current_setting('test.b4')::uuid, 4, 'Muy bien',   now() + interval '3 days'),
  (current_setting('test.b3')::uuid, 3, 'Regular',    now() + interval '2 days'),
  (current_setting('test.b2')::uuid, 5, 'Excelente',  now() + interval '1 day'),
  (current_setting('test.b8')::uuid, 2, 'De la otra', now() + interval '10 days');

-- 3. La dueña de la agencia ve a quienes viajan -----------------------------------------------------------------------
select pg_temp.como('ecoandes@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])) = 5,
                  'ecoandes recibe sus 5 reservas vivas de 7 (cancelada y completada fuera)');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where estado not in ('pendiente_pago', 'confirmada')) = 0, 'solo pendiente_pago y confirmada');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id in (current_setting('test.b5')::uuid, current_setting('test.b6')::uuid)) = 0,
                  'la cancelada y la completada no aparecen');
select pg_temp.ok((select nombre_corto from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b1')::uuid) = 'Laura V.', 'dos palabras → «Laura V.»');
select pg_temp.ok((select nombre_corto from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b2')::uuid) = 'Andrés G.',
                  'varias palabras → primera + inicial de la última');
select pg_temp.ok((select nombre_corto from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b3')::uuid) = 'Carolina', 'una palabra → «Carolina»');
select pg_temp.ok((select nombre_corto from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b4')::uuid) = 'Viajero', 'nombre vacío → «Viajero»');
select pg_temp.ok((select nombre_corto from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b7')::uuid) = 'maría Ñ.', 'espacios múltiples y tilde');
select pg_temp.ok((select pax from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b2')::uuid) = 3
                  and (select codigo from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b2')::uuid) = 'T15-b2'
                  and (select estado from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where booking_id = current_setting('test.b1')::uuid) = 'pendiente_pago',
                  'pax, código y estado de la reserva');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])
                    where plan_date_id <> current_setting('test.pd1')::uuid) = 0, 'plan_date_id es el pedido');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid, current_setting('test.pd2')::uuid])) = 5,
                  'pedir también la fecha de otra agencia no agrega filas');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd2')::uuid])) = 0,
                  'la fecha de otra agencia devuelve 0 filas');
select pg_temp.ok((select count(*) from public.quienes_van(array[]::uuid[])) = 0
                  and (select count(*) from public.quienes_van(null)) = 0, 'sin fechas (vacío o nulo): 0 filas');
select pg_temp.ok(not exists (select 1 from public.quienes_van(array[current_setting('test.pd1')::uuid]) q,
                                   jsonb_object_keys(to_jsonb(q)) k
                               where k not in ('plan_date_id', 'booking_id', 'codigo', 'nombre_corto', 'pax', 'estado'))
                  and not exists (select 1 from public.quienes_van(array[current_setting('test.pd1')::uuid]) q
                                   where to_jsonb(q)::text ~* '@|demo\.com|telefono'),
                  'la fila serializada solo trae las 6 columnas y ningún dato de contacto');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia()) = 3, 'sin argumento, 3 reseñas');
select pg_temp.ok((select array_agg(comentario order by ord) from (
                     select comentario, row_number() over () ord from public.resenas_recientes_agencia()) r)
                  = array[null, 'Muy bien', 'Regular']::text[], 'de la más nueva a la más antigua (la de la otra agencia no cuenta)');
select pg_temp.ok((select array_agg(calificacion order by ord) from (
                     select calificacion, row_number() over () ord from public.resenas_recientes_agencia()) r) = array[5, 4, 3],
                  'calificaciones en ese orden');
select pg_temp.ok((select array_agg(nombre_corto order by ord) from (
                     select nombre_corto, row_number() over () ord from public.resenas_recientes_agencia()) r)
                  = array['maría Ñ.', 'Viajero', 'Carolina'], 'nombre corto de quien reseñó, con la misma regla');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia() where plan_titulo = 'TEST Quiénes van A') = 3
                  and (select min(created_at) from public.resenas_recientes_agencia()) > now() + interval '1 day',
                  'plan_titulo y created_at de cada reseña');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(2)) = 2, 'p_limite = 2 devuelve 2');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(0)) = 0, 'p_limite = 0 devuelve 0');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(-5)) = 0, 'p_limite negativo devuelve 0');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(null)) = 3, 'p_limite nulo usa el valor por defecto (3)');
reset role;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(1000)) = 0,
                  'sin sesión (postgres, auth.uid() nulo) no hay reseñas aunque pida 1000');
-- Tope de 20: se agregan reseñas de sobra a la agencia (bajo el rol postgres) y se pide mucho más.
insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
select 'T15-extra' || g, current_setting('test.pd1')::uuid, pg_temp.uid('viajero@demo.com'), 1, 100000, 'completada'
  from generate_series(1, 25) g;
insert into reviews (booking_id, calificacion, created_at)
select id, 4, now() + interval '2 days' from bookings where codigo like 'T15-extra%';
select pg_temp.como('ecoandes@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(1000)) = 20, 'el tope es 20 aunque pida 1000');
reset role;

-- 4. Otra agencia no ve nada de ecoandes (y sí lo suyo) ------------------------------------------------------------
select pg_temp.como('patrimonio@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])) = 0,
                  'otra agencia recibe 0 filas para los mismos ids');
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd2')::uuid])) = 1
                  and (select nombre_corto from public.quienes_van(array[current_setting('test.pd2')::uuid])) = 'Laura V.',
                  'la otra agencia sí recibe lo suyo');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(20) where plan_titulo = 'TEST Quiénes van A') = 0
                  and (select comentario from public.resenas_recientes_agencia(1)) = 'De la otra',
                  'las reseñas de ecoandes no salen para otra agencia');
reset role;

-- 5. Viajero, admin y sesión sin usuario: nada. Anon: sin permiso ---------------------------------------------------
select pg_temp.como('viajero@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid, current_setting('test.pd2')::uuid])) = 0,
                  'un viajero recibe 0 filas');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia(20)) = 0, 'un viajero no recibe reseñas');
reset role;
select pg_temp.como('admin@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])) = 0
                  and (select count(*) from public.resenas_recientes_agencia(20)) = 0,
                  'un admin (no dueño de agencia) recibe 0 filas');
reset role;
select set_config('request.jwt.claim.sub', '', false);
set local role authenticated;
select pg_temp.ok((select count(*) from public.quienes_van(array[current_setting('test.pd1')::uuid])) = 0
                  and (select count(*) from public.resenas_recientes_agencia(20)) = 0,
                  'authenticated sin usuario en el token recibe 0 filas');
reset role;
set local role anon;
select pg_temp.falla_con($q$select * from public.quienes_van(array[gen_random_uuid()])$q$, 'permission denied',
                         'anon no puede ejecutar quienes_van');
select pg_temp.falla_con($q$select * from public.resenas_recientes_agencia(3)$q$, 'permission denied',
                         'anon no puede ejecutar resenas_recientes_agencia');
reset role;

rollback;
