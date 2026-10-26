-- =====================================================================
-- Diverso App — 0011: búsqueda del catálogo sin tildes ni mayúsculas
-- =====================================================================
-- El buscador del viajero comparaba `titulo`, `destino` y `resumen` con `ilike` sobre el texto
-- crudo: "guatape" no encontraba "Guatapé" ni "cafe" encontraba "café".
--
-- Cambios:
--   1. Extensión `unaccent` (en el esquema `extensions`, donde Supabase pone las extensiones).
--   2. `public.f_unaccent(text)`: envoltorio IMMUTABLE. `unaccent(text)` es STABLE porque
--      resuelve el diccionario por el search_path; con el diccionario fijado por nombre
--      completo el resultado es determinista y se puede usar en una columna generada.
--   3. `plans.busqueda`: columna generada almacenada = minúsculas + sin tildes de
--      titulo, destino y resumen. La app normaliza el texto del viajero igual
--      (`normalizarBusqueda` en diverso_core) y filtra con un solo `ilike('busqueda', ...)`.
-- Sin índice a propósito: `ilike '%x%'` no usa btree y un índice trigram (pg_trgm) no se
-- justifica para un catálogo de este tamaño (la consulta ya limita a 60 filas).
-- Se vuelve a calcular sola cuando cambian esas columnas; no hay que migrar datos.
-- =====================================================================

create extension if not exists unaccent with schema extensions;

create or replace function public.f_unaccent(p_texto text)
returns text
language sql
immutable
parallel safe
strict
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, p_texto) $$;

alter table public.plans
  add column busqueda text generated always as (
    lower(public.f_unaccent(coalesce(titulo, '') || ' ' || coalesce(destino, '') || ' ' || coalesce(resumen, '')))
  ) stored;

comment on column public.plans.busqueda is
  'Texto de búsqueda (titulo + destino + resumen) en minúsculas y sin tildes; generado, no se escribe.';
