-- Pruebas de aislamiento entre viajeros (RLS) y de consentimientos, sin migración nueva. Las pantallas
-- /resena/:bookingId y /reservas/:bookingId cargan por id desde la app, así que lo que impide ver o reseñar
-- la reserva de otro viajero es la base de datos:
--   * un viajero ve su reserva, pero no la de otro viajero ni sus pagos;
--   * no puede reseñar una reserva ajena;
--   * los consentimientos solo se registran con registrar_consentimiento(), y con la versión vigente.
-- Usa dos viajeros que ya tienen reservas en los datos de la BD local (no crea fixtures). Uso (sobre la BD
-- local ya migrada; NO requiere db reset):
--   (echo "begin;"; cat supabase/tests/0014_rls_resena_ajena.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.como_id(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
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

-- Dos viajeros distintos con reservas (la más antigua de cada uno): A y B, en orden de id.
select set_config('test.a', v.viajero_id::text, false), set_config('test.a_reserva', v.booking_id::text, false)
  from (select b.viajero_id, (array_agg(b.id order by b.created_at))[1] as booking_id
          from public.bookings b join public.profiles p on p.id = b.viajero_id and p.rol = 'viajero'
         group by b.viajero_id order by b.viajero_id limit 1) v;
select set_config('test.b', v.viajero_id::text, false), set_config('test.b_reserva', v.booking_id::text, false)
  from (select b.viajero_id, (array_agg(b.id order by b.created_at))[1] as booking_id
          from public.bookings b join public.profiles p on p.id = b.viajero_id and p.rol = 'viajero'
         group by b.viajero_id order by b.viajero_id offset 1 limit 1) v;
select pg_temp.ok(current_setting('test.a', true) is not null and current_setting('test.b', true) is not null
                  and current_setting('test.a') <> current_setting('test.b'),
                  'hay dos viajeros distintos con reservas para probar');
select pg_temp.ok((select count(*) from public.payments where booking_id = current_setting('test.b_reserva')::uuid) > 0,
                  'la reserva de B tiene pagos (así «0 visibles» significa algo)');

-- 1. Lo que ve A ------------------------------------------------------------------------------------------------
select pg_temp.como_id(current_setting('test.a')::uuid);
set local role authenticated;
select pg_temp.ok((select count(*) from public.bookings where id = current_setting('test.a_reserva')::uuid) = 1,
                  'A ve su propia reserva');
select pg_temp.ok((select count(*) from public.bookings where id = current_setting('test.b_reserva')::uuid) = 0,
                  'A no ve la reserva de B');
select pg_temp.ok((select count(*) from public.payments where booking_id = current_setting('test.b_reserva')::uuid) = 0,
                  'A no ve los pagos de la reserva de B');
reset role;

-- 2. A no puede reseñar la reserva de B ---------------------------------------------------------------------------
select pg_temp.como_id(current_setting('test.a')::uuid);
set local role authenticated;
select pg_temp.falla_con(
  format($q$insert into public.reviews (booking_id, calificacion) values (%L, 5)$q$, current_setting('test.b_reserva')),
  'row-level security', 'A no puede reseñar una reserva de B');
reset role;
select pg_temp.ok((select count(*) from public.reviews where booking_id = current_setting('test.b_reserva')::uuid
                      and viajero_id = current_setting('test.a')::uuid) = 0,
                  'el rechazo no deja ninguna reseña de A sobre la reserva de B');

-- 3. Los consentimientos solo entran por registrar_consentimiento() y con la versión vigente -------------------------
select pg_temp.como_id(current_setting('test.a')::uuid);
set local role authenticated;
select pg_temp.falla_con(
  format($q$insert into public.consents (user_id, tipo, version) values (%L, 'tratamiento_datos', %L)$q$,
         current_setting('test.a'), public.version_documentos_legales()),
  'row-level security', 'A no puede insertar directo en consents');
select pg_temp.falla_con($q$select public.registrar_consentimiento('tratamiento_datos', 'v0-vieja', 'app')$q$,
                         'VERSION_DESACTUALIZADA', 'una versión antigua del documento se rechaza');
select pg_temp.ok(public.consentimientos_pendientes() is not null,
                  'consentimientos_pendientes() responde para el viajero autenticado');
reset role;

rollback;
