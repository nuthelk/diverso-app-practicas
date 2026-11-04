-- Pruebas de 0016: el nombre corto que ve la agencia nunca deja pasar un correo ni un teléfono.
-- El nombre lo escribe el viajero (o sale de la parte del correo antes de la @ cuando el registro no trae
-- nombre), así que una «palabra» puede ser un correo o un número. Uso (sobre la BD local ya migrada):
--   (echo "begin;"; cat supabase/tests/0016_nombre_corto_seguro.sql; echo "rollback;") | docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 -q
-- Todo corre dentro de una transacción que termina en ROLLBACK.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FALLA: %', p_msg; end if;
  raise notice 'OK  %', p_msg;
end $$;

-- 1. Correos y teléfonos nunca salen -------------------------------------------------------------
select pg_temp.ok(public.nombre_corto_viajero('laura.velez94@gmail.com') = 'Viajero',
                  'un correo como nombre no se muestra');
select pg_temp.ok(public.nombre_corto_viajero('3001234567') = 'Viajero', 'un teléfono como nombre no se muestra');
select pg_temp.ok(public.nombre_corto_viajero('nuthelkcd') = 'nuthelkcd',
                  'una palabra sin @ ni dígitos se muestra (la regla no adivina si viene de un correo)');
select pg_temp.ok(public.nombre_corto_viajero('Laura laura@x.com') = 'Laura', 'un correo dentro del nombre se omite');
select pg_temp.ok(public.nombre_corto_viajero('Laura (3001234567)') = 'Laura', 'un teléfono entre paréntesis se omite');
select pg_temp.ok(public.nombre_corto_viajero('Laura Vélez 3001234567') = 'Laura V.',
                  'un teléfono al final no se usa como apellido');

-- 2. Espacios raros no rompen el nombre ----------------------------------------------------------
select pg_temp.ok(public.nombre_corto_viajero('Laura Vélez' || chr(160)) = 'Laura V.'
                  and public.nombre_corto_viajero(chr(160) || 'Laura Vélez') = 'Laura V.',
                  'espacio duro al borde');
select pg_temp.ok(public.nombre_corto_viajero('Laura' || chr(8203) || ' Vélez') = 'Laura V.',
                  'espacio de ancho cero');
select pg_temp.ok(public.nombre_corto_viajero('Laura' || chr(11) || 'Vélez' || chr(12)) = 'Laura V.',
                  'tabulación vertical y salto de página');

-- 3. PRESERVE: lo que ya funcionaba sigue igual ---------------------------------------------------
select pg_temp.ok(public.nombre_corto_viajero('Laura Vélez') = 'Laura V.', 'dos palabras: «Laura V.»');
select pg_temp.ok(public.nombre_corto_viajero('Andrés Felipe Muñoz Gil') = 'Andrés G.', 'inicial del último apellido');
select pg_temp.ok(public.nombre_corto_viajero('Carolina') = 'Carolina', 'una sola palabra: solo esa palabra');
select pg_temp.ok(public.nombre_corto_viajero('  maría   del  carmen  ñandú ') = 'maría Ñ.', 'espacios de más y tildes');
select pg_temp.ok(public.nombre_corto_viajero('') = 'Viajero' and public.nombre_corto_viajero(null) = 'Viajero',
                  'vacío o nulo: «Viajero»');

-- 4. Sigue siendo interna --------------------------------------------------------------------------
select pg_temp.ok(not has_function_privilege('authenticated', 'public.nombre_corto_viajero(text)', 'execute')
                  and not has_function_privilege('anon', 'public.nombre_corto_viajero(text)', 'execute'),
                  'nadie fuera de las funciones del panel puede ejecutarla');

rollback;
