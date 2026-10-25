-- Pruebas de la migración 0002 (verificación de agencias y consentimientos).
-- Uso: supabase db reset  →  psql "postgresql://postgres:postgres@127.0.0.1:54332/postgres" -f supabase/tests/0002_verificacion_cumplimiento.sql
-- Modifica datos demo: al terminar, vuelve a ejecutar supabase db reset.
\set ON_ERROR_STOP 1
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
do $$ begin execute format('grant usage on schema %I to authenticated', pg_my_temp_schema()::regnamespace); end $$;

-- 1. Viajero: solo ve agencias habilitadas -------------------------------
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok((select count(*) from agencies) = 11, 'viajero ve 11 agencias habilitadas');
select pg_temp.ok(not exists (select 1 from agencies where estado_verificacion = 'pendiente'),
                  'viajero no ve la agencia pendiente');
select pg_temp.ok((select count(*) from plans) = 29, 'viajero ve 29 planes publicados');
reset role;

-- 2. Dueño no se autoverifica ni toca la vigencia -------------------------
select pg_temp.como('patrimonio@demo.com');
set role authenticated;
update agencies set estado_verificacion = 'verificado', rnt_vigente_hasta = '2030-01-01',
                    comision_pct = 1 where owner_user_id = auth.uid();
reset role;
select pg_temp.ok((select estado_verificacion = 'pendiente' and rnt_vigente_hasta is null and comision_pct = 12
                     from agencies where nombre = 'Pueblos Patrimonio Travel'),
                  'agencia pendiente no puede autoverificarse ni cambiar vigencia/comisión');

-- 3. Cambiar RNT obliga a re-verificar y retira del catálogo -------------
select pg_temp.como('graffiti@demo.com');
set role authenticated;
update agencies set numero_rnt = '12345' where owner_user_id = auth.uid();
select pg_temp.ok((select estado_verificacion = 'pendiente' and rnt_vigente_hasta is null
                     from agencies where owner_user_id = auth.uid()),
                  'cambiar RNT devuelve la agencia a pendiente');
select pg_temp.ok((select count(*) from plans where agency_id = (select id from agencies where owner_user_id = auth.uid())) > 0,
                  'la agencia sigue viendo sus propios planes');
reset role;
select pg_temp.ok(exists (select 1 from agency_verification_log l join agencies a on a.id = l.agency_id
                           where a.nombre = 'Comuna 13 Graffiti Tours' and l.accion = 'reverificacion_requerida'),
                  'queda registro de re-verificación en el historial');
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.ok(not exists (select 1 from plans p join agencies a on a.id = p.agency_id
                               where a.nombre = 'Comuna 13 Graffiti Tours'),
                  'el viajero deja de ver los planes de la agencia en re-verificación');
reset role;
-- reserva directa por id de fecha (sin pasar por el catálogo)
select set_config('t.fecha_graffiti', (select pd.id::text from plan_dates pd join plans p on p.id = pd.plan_id
   join agencies a on a.id = p.agency_id where a.nombre = 'Comuna 13 Graffiti Tours'
   and pd.fecha > current_date and pd.cupo_disponible > 0 limit 1), false);
set role authenticated;
select pg_temp.falla_con(format('select create_booking(%L, 1)', current_setting('t.fecha_graffiti')),
                         'AGENCIA_NO_HABILITADA', 'no se puede reservar con una agencia no habilitada');
reset role;

-- 4. Admin: verificar exige vigencia futura y registra quién ------------
select pg_temp.como('admin@demo.com');
set role authenticated;
select pg_temp.falla_con($$update agencies set estado_verificacion = 'verificado'
                           where nombre = 'Comuna 13 Graffiti Tours'$$,
                         'VIGENCIA_RNT_REQUERIDA', 'verificar sin vigencia falla');
select pg_temp.falla_con($$update agencies set estado_verificacion = 'verificado', rnt_vigente_hasta = current_date - 1
                           where nombre = 'Comuna 13 Graffiti Tours'$$,
                         'VIGENCIA_RNT_VENCIDA', 'verificar con vigencia vencida falla');
update agencies set estado_verificacion = 'verificado', rnt_vigente_hasta = current_date + 200
 where nombre = 'Comuna 13 Graffiti Tours';
select pg_temp.ok((select verificado_por = auth.uid() and verificado_at is not null
                     from agencies where nombre = 'Comuna 13 Graffiti Tours'),
                  'la verificación registra fecha y administrador');
select pg_temp.falla_con($$update agencies set estado_verificacion = 'rechazado'
                           where nombre = 'Pueblos Patrimonio Travel'$$,
                         'MOTIVO_RECHAZO_REQUERIDO', 'rechazar sin motivo falla');
update agencies set estado_verificacion = 'rechazado', motivo_rechazo = 'RNT no coincide con el registro del MinCIT'
 where nombre = 'Pueblos Patrimonio Travel';
select pg_temp.ok((select count(*) from agency_verification_log where accion = 'rechazada') = 1,
                  'el rechazo queda en el historial con motivo');
reset role;

-- 5. Vencimiento del RNT bloquea venta y publicación ---------------------
alter table agencies disable trigger agencies_guard_verification;
update agencies set rnt_vigente_hasta = current_date - 1 where nombre = 'EcoAndes Viajes';
alter table agencies enable trigger agencies_guard_verification;
select set_config('t.fecha_eco', (select pd.id::text from plan_dates pd join plans p on p.id = pd.plan_id
   join agencies a on a.id = p.agency_id where a.nombre = 'EcoAndes Viajes'
   and pd.fecha > current_date and pd.cupo_disponible > 0 limit 1), false);
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con(format('select create_booking(%L, 1)', current_setting('t.fecha_eco')),
                         'AGENCIA_NO_HABILITADA', 'RNT vencido bloquea la reserva');
reset role;
select pg_temp.como('ecoandes@demo.com');
set role authenticated;
select set_config('t.plan_eco', (select id::text from plans
   where agency_id = (select id from agencies where owner_user_id = auth.uid()) limit 1), false);
update plans set estado = 'borrador' where id = current_setting('t.plan_eco')::uuid;
select pg_temp.falla_con(format($$update plans set estado = 'publicado' where id = %L$$, current_setting('t.plan_eco')),
                         'RNT_VENCIDO', 'RNT vencido impide publicar') ;
reset role;

-- 6. Reserva: fecha pasada y sobreventa ---------------------------------
select set_config('t.fecha_pasada', (select pd.id::text from plan_dates pd join plans p on p.id = pd.plan_id
   where p.estado = 'publicado' and public.agencia_habilitada(p.agency_id) and pd.fecha < current_date limit 1), false);
select pg_temp.como('viajero@demo.com');
set role authenticated;
select pg_temp.falla_con(format('select create_booking(%L, 1)', current_setting('t.fecha_pasada')),
                         'FECHA_PASADA', 'no se reserva una fecha pasada');
reset role;
select set_config('t.fecha_ok', (select pd.id::text from plan_dates pd join plans p on p.id = pd.plan_id
   where p.estado = 'publicado' and public.agencia_habilitada(p.agency_id) and pd.fecha > current_date limit 1), false);
update plan_dates set cupo_disponible = 1 where id = current_setting('t.fecha_ok')::uuid;
set role authenticated;
select create_booking(current_setting('t.fecha_ok')::uuid, 1);
select pg_temp.falla_con(format('select create_booking(%L, 1)', current_setting('t.fecha_ok')),
                         'SIN_CUPO', 'el último cupo no se vende dos veces');
reset role;

-- 7. Registro: nadie se hace admin; consentimiento queda como evidencia --
-- auth.users.id no tiene valor por defecto en las versiones recientes de Auth.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values (gen_random_uuid(), 'atacante@x.com', '{"nombre":"X","rol":"admin"}', '{}'),
       (gen_random_uuid(), 'nuevo@x.com', '{"nombre":"Nuevo","rol":"viajero","consentimiento_version":"v1-2026-10"}', '{}'),
       (gen_random_uuid(), 'sinconsent@x.com', '{"nombre":"Sin","rol":"viajero"}', '{}');
select pg_temp.ok((select rol = 'viajero' from profiles p join auth.users u on u.id = p.id
                    where u.email = 'atacante@x.com'),
                  'el rol admin no se puede pedir desde los metadatos del cliente');
select pg_temp.ok((select count(*) from consents c join auth.users u on u.id = c.user_id
                    where u.email = 'nuevo@x.com') = 2,
                  'el registro con aceptación guarda 2 consentimientos');
select pg_temp.como('nuevo@x.com');
set role authenticated;
select pg_temp.ok(cardinality(consentimientos_pendientes()) = 0, 'usuario con aceptación no tiene pendientes');
reset role;
select pg_temp.como('sinconsent@x.com');
set role authenticated;
select pg_temp.ok(cardinality(consentimientos_pendientes()) = 2, 'usuario sin aceptación tiene 2 pendientes');
select pg_temp.falla_con($$select registrar_consentimiento('tratamiento_datos', 'v0')$$,
                         'VERSION_DESACTUALIZADA', 'no se acepta una versión vieja');
select registrar_consentimiento('tratamiento_datos', version_documentos_legales());
select registrar_consentimiento('terminos_viajero', version_documentos_legales());
select pg_temp.ok(cardinality(consentimientos_pendientes()) = 0, 'tras aceptar no quedan pendientes');
select pg_temp.falla_con($$insert into consents (user_id, tipo, version) values (auth.uid(), 'terminos_agencia', 'v1-2026-10')$$,
                         'row-level security', 'no se insertan consentimientos directamente');
reset role;

-- 8. Formato de RNT en registros nuevos ----------------------------------
select pg_temp.falla_con($$insert into agencies (nombre, numero_rnt, matricula_camara_comercio)
                           values ('Mala', 'ABC', '1234')$$,
                         'agencies_rnt_formato', 'RNT con letras se rechaza');
select 'TODAS LAS PRUEBAS PASARON' as resultado;
