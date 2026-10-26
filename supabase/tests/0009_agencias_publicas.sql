-- Pruebas de la migración 0009 (catálogo público de agencias para la app del viajero).
-- agencias_publicas(): solo agencias habilitadas con planes publicados, solo columnas públicas
-- (sin contactos, comisión ni datos de verificación), puntaje ponderado por reseñas
-- (null si no hay reseñas: la app muestra «Nueva») y portada del plan mejor puntuado.
-- Solo lo ejecuta un usuario autenticado; el anónimo no (igual que el catálogo de planes).
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0009_agencias_publicas.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como(p_email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub',
    coalesce((select id::text from auth.users where email = p_email), ''), false);
end $$;
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

-- Datos de prueba (como postgres: sin auth.uid(), los guardias no intervienen) --------------------
create or replace function pg_temp.mk_agencia(p_nombre text, p_rnt text, p_estado verification_status, p_vigencia date)
returns uuid language sql as $$
  insert into agencies (nombre, descripcion, numero_rnt, matricula_camara_comercio, ciudad, telefono, email, whatsapp,
                        logo_url, estado_verificacion, rnt_vigente_hasta, comision_pct)
  values (p_nombre, 'Descripción ' || p_nombre, p_rnt, '123456', 'Envigado', '3001112233', p_nombre || '@x.co', '3001112233',
          'https://logos.test/' || p_rnt || '.png', p_estado, p_vigencia, 9.5)
  returning id $$;
create or replace function pg_temp.mk_plan(p_agencia uuid, p_titulo text, p_estado plan_status, p_rating numeric,
                                           p_reviews int, p_fotos text[], p_creado timestamptz default now())
returns uuid language sql as $$
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado, rating_promedio, reviews_count, fotos, created_at)
  values (p_agencia, p_titulo, 'Guatapé', 'aventura', 100000, p_estado, p_rating, p_reviews, p_fotos, p_creado)
  returning id $$;

-- Ponderado: (5.00×1 + 4.00×3) / 4 = 4.25; portada = 1.ª foto del mejor puntuado; el borrador no cuenta.
select set_config('t.pesos', pg_temp.mk_agencia('T9 Ponderada', '90000001', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.pesos')::uuid, 'T9 mejor', 'publicado', 5.00, 1, array['https://fotos.test/mejor-1.jpg', 'https://fotos.test/mejor-2.jpg']);
select pg_temp.mk_plan(current_setting('t.pesos')::uuid, 'T9 otro', 'publicado', 4.00, 3, array['https://fotos.test/otro-1.jpg']);
select pg_temp.mk_plan(current_setting('t.pesos')::uuid, 'T9 borrador', 'borrador', 1.00, 50, array['https://fotos.test/borrador.jpg']);
-- El mejor puntuado no tiene fotos: la portada cae en la foto de otro plan publicado.
select set_config('t.sinfoto', pg_temp.mk_agencia('T9 Portada alterna', '90000002', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.sinfoto')::uuid, 'T9 sin foto', 'publicado', 5.00, 2, '{}');
select pg_temp.mk_plan(current_setting('t.sinfoto')::uuid, 'T9 con foto', 'publicado', 3.00, 1, array['https://fotos.test/alterna.jpg']);
-- Sin reseñas: puntaje null.
select set_config('t.nueva', pg_temp.mk_agencia('T9 Nueva', '90000003', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.nueva')::uuid, 'T9 nuevo', 'publicado', 0, 0, '{}');
-- Excluidas: solo borradores, RNT vencido y pendiente (con plan publicado antes de perder la habilitación).
select set_config('t.borrador', pg_temp.mk_agencia('T9 Solo borrador', '90000004', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.borrador')::uuid, 'T9 b', 'borrador', 0, 0, '{}');
select set_config('t.vencida', pg_temp.mk_agencia('T9 Vencida', '90000005', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.vencida')::uuid, 'T9 v', 'publicado', 5.00, 9, array['https://fotos.test/v.jpg']);
select set_config('t.pendiente', pg_temp.mk_agencia('T9 Pendiente', '90000006', 'verificado', current_date + 100)::text, false);
select pg_temp.mk_plan(current_setting('t.pendiente')::uuid, 'T9 p', 'publicado', 5.00, 9, array['https://fotos.test/p.jpg']);
alter table agencies disable trigger agencies_guard_verification;
update agencies set rnt_vigente_hasta = current_date - 1 where id = current_setting('t.vencida')::uuid;
update agencies set estado_verificacion = 'pendiente', rnt_vigente_hasta = null where id = current_setting('t.pendiente')::uuid;
alter table agencies enable trigger agencies_guard_verification;

-- 1. Grants: el viajero autenticado sí; el anónimo no ---------------------
select pg_temp.ok(has_function_privilege('authenticated', 'public.agencias_publicas(uuid)', 'execute'),
                  'authenticated puede ejecutar agencias_publicas');
select pg_temp.ok(not has_function_privilege('anon', 'public.agencias_publicas(uuid)', 'execute'),
                  'anon no puede ejecutar agencias_publicas');
select pg_temp.ok(not has_function_privilege('public', 'public.agencias_publicas(uuid)', 'execute'),
                  'PUBLIC no puede ejecutar agencias_publicas');
set role anon;
select pg_temp.falla_con('select * from public.agencias_publicas()', 'permission denied', 'anon recibe permission denied');
reset role;

-- 2. Columnas exactas: ninguna columna privada sale por aquí --------------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((select array_agg(k order by k)
                     from jsonb_object_keys((select to_jsonb(f) from public.agencias_publicas() f limit 1)) k)
                  = array['ciudad', 'descripcion', 'id', 'logo_url', 'nombre', 'planes_count', 'portada_url', 'rating', 'reviews_total'],
                  'columnas exactas: id, nombre, ciudad, descripcion, logo_url, planes_count, rating, reviews_total, portada_url');
select pg_temp.ok(not exists (
                    select 1 from (select jsonb_object_keys(to_jsonb(f)) k from public.agencias_publicas() f) s
                     where k in ('telefono', 'email', 'whatsapp', 'comision_pct', 'owner_user_id', 'numero_rnt',
                                 'matricula_camara_comercio', 'motivo_rechazo', 'estado_verificacion', 'rnt_vigente_hasta',
                                 'verificado_por', 'verificado_at', 'anticipo_bloqueado', 'created_at')),
                  'no expone contactos, comisión ni datos de verificación');
reset role;

-- 3. Filas: solo agencias habilitadas con planes publicados ---------------
set role authenticated;
select pg_temp.ok((select count(*) from public.agencias_publicas())
                  = (select count(*) from agencies a where public.agencia_habilitada(a.id)
                       and exists (select 1 from plans p where p.agency_id = a.id and p.estado = 'publicado')),
                  'una fila por agencia habilitada con al menos un plan publicado');
select pg_temp.ok(not exists (select 1 from public.agencias_publicas() where nombre = 'Pueblos Patrimonio Travel'),
                  'la agencia pendiente real no aparece');
select pg_temp.ok(not exists (select 1 from public.agencias_publicas()
                               where id in (current_setting('t.borrador')::uuid, current_setting('t.vencida')::uuid,
                                            current_setting('t.pendiente')::uuid)),
                  'no aparecen: solo borradores, RNT vencido ni pendiente');
select pg_temp.ok((select count(*) from public.agencias_publicas() where id = current_setting('t.pesos')::uuid) = 1,
                  'una agencia habilitada con planes publicados aparece una sola vez');
reset role;

-- 4. Agregados -----------------------------------------------------------
set role authenticated;
select pg_temp.ok((select rating = 4.25 and reviews_total = 4 and planes_count = 2
                     from public.agencias_publicas() where id = current_setting('t.pesos')::uuid),
                  'puntaje ponderado por reseñas 4.25 sobre 4 reseñas, 2 planes publicados (el borrador no cuenta)');
-- Esperado calculado desde `reviews` (no literal): el seed agrega reseñas demo y el total cambia.
-- Tolerancia de 0.01 porque la función promedia `rating_promedio` ya redondeado por plan.
select pg_temp.ok((select abs(ap.rating - e.promedio) <= 0.01 and ap.reviews_total = e.total
                     from public.agencias_publicas() ap,
                          (select round(avg(r.calificacion), 2) as promedio, count(*)::int as total
                             from reviews r
                             join plans p on p.id = r.plan_id and p.estado = 'publicado'
                             join agencies a on a.id = p.agency_id
                            where a.nombre = 'Rutas de Antioquia Cultural') e
                    where ap.nombre = 'Rutas de Antioquia Cultural'),
                  'Rutas de Antioquia Cultural: puntaje y total coinciden con sus reseñas publicadas');
select pg_temp.ok((select rating is null and reviews_total = 0 and planes_count = 1
                     from public.agencias_publicas() where id = current_setting('t.nueva')::uuid),
                  'sin reseñas el puntaje es null (la app muestra «Nueva»), nunca 0');
select pg_temp.ok((select count(*) from public.agencias_publicas() where rating is null) >= 1
                  and not exists (select 1 from public.agencias_publicas() where rating = 0),
                  'ninguna agencia devuelve puntaje 0');
select pg_temp.ok((select portada_url from public.agencias_publicas() where id = current_setting('t.pesos')::uuid)
                  = 'https://fotos.test/mejor-1.jpg',
                  'portada = primera foto del plan publicado mejor puntuado');
select pg_temp.ok((select portada_url from public.agencias_publicas() where id = current_setting('t.sinfoto')::uuid)
                  = 'https://fotos.test/alterna.jpg',
                  'si el mejor puntuado no tiene fotos, la portada cae en la foto de otro plan publicado');
select pg_temp.ok((select portada_url is null from public.agencias_publicas() where id = current_setting('t.nueva')::uuid),
                  'sin ninguna foto la portada es null');
select pg_temp.ok((select logo_url = 'https://logos.test/90000001.png' and nombre = 'T9 Ponderada' and ciudad = 'Envigado'
                          and descripcion = 'Descripción T9 Ponderada'
                     from public.agencias_publicas() where id = current_setting('t.pesos')::uuid),
                  'devuelve nombre, ciudad, descripción y logo públicos');
-- Una sola agencia por id
select pg_temp.ok((select count(*) from public.agencias_publicas(current_setting('t.pesos')::uuid)) = 1
                  and (select nombre from public.agencias_publicas(current_setting('t.pesos')::uuid)) = 'T9 Ponderada',
                  'agencias_publicas(id) devuelve solo esa agencia');
select pg_temp.ok((select count(*) from public.agencias_publicas(current_setting('t.pendiente')::uuid)) = 0
                  and (select count(*) from public.agencias_publicas(gen_random_uuid())) = 0,
                  'agencias_publicas(id) no devuelve agencias excluidas ni inexistentes');
reset role;

-- 5. PRESERVE: el catálogo de planes y sus políticas siguen igual --------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) from plans) = (select count(*) from plans p where p.estado = 'publicado'
                                                   and public.agencia_habilitada(p.agency_id)),
                  'el viajero sigue viendo exactamente los planes publicados de agencias habilitadas');
select pg_temp.ok((select count(*) from plans p join agencies a on a.id = p.agency_id) = (select count(*) from plans),
                  'la consulta plans + agencies(*) del catálogo sigue resolviendo la agencia de cada plan');
select pg_temp.ok(not exists (select 1 from agencies where estado_verificacion <> 'verificado'),
                  'agencies_select_visible sigue ocultando agencias no verificadas');
reset role;
select pg_temp.ok((select count(*) from pg_policies where schemaname = 'public' and tablename = 'agencies'
                      and policyname = 'agencies_select_visible') = 1
                  and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'plans'
                      and policyname = 'plans_select_published') = 1,
                  'las políticas existentes de agencies y plans no se tocaron');

rollback;
