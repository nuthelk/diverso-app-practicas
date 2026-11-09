-- Pruebas de 0017: la dueña edita los datos de contacto de SU agencia desde el perfil del panel, sin migración nueva.
-- Lo que lo permite es la política agencies_update_own (0001) y lo que lo limita son los triggers de 0002 y 0004:
--   * la dueña actualiza nombre, descripcion, ciudad, telefono, email y whatsapp de su agencia y la verificación sigue igual;
--   * la dueña de otra agencia (y un viajero) no la actualiza: RLS la oculta (0 filas, sin error);
--   * si en el mismo UPDATE intenta fijar estado, comisión, vigencia, sello o anticipo, esos valores se revierten en silencio.
-- Usa dos agencias que ya existen en los datos de la BD local (no crea fixtures). Uso (sobre la BD local ya migrada;
-- NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0017_editar_datos_agencia.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
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
-- Filas que afectó una sentencia (RLS oculta las ajenas: 0 filas, sin error).
create or replace function pg_temp.filas(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
-- Todo lo que protegen los triggers (y el RNT/matrícula, que re-verifican al cambiar), en una sola cadena para comparar.
create or replace function pg_temp.protegido(p_id uuid) returns text language sql as $$
  select concat_ws('|', estado_verificacion, comision_pct, rnt_vigente_hasta, verificado_at, verificado_por,
                   motivo_rechazo, numero_rnt, matricula_camara_comercio, anticipo_bloqueado, logo_url)
    from public.agencies where id = p_id;
$$;
do $$ begin execute format('grant usage on schema %I to authenticated, anon, service_role', pg_my_temp_schema()::regnamespace); end $$;

-- Agencias de prueba: A = EcoAndes, B = Graffiti (dueñas reales de la BD local) ------------------------
select set_config('t.a', (select a.id::text from agencies a join auth.users u on u.id = a.owner_user_id
                           where u.email = 'ecoandes@demo.com'), false);
select set_config('t.b', (select a.id::text from agencies a join auth.users u on u.id = a.owner_user_id
                           where u.email = 'graffiti@demo.com'), false);
select set_config('t.a_protegido', pg_temp.protegido(current_setting('t.a')::uuid), false);
select set_config('t.b_nombre', (select nombre from agencies where id = current_setting('t.b')::uuid), false);
select pg_temp.ok((select estado_verificacion = 'verificado' from agencies where id = current_setting('t.a')::uuid),
                  'punto de partida: la agencia A está verificada');

-- 1. La dueña edita los seis datos de contacto de su agencia ---------------------------------------------
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies
                                          set nombre = 'T17 Eco Andes', descripcion = 'Descripción T17', ciudad = 'Bogotá',
                                              telefono = '3101112233', email = 't17@ecoandes.co', whatsapp = '+573101112233'
                                        where id = %L$q$, current_setting('t.a'))) = 1,
                  'la dueña actualiza nombre, descripción, ciudad, teléfono, correo y WhatsApp de su agencia');
select pg_temp.ok((select nombre = 'T17 Eco Andes' and descripcion = 'Descripción T17' and ciudad = 'Bogotá'
                          and telefono = '3101112233' and email = 't17@ecoandes.co' and whatsapp = '+573101112233'
                     from agencies where id = current_setting('t.a')::uuid),
                  'los seis datos quedan guardados');
select pg_temp.ok(pg_temp.protegido(current_setting('t.a')::uuid) = current_setting('t.a_protegido'),
                  'la verificación, la comisión, la vigencia, el RNT, la matrícula y el logo siguen como estaban');
select pg_temp.ok((select estado_verificacion = 'verificado' from agencies where id = current_setting('t.a')::uuid),
                  'la agencia sigue verificada');
-- El WhatsApp es opcional: la app manda null cuando se deja vacío.
select pg_temp.ok(pg_temp.filas(format($q$update agencies set whatsapp = null where id = %L$q$, current_setting('t.a'))) = 1,
                  'la dueña deja el WhatsApp vacío (null)');
select pg_temp.ok((select whatsapp is null from agencies where id = current_setting('t.a')::uuid),
                  'el WhatsApp queda en null');
reset role;

-- 2. Otra agencia y un viajero no la actualizan (RLS: 0 filas, sin error) --------------------------------
select pg_temp.como('graffiti@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set nombre = 'Intruso', ciudad = 'Cali', email = 'x@y.co'
                                        where id = %L$q$, current_setting('t.a'))) = 0,
                  'la dueña de otra agencia no actualiza la agencia A (0 filas)');
reset role;
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies set nombre = 'Intruso' where id = %L$q$, current_setting('t.a'))) = 0,
                  'un viajero no actualiza una agencia (0 filas)');
reset role;
select pg_temp.ok((select nombre = 'T17 Eco Andes' and ciudad = 'Bogotá' and email = 't17@ecoandes.co'
                     from agencies where id = current_setting('t.a')::uuid),
                  'la agencia A conserva sus datos tras los intentos ajenos');
select pg_temp.ok((select nombre = current_setting('t.b_nombre') from agencies where id = current_setting('t.b')::uuid),
                  'y la agencia B no cambió');

-- 3. En el mismo UPDATE no puede fijar lo protegido: se revierte en silencio -----------------------------
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select pg_temp.ok(pg_temp.filas(format($q$update agencies
                                          set nombre = 'T17 Otro nombre', estado_verificacion = 'rechazado', comision_pct = 1,
                                              rnt_vigente_hasta = current_date + 900, verificado_at = null,
                                              motivo_rechazo = 'inventado', anticipo_bloqueado = true
                                        where id = %L$q$, current_setting('t.a'))) = 1,
                  'un UPDATE con datos de contacto y campos protegidos se aplica sin error');
select pg_temp.ok((select nombre = 'T17 Otro nombre' from agencies where id = current_setting('t.a')::uuid),
                  'el dato de contacto del mismo UPDATE sí cambia');
select pg_temp.ok(pg_temp.protegido(current_setting('t.a')::uuid) = current_setting('t.a_protegido'),
                  'estado, comisión, vigencia, sello, motivo y anticipo vuelven a sus valores anteriores');
select pg_temp.ok((select estado_verificacion = 'verificado' and comision_pct <> 1
                     from agencies where id = current_setting('t.a')::uuid),
                  'sigue verificada y con su comisión');
reset role;

rollback;
\echo 'OK  0017_editar_datos_agencia'
