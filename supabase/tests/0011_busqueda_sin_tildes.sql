-- Pruebas de la migración 0011 (búsqueda del catálogo sin tildes ni mayúsculas).
-- `plans.busqueda` es una columna generada (minúsculas + unaccent de titulo, destino y resumen)
-- sobre la que la app filtra con un solo `ilike`; `f_unaccent` es el envoltorio IMMUTABLE que la
-- hace posible. La app normaliza el texto del viajero igual (`normalizarBusqueda`, diverso_core).
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   (echo "begin;"; cat supabase/tests/0011_busqueda_sin_tildes.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

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

-- f_unaccent ---------------------------------------------------------
select pg_temp.ok(public.f_unaccent('Guatapé') = 'Guatape', 'f_unaccent quita la tilde');
select pg_temp.ok(public.f_unaccent('Año café pingüino') = 'Ano cafe pinguino', 'f_unaccent quita eñes, tildes y diéresis');
select pg_temp.ok((select provolatile = 'i' from pg_proc where oid = 'public.f_unaccent(text)'::regprocedure),
                  'f_unaccent es IMMUTABLE');

-- La columna generada ---------------------------------------------------
select pg_temp.ok((select attgenerated = 's' from pg_attribute where attrelid = 'public.plans'::regclass and attname = 'busqueda'),
                  'plans.busqueda es una columna generada almacenada');
select pg_temp.ok((select count(*) = 0 from public.plans where busqueda is distinct from
                     lower(public.f_unaccent(coalesce(titulo, '') || ' ' || coalesce(destino, '') || ' ' || coalesce(resumen, '')))),
                  'busqueda coincide con titulo + destino + resumen de todos los planes');

-- Un plan de prueba, dentro de la transacción (agencia y datos mínimos del seed).
insert into public.plans (agency_id, titulo, destino, categoria, resumen, precio_cop)
select id, 'Café y Montaña', 'Guatapé', 'gastronomia', 'Año nuevo, (con) 100% sabor_', 100000
  from public.agencies limit 1;

select pg_temp.ok((select busqueda = 'cafe y montana guatape ano nuevo, (con) 100% sabor_'
                     from public.plans where titulo = 'Café y Montaña'),
                  'busqueda queda en minúsculas y sin tildes');
select pg_temp.ok((select count(*) = 1 from public.plans where busqueda ilike '%guatape%' and titulo = 'Café y Montaña'),
                  '«guatape» (sin tilde) encuentra el destino «Guatapé»');
select pg_temp.ok((select count(*) = 1 from public.plans where busqueda ilike '%cafe y%' and titulo = 'Café y Montaña'),
                  '«cafe» (sin tilde) encuentra «Café»');
select pg_temp.ok((select count(*) = 1 from public.plans where busqueda ilike '%ano nuevo, (con)%' and titulo = 'Café y Montaña'),
                  'comas y paréntesis se buscan como texto');

-- Se recalcula sola y no se escribe a mano.
update public.plans set destino = 'Jardín' where titulo = 'Café y Montaña';
select pg_temp.ok((select busqueda like 'cafe y montana jardin %' from public.plans where titulo = 'Café y Montaña'),
                  'busqueda se recalcula al cambiar el destino');
select pg_temp.falla_con($q$update public.plans set busqueda = 'x' where titulo = 'Café y Montaña'$q$,
                         'can only be updated to DEFAULT', 'no se puede escribir busqueda a mano');

\echo 'OK  0011_busqueda_sin_tildes'

rollback;
