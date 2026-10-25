-- Pruebas de la migración 0006 (notas de la política de cancelación): ninguna frase de un plan se pierde al
-- regenerar el texto canónico; las frases que no son política viajan en plans.politica_notas.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/0006_politica_notas.sql
-- Todo corre dentro de una transacción que termina en ROLLBACK.
-- Los textos con notas de la sección 1 son LOS MISMOS vectores que apps/panel_svelte/src/lib/politica.test.ts
-- («vectores con notas compartidos con la BD»): SQL y TypeScript deben producir exactamente las mismas cadenas.
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
do $$ begin execute format('grant usage on schema %I to authenticated, anon, service_role', pg_my_temp_schema()::regnamespace); end $$;

-- 1. Texto con notas: mismos vectores que el panel (politica.ts) -------------------------------------
create or replace function pg_temp.vector(p_f int, p_p int, p_x int, p_notas text, p_esperado text) returns void language plpgsql as $$
begin
  perform pg_temp.ok(public.texto_politica_con_notas(p_f, p_p, p_x, p_notas) = p_esperado,
                     format('texto_politica_con_notas(%s, %s, %s, %L) = «%s»', p_f, coalesce(p_p::text, 'null'), coalesce(p_x::text, 'null'), p_notas, p_esperado));
end $$;
select pg_temp.vector(48, null, null, '', 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.');
select pg_temp.vector(48, null, null, null, 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.');
select pg_temp.vector(24, null, null, 'Reprogramación gratuita si el clima no permite volar.', 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita si el clima no permite volar.');
select pg_temp.vector(48, 24, 50, 'Avisar restricciones alimentarias.', 'Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50 %. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.');
select pg_temp.vector(168, 0, 50, 'Requiere condición física media.', 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %. Requiere condición física media.');
select pg_temp.vector(72, null, null, E'  Requiere   condición\n física media.  ', 'Cancelación gratuita hasta 72 horas antes. Menos de 72 horas: sin reembolso. Requiere condición física media.');
select pg_temp.vector(12, null, null, E' \t\n ', 'Cancelación gratuita hasta 12 horas antes. Menos de 12 horas: sin reembolso.');
select pg_temp.vector(24, null, null, 'Nota A. Nota B.', 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Nota A. Nota B.');
-- Sin notas es exactamente texto_politica (0005): nada cambia para los planes que no tienen notas.
select pg_temp.ok(public.texto_politica_con_notas(48, 24, 50, '') = public.texto_politica(48, 24, 50),
                  'sin notas, el texto completo es el texto canónico de 0005');

-- 2. Lectura de un texto: números Y notas (nunca se descarta una frase que no es política) -----------
create or replace function pg_temp.lee(p_texto text, p_g int, p_p int, p_x int, p_notas text) returns void language plpgsql as $$
declare r record;
begin
  select * into r from public.politica_desde_texto(p_texto);
  perform pg_temp.ok((r.gratuita, r.parcial_h, r.parcial_pct, r.notas) is not distinct from (p_g, p_p, p_x, p_notas),
                     format('politica_desde_texto(«%s») = (%s, %s, %s, «%s»)', p_texto, coalesce(p_g::text, 'null'),
                            coalesce(p_p::text, 'null'), coalesce(p_x::text, 'null'), p_notas));
end $$;
select pg_temp.lee('Reprogramación gratuita si el clima no permite volar. Cancelación gratuita hasta 24 horas antes.', 24, null, null, 'Reprogramación gratuita si el clima no permite volar.');
select pg_temp.lee('Cancelación gratuita hasta 72 horas antes. Requiere condición física media.', 72, null, null, 'Requiere condición física media.');
select pg_temp.lee('Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.', 24, null, null, 'Avisar restricciones alimentarias.');
select pg_temp.lee('Nota A. Cancelación gratuita hasta 12 horas antes. Nota B.', 12, null, null, 'Nota A. Nota B.');
-- Los textos de política de legado se siguen leyendo sin notas
select pg_temp.lee('Cancelación gratuita hasta 12 horas antes.', 12, null, null, '');
select pg_temp.lee('Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%.', 168, 0, 50, '');
select pg_temp.lee('Cancelación gratuita hasta 7 días antes. Entre 7 y 3 días: 50%. Menos de 72 horas: sin reembolso.', 168, 72, 50, '');
select pg_temp.lee('Cancelación gratuita hasta 48 horas antes. Entre 48 y 24 horas: reembolso del 50%. Menos de 24 horas: sin reembolso.', 48, 24, 50, '');
select pg_temp.lee('Cancelación gratuita hasta 5 días antes. Menos de 5 días: 50%.', 120, 0, 50, '');
-- Texto sin política reconocible: números nulos y TODO el texto pasa a notas
select pg_temp.lee('Política flexible, pregunta a la agencia', null, null, null, 'Política flexible, pregunta a la agencia');
-- Política incoherente: sus frases de política se ignoran (mandan los números), lo demás se conserva
select pg_temp.lee('Cancelación gratuita hasta 24 horas antes. Entre 24 y 48 horas: reembolso del 50%. Nota.', null, null, null, 'Nota.');
select pg_temp.lee('', null, null, null, '');
-- Ida y vuelta: leer(texto_politica_con_notas(n, notas)) = (n, notas)
select pg_temp.ok((select bool_and((s.g, s.p, s.x, s.n) is not distinct from (r.gratuita, r.parcial_h, r.parcial_pct, r.notas))
                     from (values (48, null::int, null::int, ''), (24, null, null, 'Reprogramación gratuita por clima.'),
                                  (48, 24, 50, 'Avisar restricciones alimentarias.'), (168, 0, 50, 'Nota A. Nota B.')) as s(g, p, x, n),
                          lateral public.politica_desde_texto(public.texto_politica_con_notas(s.g, s.p, s.x, s.n)) r),
                  'leer(texto con notas) devuelve los mismos números y las mismas notas (ida y vuelta)');

-- 3. Disparador de plans ------------------------------------------------------------------------------
do $$
declare v_plan uuid; p public.plans; v_ag uuid := (select id from agencies where numero_rnt = '85421');
begin
  -- 3.1 el panel Svelte: números + notas → el texto se genera con las notas
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, horas_cancelacion_gratuita,
                     horas_reembolso_parcial, porcentaje_reembolso_parcial, politica_notas, politica_cancelacion)
  values (v_ag, 'TEST notas', 'd', 'aventura', 1000, 72, 24, 40, '  Avisar   restricciones alimentarias. ', 'texto cualquiera')
  returning id into v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = 'Avisar restricciones alimentarias.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.',
                     'INSERT con números y notas: las notas se normalizan y el texto las lleva al final');

  -- 3.2 cambian los números: las notas se conservan
  update plans set horas_cancelacion_gratuita = 96, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = 'Avisar restricciones alimentarias.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 96 horas antes. Menos de 96 horas: sin reembolso. Avisar restricciones alimentarias.',
                     'UPDATE de números: el texto se regenera y conserva las notas');

  -- 3.3 solo cambian las notas
  update plans set politica_notas = 'Requiere condición física media.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_cancelacion = 'Cancelación gratuita hasta 96 horas antes. Menos de 96 horas: sin reembolso. Requiere condición física media.',
                     'UPDATE solo de notas: el texto se regenera');
  update plans set politica_notas = '' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_cancelacion = 'Cancelación gratuita hasta 96 horas antes. Menos de 96 horas: sin reembolso.',
                     'vaciar las notas las quita del texto');
  update plans set politica_notas = 'Nota fija.' where id = v_plan;

  -- 3.4 el panel Flutter legado edita SOLO el texto: números leídos y frases extra a notas (nunca se pierden)
  update plans set politica_cancelacion = 'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) is not distinct from (24, null, null)
                     and p.politica_notas = 'Reprogramación gratuita por clima.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita por clima.',
                     'texto de legado con una frase extra: números leídos, frase en notas y texto canónico + notas');

  update plans set politica_cancelacion = 'Cancelación gratuita hasta 7 días antes. Menos de 7 días: 50%. Avisar restricciones alimentarias.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (168, 0, 50)
                     and p.politica_notas = 'Avisar restricciones alimentarias.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %. Avisar restricciones alimentarias.',
                     'texto de legado en días con 50 % y una nota');

  -- editar de nuevo el texto canónico completo no duplica ni pierde nada (idempotente)
  update plans set politica_cancelacion = p.politica_cancelacion where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = 'Avisar restricciones alimentarias.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 168 horas antes. Menos de 168 horas: reembolso del 50 %. Avisar restricciones alimentarias.',
                     'reescribir el texto canónico completo es idempotente');

  -- quitar la frase extra en el panel legado quita la nota (el texto manda cuando solo cambia el texto)
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = '' and p.horas_cancelacion_gratuita = 24
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso.',
                     'el panel legado puede quitar las notas editando el texto');

  -- 3.5 texto ilegible: los números no cambian y el texto completo se conserva como notas
  update plans set politica_cancelacion = 'Política flexible, pregunta a la agencia' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 24
                     and p.politica_notas = 'Política flexible, pregunta a la agencia'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Política flexible, pregunta a la agencia',
                     'texto sin política reconocible: números intactos y el texto pasa a notas (no se descarta)');

  -- 3.6 números y texto cambian a la vez: mandan los números (y las notas actuales se conservan)
  update plans set horas_cancelacion_gratuita = 36, politica_cancelacion = 'Cancelación gratuita hasta 10 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 36 and p.politica_notas = 'Política flexible, pregunta a la agencia',
                     'si cambian números y texto a la vez, mandan los números y se conservan las notas');

  -- 3.7 PRESERVE: editar otra columna no toca la política
  update plans set titulo = 'TEST notas 2', hora_salida = '07:15' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 36 and p.politica_notas = 'Política flexible, pregunta a la agencia',
                     'editar título u hora de salida no altera la política ni las notas');

  -- 3.8 INSERT solo con texto (seed, panel legado): números y notas leídos
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, politica_cancelacion)
  values (v_ag, 'TEST legado notas', 'd', 'aventura', 1000, 'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.')
  returning * into p;
  perform pg_temp.ok((p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) is not distinct from (24, null, null)
                     and p.politica_notas = 'Avisar restricciones alimentarias.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.',
                     'INSERT solo con texto de legado: números y notas leídos');
  insert into plans (agency_id, titulo, destino, categoria, precio_cop)
  values (v_ag, 'TEST sin política', 'd', 'aventura', 1000) returning * into p;
  perform pg_temp.ok(p.politica_notas = '' and p.politica_cancelacion = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso.',
                     'PRESERVE: INSERT sin política conserva los valores por omisión y no tiene notas');
end $$;

-- 4. Las frases perdidas en 0005 se restauran EXACTAMENTE (seed.sql, por plan) -----------------------
create or replace function pg_temp.plan_con_notas(p_rnt text, p_titulo text, p_gratuita int, p_notas text, p_texto text) returns void language plpgsql as $$
declare p public.plans;
begin
  select pl.* into p from plans pl join agencies a on a.id = pl.agency_id where a.numero_rnt = p_rnt and pl.titulo = p_titulo;
  perform pg_temp.ok(p.id is not null and p.horas_cancelacion_gratuita = p_gratuita and p.horas_reembolso_parcial is null
                     and p.politica_notas = p_notas and p.politica_cancelacion = p_texto,
                     format('plan «%s»: notas «%s» restauradas', p_titulo, p_notas));
end $$;
select pg_temp.plan_con_notas('85421', 'Parapente San Félix — vuelo de 15 minutos', 24, 'Reprogramación gratuita si el clima no permite volar.',
  'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita si el clima no permite volar.');
select pg_temp.plan_con_notas('44950', 'Espeleísmo en cuevas de Río Claro', 72, 'Requiere condición física media.',
  'Cancelación gratuita hasta 72 horas antes. Menos de 72 horas: sin reembolso. Requiere condición física media.');
select pg_temp.plan_con_notas('77849', 'Street food tour: sabores de la comuna', 24, 'Avisar restricciones alimentarias.',
  'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.');
select pg_temp.plan_con_notas('52263', 'Parapente premium 20 minutos + video', 24, 'Reprogramación gratuita por clima.',
  'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita por clima.');
select pg_temp.plan_con_notas('52263', 'Bautismo de vuelo — 10 minutos', 24, 'Reprogramación gratuita por clima.',
  'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Reprogramación gratuita por clima.');
select pg_temp.plan_con_notas('81025', 'Ruta gastronómica del sur', 24, 'Avisar restricciones alimentarias.',
  'Cancelación gratuita hasta 24 horas antes. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.');

select pg_temp.ok((select count(*) from plans where politica_notas <> '' and titulo not like 'TEST%') = 6,
                  'solo esos 6 planes del seed tienen notas');
select pg_temp.ok(not exists (select 1 from plans p
                               where p.politica_cancelacion is distinct from
                                     public.texto_politica_con_notas(p.horas_cancelacion_gratuita, p.horas_reembolso_parcial,
                                                                     p.porcentaje_reembolso_parcial, p.politica_notas)),
                  'TODOS los planes tienen el texto que generan sus números y sus notas');

-- Las reservas de esos planes: el snapshot lleva las notas solo donde era el texto canónico sin notas.
select pg_temp.ok(not exists (select 1 from bookings b join plan_dates pd on pd.id = b.plan_date_id join plans pl on pl.id = pd.plan_id
                               where pl.politica_notas <> '' and pl.titulo not like 'TEST%'
                                 and b.politica_texto = public.texto_politica(b.politica_horas_gratuita, b.politica_horas_parcial, b.politica_porcentaje_parcial)),
                  'ninguna reserva de un plan con notas conserva el texto canónico sin notas');
select pg_temp.ok(not exists (select 1 from bookings b join plan_dates pd on pd.id = b.plan_date_id join plans pl on pl.id = pd.plan_id
                               where pl.politica_notas <> '' and pl.titulo not like 'TEST%'
                                 and b.politica_texto <> public.texto_politica_con_notas(b.politica_horas_gratuita, b.politica_horas_parcial,
                                                                                         b.politica_porcentaje_parcial, pl.politica_notas)),
                  'las reservas de esos planes llevan el texto canónico de SUS números + las notas');
select pg_temp.ok(not exists (select 1 from bookings b join plan_dates pd on pd.id = b.plan_date_id join plans pl on pl.id = pd.plan_id
                               where pl.politica_notas = '' and pl.titulo not like 'TEST%'
                                 and b.politica_texto <> public.texto_politica(b.politica_horas_gratuita, b.politica_horas_parcial, b.politica_porcentaje_parcial)
                                 and b.politica_texto <> pl.politica_cancelacion),
                  'PRESERVE: las reservas de planes sin notas no se tocaron');

-- Una reserva nueva congela el texto CON notas
do $$
declare v_pd uuid; v_viajero uuid := (select id from auth.users where email = 'viajero@demo.com'); b public.bookings; v_pl uuid;
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado, politica_notas)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST snapshot notas', 'd', 'aventura', 1000, 'publicado', 'Avisar restricciones alimentarias.')
  returning id into v_pl;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible) values (v_pl, current_date + 30, 10, 10) returning id into v_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values ('T6-' || upper(substr(md5(random()::text), 1, 8)), v_pd, v_viajero, 1, 1000, 'pendiente_pago') returning * into b;
  perform pg_temp.ok(b.politica_texto = 'Cancelación gratuita hasta 48 horas antes. Menos de 48 horas: sin reembolso. Avisar restricciones alimentarias.',
                     'una reserva nueva congela el texto de la política con sus notas');
end $$;

-- 5. Permisos ------------------------------------------------------------------------------------------------
do $$
declare f text; r text;
begin
  foreach f in array array['public.texto_politica_con_notas(int,int,int,text)', 'public.normalizar_notas_politica(text)'] loop
    foreach r in array array['anon', 'authenticated'] loop
      if has_function_privilege(r, f, 'execute') then raise exception 'FALLA: % puede ejecutar %', r, f; end if;
    end loop;
    if exists (select 1 from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                where p.oid = f::regprocedure and a.grantee = 0) then
      raise exception 'FALLA: PUBLIC puede ejecutar %', f;
    end if;
    if not has_function_privilege('service_role', f, 'execute') then raise exception 'FALLA: service_role no ejecuta %', f; end if;
  end loop;
  raise notice 'OK  funciones nuevas: solo service_role';
end $$;
select pg_temp.ok(not has_function_privilege('authenticated', 'public.politica_desde_texto(text)', 'execute')
                  and not has_function_privilege('anon', 'public.politica_desde_texto(text)', 'execute'),
                  'politica_desde_texto (ahora con notas) sigue sin ser pública');

rollback;
