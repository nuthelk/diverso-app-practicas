-- =====================================================================
-- 0016 — El nombre corto que ve la agencia nunca deja pasar un correo ni un teléfono
--
-- 0015 devolvía la palabra tal cual cuando el nombre tenía una sola: un viajero que escribió su correo o su
-- teléfono como nombre (el registro solo exige 2 caracteres, y sin nombre se usa la parte del correo antes de
-- la @) llegaba entero al panel de la agencia. Ahora:
--   * se separa por cualquier espacio (también el duro, los de ancho cero y los de Unicode);
--   * se descarta toda «palabra» con @ o con dígitos, y las que no tienen ninguna letra;
--   * con lo que queda: nada → «Viajero»; una palabra → esa; varias → primera + inicial de la última.
-- Firma, `immutable`, `search_path` y permisos iguales que en 0015 (nadie puede ejecutarla directamente).
-- =====================================================================

create or replace function public.nombre_corto_viajero(p_nombre text)
returns text
language sql immutable
set search_path = public
as $$
  select case cardinality(p)
           when 0 then 'Viajero'
           when 1 then p[1]
           else p[1] || ' ' || upper(substring(p[cardinality(p)] from '[[:alpha:]]')) || '.'
         end
    from (select array(
            select w
              from unnest(regexp_split_to_array(
                     coalesce(p_nombre, ''),
                     E'[\\s\\u00a0\\u1680\\u180e\\u2000-\\u200d\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]+'))
                   with ordinality as u(w, i)
             where w ~ '[[:alpha:]]' and w !~ '[@0-9]'
             order by i) as p) t;
$$;

revoke all on function public.nombre_corto_viajero(text) from public, anon, authenticated, service_role;
