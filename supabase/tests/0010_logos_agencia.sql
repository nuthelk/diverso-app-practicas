-- Pruebas de la migración 0010 (logo de la agencia: bucket `agency-logos` y agencies.logo_url).
-- La dueña sube, reemplaza y borra objetos solo en su carpeta `<agency_id>/…` y solo imágenes
-- (png, jpg, jpeg, webp; máx. 2 MB); el viajero y las demás agencias no escriben; y
-- `agencies.logo_url` solo puede apuntar a un objeto de esa carpeta (sin URLs externas).
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0010_logos_agencia.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK (los objetos de prueba son filas de
-- storage.objects dentro de esa transacción; no se sube ningún archivo real).
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
-- Filas que afectó una sentencia (RLS oculta las ajenas: 0 filas, sin error).
create or replace function pg_temp.filas(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
do $$ begin execute format('grant usage on schema %I to authenticated, anon, service_role', pg_my_temp_schema()::regnamespace); end $$;

-- Agencias de prueba: A = EcoAndes, B = Graffiti (dueñas reales de la BD local) --------------------
select set_config('t.a', (select a.id::text from agencies a join auth.users u on u.id = a.owner_user_id
                           where u.email = 'ecoandes@demo.com'), false);
select set_config('t.b', (select a.id::text from agencies a join auth.users u on u.id = a.owner_user_id
                           where u.email = 'graffiti@demo.com'), false);
select set_config('t.base', 'http://127.0.0.1:54331/storage/v1/object/public/agency-logos/', false);
-- Objeto existente de B (como postgres: sin RLS) y de A para probar el borrado/reemplazo.
insert into storage.objects (bucket_id, name) values ('agency-logos', current_setting('t.b') || '/logo-b.png');
insert into storage.objects (bucket_id, name) values ('agency-logos', current_setting('t.a') || '/logo-viejo.png');
-- Un objeto del bucket de fotos de planes de A (otro bucket, mismo agency_id).
insert into storage.objects (bucket_id, name) values ('plan-photos', current_setting('t.a') || '/foto.png');

-- Storage prohíbe el DELETE directo salvo que la sesión marque que lo hace su API; así emula la prueba
-- el borrado por la API (las políticas RLS siguen aplicando igual). Es local a la transacción.
select set_config('storage.allow_delete_query', 'true', true);

-- 1. Bucket: tope de 2 MB y solo png/jpeg/webp ------------------------------------------------------
select pg_temp.ok((select file_size_limit = 2097152 from storage.buckets where id = 'agency-logos'),
                  'el bucket agency-logos limita cada archivo a 2 MB');
select pg_temp.ok((select allowed_mime_types::text[] @> array['image/png', 'image/jpeg', 'image/webp']
                          and cardinality(allowed_mime_types) = 3 from storage.buckets where id = 'agency-logos'),
                  'el bucket agency-logos solo admite image/png, image/jpeg e image/webp');
select pg_temp.ok((select public from storage.buckets where id = 'agency-logos'),
                  'el bucket sigue siendo público (la app muestra el logo por URL)');
select pg_temp.ok((select file_size_limit is null and allowed_mime_types is null from storage.buckets where id = 'plan-photos'),
                  'PRESERVE: plan-photos no cambia (sin límites, como antes)');

-- 2. La dueña escribe en su carpeta ------------------------------------------------------------------
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                       current_setting('t.a') || '/logo-1.png')) = 1,
                  'la dueña sube un png a su carpeta');
select pg_temp.ok(pg_temp.filas(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                       current_setting('t.a') || '/logo-2.webp')) = 1,
                  'la dueña sube un webp a su carpeta');
select pg_temp.ok(pg_temp.filas(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                       current_setting('t.a') || '/logo-3.JPG')) = 1,
                  'la dueña sube un jpg (extensión en mayúsculas) a su carpeta');
select pg_temp.ok(pg_temp.filas(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                       current_setting('t.a') || '/logo-4.jpeg')) = 1,
                  'la dueña sube un jpeg a su carpeta');

-- Reemplazo: actualizar su propio objeto es posible (upsert del cliente de Storage).
select pg_temp.ok(pg_temp.filas(format($q$update storage.objects set name = %L where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.a') || '/logo-1b.png', current_setting('t.a') || '/logo-1.png')) = 1,
                  'la dueña actualiza un objeto de su carpeta');
-- Borrado: elimina el logo anterior al reemplazar o al quitarlo.
select pg_temp.ok(pg_temp.filas(format($q$delete from storage.objects where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.a') || '/logo-viejo.png')) = 1,
                  'la dueña borra un objeto de su carpeta');

-- 3. La dueña no sale de su carpeta ni sube otros tipos ----------------------------------------------
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.b') || '/intruso.png'),
                         'row-level security', 'no sube a la carpeta de otra agencia');
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                'suelto.png'),
                         'row-level security', 'no sube fuera de una carpeta de agencia');
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/pagina.html'),
                         'row-level security', 'no sube un html a su carpeta');
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/vector.svg'),
                         'row-level security', 'no sube un svg a su carpeta (puede llevar scripts)');
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/sin-extension'),
                         'row-level security', 'no sube un archivo sin extensión');
select pg_temp.ok(pg_temp.filas(format($q$update storage.objects set name = %L where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.b') || '/logo-b2.png', current_setting('t.b') || '/logo-b.png')) = 0,
                  'no actualiza objetos de otra agencia (0 filas)');
select pg_temp.falla_con(format($q$update storage.objects set name = %L where bucket_id = 'agency-logos' and name = %L$q$,
                                current_setting('t.b') || '/movido.png', current_setting('t.a') || '/logo-1b.png'),
                         'row-level security', 'no mueve su objeto a la carpeta de otra agencia');
select pg_temp.falla_con(format($q$update storage.objects set name = %L where bucket_id = 'agency-logos' and name = %L$q$,
                                current_setting('t.a') || '/logo-1b.html', current_setting('t.a') || '/logo-1b.png'),
                         'row-level security', 'no renombra su logo a una extensión no permitida');
select pg_temp.ok(pg_temp.filas(format($q$delete from storage.objects where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.b') || '/logo-b.png')) = 0,
                  'no borra objetos de otra agencia (0 filas)');
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('plan-photos', %L)$q$,
                                current_setting('t.b') || '/foto.png'),
                         'row-level security', 'PRESERVE: plan-photos sigue limitado a la carpeta de la dueña');
reset role;
select pg_temp.ok(exists (select 1 from storage.objects where bucket_id = 'agency-logos' and name = current_setting('t.b') || '/logo-b.png'),
                  'el objeto de la otra agencia sigue intacto');

-- 4. El viajero, el admin y el anónimo no escriben ---------------------------------------------------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/viajero.png'),
                         'row-level security', 'el viajero no sube a la carpeta de una agencia');
select pg_temp.ok(pg_temp.filas(format($q$update storage.objects set name = %L where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.a') || '/hackeado.png', current_setting('t.a') || '/logo-1b.png')) = 0,
                  'el viajero no actualiza el logo de una agencia (0 filas)');
select pg_temp.ok(pg_temp.filas(format($q$delete from storage.objects where bucket_id = 'agency-logos' and name = %L$q$,
                                       current_setting('t.a') || '/logo-1b.png')) = 0,
                  'el viajero no borra el logo de una agencia (0 filas)');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'agency-logos' and name = current_setting('t.a') || '/logo-1b.png') = 1,
                  'el viajero sigue pudiendo leer los logos (bucket público)');
reset role;
select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/admin.png'),
                         'row-level security', 'el admin no escribe en carpetas ajenas (igual que antes de 0010)');
reset role;
set role anon;
select pg_temp.falla_con(format($q$insert into storage.objects (bucket_id, name) values ('agency-logos', %L)$q$,
                                current_setting('t.a') || '/anon.png'),
                         'row-level security', 'el anónimo no sube logos');
select pg_temp.ok((select count(*) from storage.objects where bucket_id = 'agency-logos') > 0,
                  'el anónimo puede leer los logos');
reset role;

-- 5. agencies.logo_url solo apunta a un objeto de la carpeta de la agencia -----------------------------
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = %L where id = %L$q$,
                                       current_setting('t.base') || current_setting('t.a') || '/logo-1b.png', current_setting('t.a'))) = 1,
                  'logo_url acepta la URL pública de un objeto de la carpeta de la agencia');
select pg_temp.ok((select logo_url = current_setting('t.base') || current_setting('t.a') || '/logo-1b.png'
                     from agencies where id = current_setting('t.a')::uuid),
                  'logo_url queda guardado');
select pg_temp.falla_con(format($q$update agencies set logo_url = 'https://evil.example/logo.png' where id = %L$q$, current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza una URL externa');
select pg_temp.falla_con(format($q$update agencies set logo_url = 'https://evil.example/storage/v1/object/public/agency-logos/%s/logo-1b.png?x=1' where id = %L$q$,
                                current_setting('t.a'), current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza parámetros de consulta');
select pg_temp.falla_con(format($q$update agencies set logo_url = %L where id = %L$q$,
                                current_setting('t.base') || current_setting('t.b') || '/logo-b.png', current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza un logo de la carpeta de otra agencia');
select pg_temp.falla_con(format($q$update agencies set logo_url = %L where id = %L$q$,
                                replace(current_setting('t.base'), 'agency-logos', 'plan-photos') || current_setting('t.a') || '/foto.png',
                                current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza un objeto de otro bucket');
select pg_temp.falla_con(format($q$update agencies set logo_url = %L where id = %L$q$,
                                current_setting('t.base') || current_setting('t.a') || '/no-existe.png', current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza un objeto que no existe en el bucket');
select pg_temp.falla_con(format($q$update agencies set logo_url = %L where id = %L$q$,
                                current_setting('t.base') || current_setting('t.a') || '/../' || current_setting('t.b') || '/logo-b.png',
                                current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza rutas con ..');
select pg_temp.falla_con(format($q$update agencies set logo_url = 'javascript:alert(1)' where id = %L$q$, current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'logo_url rechaza esquemas que no son http(s)');
select pg_temp.ok((select logo_url = current_setting('t.base') || current_setting('t.a') || '/logo-1b.png'
                     from agencies where id = current_setting('t.a')::uuid),
                  'los rechazos no cambian el logo_url guardado');
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = null where id = %L$q$, current_setting('t.a'))) = 1,
                  'logo_url acepta null (quitar el logo)');
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = %L where id = %L$q$,
                                       current_setting('t.base') || current_setting('t.a') || '/logo-1b.png', current_setting('t.a'))) = 1,
                  'logo_url vuelve a aceptar la URL válida');
-- La otra agencia no puede tocar la fila de A (RLS) ni apuntarla a su carpeta.
reset role;
select pg_temp.como('graffiti@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = null where id = %L$q$, current_setting('t.a'))) = 0,
                  'otra agencia no edita el logo_url de A (0 filas)');
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = %L where id = %L$q$,
                                       current_setting('t.base') || current_setting('t.b') || '/logo-b.png', current_setting('t.b'))) = 1,
                  'cada agencia fija el logo_url de su propia carpeta');
reset role;

-- 6. Registrar una agencia con un logo_url externo tampoco vale ---------------------------------------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con(format($q$insert into agencies (owner_user_id, nombre, numero_rnt, matricula_camara_comercio, logo_url)
                                  values (auth.uid(), 'T10 Nueva', '90100001', '123456', 'https://evil.example/logo.png')$q$),
                         'LOGO_URL_INVALIDO', 'al registrar una agencia no se acepta un logo_url externo');
reset role;

-- 7. PRESERVE: lo demás de agencies sigue igual -------------------------------------------------------
-- Una agencia con un logo_url anterior (fuera del bucket) edita otros campos sin que el guardia estorbe.
select set_config('request.jwt.claim.sub', '', false);
update agencies set logo_url = 'https://logos.test/heredado.png' where id = current_setting('t.a')::uuid;
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set descripcion = 'Nueva descripción T10', telefono = '3009998877' where id = %L$q$,
                                       current_setting('t.a'))) = 1,
                  'la dueña edita descripción y teléfono aunque tenga un logo_url heredado');
select pg_temp.ok((select descripcion = 'Nueva descripción T10' and telefono = '3009998877'
                          and logo_url = 'https://logos.test/heredado.png'
                     from agencies where id = current_setting('t.a')::uuid),
                  'los demás campos cambian y el logo_url heredado queda como estaba');
select pg_temp.ok(pg_temp.filas(format($q$update agencies set comision_pct = 1, estado_verificacion = 'rechazado' where id = %L$q$,
                                       current_setting('t.a'))) = 1
                  and (select comision_pct <> 1 and estado_verificacion = 'verificado' from agencies where id = current_setting('t.a')::uuid),
                  'PRESERVE: la dueña sigue sin poder cambiar su comisión ni su verificación');
reset role;
-- El admin verifica/actualiza vigencia sin tocar el logo.
select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set rnt_vigente_hasta = current_date + 200 where id = %L$q$,
                                       current_setting('t.a'))) = 1,
                  'PRESERVE: el admin actualiza la vigencia del RNT sin que el logo_url estorbe');
select pg_temp.falla_con(format($q$update agencies set logo_url = 'https://evil.example/x.png' where id = %L$q$, current_setting('t.a')),
                         'LOGO_URL_INVALIDO', 'tampoco el admin fija un logo_url externo');
reset role;
-- Sin sesión de usuario (service_role / mantenimiento) no hay guardia, como en los demás triggers.
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok(pg_temp.filas(format($q$update agencies set logo_url = 'https://logos.test/mantenimiento.png' where id = %L$q$,
                                       current_setting('t.a'))) = 1,
                  'sin auth.uid() (mantenimiento) el guardia no interviene');

\echo 'OK  0010_logos_agencia'
