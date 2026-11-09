-- Pruebas de la migración 0018 (todas las reseñas de la agencia, con paginación):
--   * resenas_agencia(p_limite, p_desde): reseñas de los planes de la agencia de quien llama (auth.uid()), la más nueva
--     primero y con `id` como desempate; las páginas no se solapan ni se saltan filas.
--   * p_limite se acota a 1–50 (por defecto 20); p_desde nunca es negativo (nulo = 0).
--   * Nada para otra agencia, un viajero, un admin ni una sesión sin usuario; anon sin permiso; security definer +
--     search_path fijo; el viajero solo aparece con su nombre corto (nunca correo ni teléfono).
--   * resenas_recientes_agencia (0015) no cambia.
-- Fixtures propios (planes, fechas, reservas y reseñas creados aquí; nombres de viajeros cambiados dentro de la
-- transacción). Uso (sobre la BD local ya migrada; NO requiere db reset):
--   (echo "begin;"; cat supabase/tests/0018_resenas_agencia.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
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
                    'andres@demo.com', 'camila@demo.com', 'daniela@demo.com', 'esteban@demo.com', 'laura@demo.com']) e;
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

-- Fecha de un plan (borrador) de la agencia cuyo dueño es p_dueno (el plan se llama p_titulo).
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

-- Reserva completada de un viajero con su nombre (cambiado dentro de la transacción).
create or replace function pg_temp.mk_reserva(p_clave text, p_pd uuid, p_viajero text, p_nombre text) returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  update profiles set nombre = p_nombre where id = pg_temp.uid(p_viajero);
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T18-' || p_clave, p_pd, pg_temp.uid(p_viajero), 1, 100000, 'completada')
  returning id into v_id;
  perform set_config('test.' || p_clave, v_id::text, false);
  return v_id;
end $$;

-- 0. Existe, con la forma pedida: security definer, search_path fijo, stable, solo authenticated ----------------------
select pg_temp.ok((select p.prosecdef and p.provolatile = 's' and p.proconfig::text like '%search_path=%'
                     from pg_proc p where p.oid = 'public.resenas_agencia(int,int)'::regprocedure),
                  'resenas_agencia es security definer, stable y con search_path fijo');
select pg_temp.ok(has_function_privilege('authenticated', 'public.resenas_agencia(int,int)', 'execute'),
                  'authenticated puede ejecutarla');
select pg_temp.ok(not has_function_privilege('anon', 'public.resenas_agencia(int,int)', 'execute')
                  and not has_function_privilege('service_role', 'public.resenas_agencia(int,int)', 'execute'),
                  'anon y service_role no pueden ejecutarla');
select pg_temp.ok(not exists (select 1 from pg_proc p, aclexplode(p.proacl) a
                               where p.oid = 'public.resenas_agencia(int,int)'::regprocedure and a.grantee = 0),
                  'no está concedida a PUBLIC');
select pg_temp.ok((select p.proargnames::text from pg_proc p where p.oid = 'public.resenas_agencia(int,int)'::regprocedure)
                  = '{p_limite,p_desde,id,calificacion,comentario,nombre_corto,plan_titulo,created_at}',
                  'devuelve id, calificacion, comentario, nombre_corto, plan_titulo y created_at');
select pg_temp.ok(not exists (select 1 from pg_proc p, unnest(p.proargnames) n
                               where p.oid = 'public.resenas_agencia(int,int)'::regprocedure
                                 and n ~* 'tel|mail|correo|docu|viajero|user|whatsapp'),
                  'ninguna columna es de contacto, documento ni id de usuario');

-- 1. Fixtures: 4 reseñas con nombres de prueba, 55 empatadas en la misma fecha, y una de la otra agencia ----------------
select set_config('test.pd1', pg_temp.mk_fecha('ecoandes@demo.com', 'TEST Reseñas A')::text, false);
select set_config('test.pd2', pg_temp.mk_fecha('patrimonio@demo.com', 'TEST Reseñas B')::text, false);

select pg_temp.mk_reserva('b1', current_setting('test.pd1')::uuid, 'andres@demo.com',  'Laura Vélez');
select pg_temp.mk_reserva('b2', current_setting('test.pd1')::uuid, 'camila@demo.com',  'laura.velez94@gmail.com');
select pg_temp.mk_reserva('b3', current_setting('test.pd1')::uuid, 'daniela@demo.com', 'Carolina 3001234567 carolina@x.com');
select pg_temp.mk_reserva('b4', current_setting('test.pd1')::uuid, 'esteban@demo.com', 'Andrés Felipe Muñoz Gil');
select pg_temp.mk_reserva('b5', current_setting('test.pd2')::uuid, 'laura@demo.com',   'Laura Vélez');

insert into reviews (booking_id, calificacion, comentario, created_at) values
  (current_setting('test.b1')::uuid, 5, null,         now() + interval '10 days'),
  (current_setting('test.b2')::uuid, 4, 'Muy bien',   now() + interval '9 days'),
  (current_setting('test.b3')::uuid, 3, 'Regular',    now() + interval '8 days'),
  (current_setting('test.b4')::uuid, 2, 'Mejorable',  now() + interval '7 days'),
  (current_setting('test.b5')::uuid, 1, 'De la otra', now() + interval '20 days');

-- 55 reseñas con el MISMO created_at: el orden y las páginas dependen del desempate por id.
insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
select 'T18-extra' || g, current_setting('test.pd1')::uuid, pg_temp.uid('viajero@demo.com'), 1, 100000, 'completada'
  from generate_series(1, 55) g;
insert into reviews (booking_id, calificacion, comentario, created_at)
select id, 4, 'Extra', now() + interval '1 day' from bookings where codigo like 'T18-extra%';

-- La lista completa y ordenada que debe salir para ecoandes, calculada sin pasar por la función ni por auth.uid().
select set_config('test.esperado',
  (select array_agg(r.id order by r.created_at desc, r.id desc)::text
     from reviews r
     join plans p on p.id = r.plan_id
     join agencies a on a.id = p.agency_id and a.owner_user_id = pg_temp.uid('ecoandes@demo.com')), false);
select pg_temp.ok(cardinality(current_setting('test.esperado')::uuid[]) > 60,
                  'hay más de 60 reseñas para ecoandes (para probar el tope de 50 y varias páginas)');

-- 2. La dueña: solo lo suyo, de la más nueva a la más antigua ----------------------------------------------------------
select pg_temp.como('ecoandes@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_agencia()) = 20, 'sin argumentos, la primera página trae 20');
select pg_temp.ok((select array_agg(id order by ordinality) from public.resenas_agencia() with ordinality)
                  = (current_setting('test.esperado')::uuid[])[1:20],
                  'sin argumentos son las 20 más nuevas, en orden');
select pg_temp.ok((select array_agg(comentario order by ordinality) from public.resenas_agencia(4) with ordinality)
                  is not distinct from array[null, 'Muy bien', 'Regular', 'Mejorable']::text[],
                  'de la más nueva a la más antigua; la de la otra agencia no cuenta');
select pg_temp.ok((select array_agg(calificacion order by ordinality) from public.resenas_agencia(4) with ordinality)
                  = array[5, 4, 3, 2], 'calificaciones en ese orden');
select pg_temp.ok((select array_agg(nombre_corto order by ordinality) from public.resenas_agencia(4) with ordinality)
                  = array['Laura V.', 'Viajero', 'Carolina', 'Andrés G.'],
                  'nombre corto: un correo o un teléfono en el nombre del perfil nunca sale');
select pg_temp.ok((select count(*) from public.resenas_agencia(4) where plan_titulo = 'TEST Reseñas A') = 4
                  and (select min(created_at) from public.resenas_agencia(4)) > now() + interval '6 days',
                  'plan_titulo y created_at de cada reseña');
select pg_temp.ok(not exists (select 1 from public.resenas_agencia(50) q, jsonb_object_keys(to_jsonb(q)) k
                               where k not in ('id', 'calificacion', 'comentario', 'nombre_corto', 'plan_titulo', 'created_at'))
                  and not exists (select 1 from public.resenas_agencia(50) q where to_jsonb(q)::text ~* '@|demo\.com|telefono|3001234567'),
                  'la fila serializada solo trae las 6 columnas y ningún dato de contacto');
select pg_temp.ok(not exists (select 1 from public.resenas_agencia(50) where plan_titulo = 'TEST Reseñas B' or comentario = 'De la otra'),
                  'ninguna reseña de otra agencia');

-- 3. Paginación: disjunta, ordenada y completa -------------------------------------------------------------------------
select pg_temp.ok((select array_agg(id order by ordinality) from public.resenas_agencia(20, 20) with ordinality)
                  = (current_setting('test.esperado')::uuid[])[21:40],
                  'la página 2 (desde 20) son las reseñas 21 a 40 de la lista');
select pg_temp.ok(not exists (select 1 from public.resenas_agencia(20, 0) a join public.resenas_agencia(20, 20) b using (id)),
                  'las páginas 1 y 2 no comparten ninguna reseña');
select pg_temp.ok((select array_agg(t.id order by o, t.ordinality)
                     from generate_series(0, 300, 7) o
                    cross join lateral public.resenas_agencia(7, o) with ordinality as t)
                  = current_setting('test.esperado')::uuid[],
                  'recorrer de a 7 reconstruye la lista completa, sin duplicados ni saltos (incluso con created_at empatado)');
select pg_temp.ok((select count(*) from public.resenas_agencia(50, cardinality(current_setting('test.esperado')::uuid[]) - 2)) = 2,
                  'la última página trae lo que queda');
select pg_temp.ok((select count(*) from public.resenas_agencia(20, cardinality(current_setting('test.esperado')::uuid[]))) = 0
                  and (select count(*) from public.resenas_agencia(20, 100000)) = 0,
                  'pasado el final no hay filas');

-- 4. Topes del límite y del desplazamiento -----------------------------------------------------------------------------
select pg_temp.ok((select count(*) from public.resenas_agencia(100)) = 50, 'p_limite = 100 se acota a 50');
select pg_temp.ok((select count(*) from public.resenas_agencia(50)) = 50, 'p_limite = 50 devuelve 50');
select pg_temp.ok((select count(*) from public.resenas_agencia(10)) = 10, 'p_limite = 10 devuelve 10');
select pg_temp.ok((select count(*) from public.resenas_agencia(0)) = 1, 'p_limite = 0 se sube a 1');
select pg_temp.ok((select count(*) from public.resenas_agencia(-5)) = 1, 'p_limite negativo se sube a 1');
select pg_temp.ok((select count(*) from public.resenas_agencia(null)) = 20, 'p_limite nulo usa el valor por defecto (20)');
select pg_temp.ok((select array_agg(id order by ordinality) from public.resenas_agencia(5, -3) with ordinality)
                  = (current_setting('test.esperado')::uuid[])[1:5],
                  'p_desde negativo cuenta como 0');
select pg_temp.ok((select array_agg(id order by ordinality) from public.resenas_agencia(5, null) with ordinality)
                  = (current_setting('test.esperado')::uuid[])[1:5],
                  'p_desde nulo cuenta como 0');
select pg_temp.ok((select count(*) from public.resenas_agencia(p_desde => 5)) = 20,
                  'se puede pasar solo p_desde por nombre y el límite sigue en 20');

-- 5. PRESERVE: la función del Resumen no cambió -------------------------------------------------------------------------
select pg_temp.ok((select p.proargnames::text from pg_proc p where p.oid = 'public.resenas_recientes_agencia(int)'::regprocedure)
                  = '{p_limite,calificacion,comentario,nombre_corto,plan_titulo,created_at}',
                  'resenas_recientes_agencia sigue con sus 5 columnas');
select pg_temp.ok((select count(*) from public.resenas_recientes_agencia()) = 3
                  and (select array_agg(comentario order by ordinality) from public.resenas_recientes_agencia() with ordinality)
                      is not distinct from array[null, 'Muy bien', 'Regular']::text[],
                  'resenas_recientes_agencia sigue devolviendo 3 por defecto, en el mismo orden');
select pg_temp.ok((select array_agg(comentario order by ordinality) from public.resenas_agencia(3) with ordinality)
                  is not distinct from (select array_agg(comentario order by ordinality) from public.resenas_recientes_agencia() with ordinality),
                  'la página completa empieza con las mismas 3 del Resumen');
reset role;

-- 6. Otra agencia no ve nada de ecoandes (y sí lo suyo) -----------------------------------------------------------------
select pg_temp.como('patrimonio@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_agencia(50) where plan_titulo = 'TEST Reseñas A') = 0
                  and not exists (select 1 from public.resenas_agencia(50) r
                                   where r.id = any (current_setting('test.esperado')::uuid[])),
                  'las reseñas de ecoandes no salen para otra agencia');
select pg_temp.ok((select comentario from public.resenas_agencia(1)) = 'De la otra'
                  and (select nombre_corto from public.resenas_agencia(1)) = 'Laura V.',
                  'la otra agencia sí ve lo suyo, con nombre corto');
reset role;

-- 7. Viajero, admin y sesión sin usuario: nada. Anon: sin permiso -------------------------------------------------------
select pg_temp.como('viajero@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_agencia(50)) = 0, 'un viajero no recibe reseñas');
reset role;
select pg_temp.como('admin@demo.com');
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_agencia(50)) = 0, 'un admin (no dueño de agencia) no recibe reseñas');
reset role;
select set_config('request.jwt.claim.sub', '', false);
set local role authenticated;
select pg_temp.ok((select count(*) from public.resenas_agencia(50)) = 0, 'authenticated sin usuario en el token no recibe reseñas');
reset role;
select pg_temp.ok((select count(*) from public.resenas_agencia(50)) = 0, 'sin sesión (postgres, auth.uid() nulo) no hay reseñas');
set local role anon;
select pg_temp.falla_con($q$select * from public.resenas_agencia(20, 0)$q$, 'permission denied',
                         'anon no puede ejecutar resenas_agencia');
reset role;

rollback;
