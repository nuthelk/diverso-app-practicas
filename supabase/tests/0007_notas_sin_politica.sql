-- Pruebas de la migración 0007 (las notas de la política no pueden contener reglas de reembolso):
-- el disparador de plans rechaza con NOTAS_CON_POLITICA las notas cuya frase sea una regla de política
-- (reconocida por politica_desde_texto o con redacción libre), el texto de legado sigue leyéndose igual,
-- ningún plan existente queda rechazado y horas_antes se TRUNCA (no se redondea) a 2 decimales.
-- Uso (sobre la BD local ya migrada; NO requiere db reset ni deja datos):
--   docker exec -i supabase_db_diverso-app psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/0007_notas_sin_politica.sql
-- Todo corre dentro de una transacción que termina en ROLLBACK.
-- Los vectores de la sección 1 son LOS MISMOS que apps/panel_svelte/src/lib/politica.test.ts
-- («vectores de notas con política compartidos con la BD»): SQL y TypeScript deben decidir igual.
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

-- 1. Qué es una regla de política (vectores compartidos con el panel) -------------------------------------
create or replace function pg_temp.vector(p_notas text, p_regla boolean) returns void language plpgsql as $$
begin
  perform pg_temp.ok(public.notas_con_politica(p_notas) = p_regla,
                     format('notas_con_politica(«%s») = %s', p_notas, p_regla));
end $$;
-- Reglas que se rechazan: las frases que reconoce politica_desde_texto...
select pg_temp.vector('Cancelación gratuita hasta 1 hora antes.', true);
select pg_temp.vector('Cancelación gratuita hasta 3 días antes.', true);
select pg_temp.vector('Entre 48 y 24 horas: reembolso del 50 %.', true);
select pg_temp.vector('Entre 48 y 24 horas: 50%.', true);
select pg_temp.vector('Menos de 24 horas: sin reembolso.', true);
select pg_temp.vector('Menos de 24 horas: 50 %.', true);
select pg_temp.vector('Menos de 2 días: reembolso del 50 %.', true);
-- ...y la redacción libre de una regla de reembolso
select pg_temp.vector('Reembolso del 100 % hasta 1 hora antes.', true);
select pg_temp.vector('Sin reembolso a menos de 12 horas.', true);
select pg_temp.vector('REEMBOLSO COMPLETO SI CANCELAS.', true);
select pg_temp.vector('Política de reintegro flexible.', true);
select pg_temp.vector('No se aceptan devoluciones.', true);
select pg_temp.vector('Te devolvemos el dinero si cancelas.', true);
select pg_temp.vector('El dinero no se devuelve.', true);
select pg_temp.vector('Cancela gratis hasta 2 horas antes.', true);
select pg_temp.vector('La cancelación es totalmente gratuita hasta 5 horas antes.', true);
select pg_temp.vector('Cancelaciones con más de 6 horas de anticipación no tienen costo.', true);
select pg_temp.vector('Con 2 días de anticipación puedes cancelar sin costo.', true);
select pg_temp.vector('Cancelación sin penalización.', true);
select pg_temp.vector('Si cancelas con menos de 3h cobramos el 50 %.', true);
select pg_temp.vector('Requiere condición física media. Reembolso del 100 % hasta 1 hora antes.', true);
select pg_temp.vector('  Sin   reembolso  a menos de 12 horas.  ', true);
select pg_temp.vector(E'Sin\nreembolso a menos de 12 horas.', true);
select pg_temp.vector('Cancelacio' || chr(769) || 'n gratuita hasta 1 hora antes.', true);   -- «ó» descompuesta (NFD)
-- Lo que NO es política sigue siendo una nota válida
select pg_temp.vector('', false);
select pg_temp.vector('Reprogramación gratuita si el clima no permite volar.', false);
select pg_temp.vector('Reprogramación gratuita por clima.', false);
select pg_temp.vector('Requiere condición física media.', false);
select pg_temp.vector('Avisar restricciones alimentarias.', false);
select pg_temp.vector('Llevar documento de identidad. Incluye 3 horas de guía.', false);
select pg_temp.vector('Menos de 2 horas de caminata.', false);
select pg_temp.vector('Entre 2 y 3 horas de recorrido.', false);
select pg_temp.vector('Descuento del 10 % para grupos de 6 personas.', false);
select pg_temp.vector('Para cancelaciones escribe a la agencia.', false);
select pg_temp.vector('Si se cancela por clima, la reprogramación es gratis.', false);
select pg_temp.vector('Devolver el equipo al guía.', false);
select pg_temp.vector('Entrada sin costo para menores de 5 años.', false);
select pg_temp.ok(not public.notas_con_politica(null), 'notas nulas: no hay regla');

-- 2. Disparador de plans ------------------------------------------------------------------------------
do $$
declare
  v_plan uuid; p public.plans;
  v_ag uuid := (select id from agencies where numero_rnt = '85421');
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, horas_cancelacion_gratuita,
                     horas_reembolso_parcial, porcentaje_reembolso_parcial, politica_notas)
  values (v_ag, 'TEST notas sin política', 'd', 'aventura', 1000, 72, 24, 40, 'Avisar restricciones alimentarias.')
  returning id into v_plan;
  perform set_config('test.plan_notas', v_plan::text, false);

  -- 2.1 el ejemplo de la verificación: plan de 72 h con una nota que dice «gratuita hasta 1 hora antes»
  perform pg_temp.falla_con(format($q$update plans set politica_notas = 'Cancelación gratuita hasta 1 hora antes.' where id = %L$q$, v_plan),
                            'NOTAS_CON_POLITICA', 'UPDATE de notas con «Cancelación gratuita hasta 1 hora antes.» se rechaza');
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = 'Avisar restricciones alimentarias.'
                     and (p.horas_cancelacion_gratuita, p.horas_reembolso_parcial, p.porcentaje_reembolso_parcial) = (72, 24, 40)
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso. Avisar restricciones alimentarias.',
                     'el rechazo no cambia nada: notas, números y texto siguen igual');

  -- 2.2 redacción libre del reembolso, en INSERT y en UPDATE con números a la vez
  perform pg_temp.falla_con(format($q$insert into plans (agency_id, titulo, destino, categoria, precio_cop, politica_notas)
                                      values (%L, 'TEST notas malas', 'd', 'aventura', 1000, 'Reembolso del 100 %% hasta 1 hora antes.')$q$, v_ag),
                            'NOTAS_CON_POLITICA', 'INSERT con notas que son una regla de reembolso se rechaza');
  perform pg_temp.falla_con(format($q$update plans set horas_cancelacion_gratuita = 96, politica_notas = 'Sin reembolso a menos de 12 horas.' where id = %L$q$, v_plan),
                            'NOTAS_CON_POLITICA', 'UPDATE de números y notas con una regla en las notas se rechaza');
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 72, 'y tampoco se aplican los números de ese UPDATE');
  perform pg_temp.falla_con(format($q$update plans set politica_notas = 'Requiere condición física media. Entre 48 y 24 horas: 50%%.' where id = %L$q$, v_plan),
                            'NOTAS_CON_POLITICA', 'una regla escondida en la segunda frase también se rechaza');

  -- 2.3 una nota válida sigue pasando (y se normaliza como siempre)
  update plans set politica_notas = '  Requiere   condición física media. ' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_notas = 'Requiere condición física media.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Entre 72 y 24 horas: reembolso del 40 %. Menos de 24 horas: sin reembolso. Requiere condición física media.',
                     'PRESERVE: una nota que no es política se guarda normalizada y va al final del texto');
  update plans set horas_cancelacion_gratuita = 96, horas_reembolso_parcial = null, porcentaje_reembolso_parcial = null where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.politica_cancelacion = 'Cancelación gratuita hasta 96 horas antes. Menos de 96 horas: sin reembolso. Requiere condición física media.',
                     'PRESERVE: cambiar solo los números regenera el texto y conserva las notas');

  -- 2.4 panel Flutter legado (solo el texto): se lee igual que antes
  update plans set politica_cancelacion = 'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 24 and p.politica_notas = 'Reprogramación gratuita por clima.',
                     'PRESERVE legado: números leídos del texto y la frase que no es política pasa a notas');
  -- una frase de política que contradice el texto (reconocida por politica_desde_texto) sigue sin ir a notas:
  -- los números salen de la primera «gratuita hasta» y la segunda frase se ignora, como hoy
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Cancelación gratuita hasta 1 hora antes. Nota fija.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 72 and p.politica_notas = 'Nota fija.'
                     and p.politica_cancelacion = 'Cancelación gratuita hasta 72 horas antes. Menos de 72 horas: sin reembolso. Nota fija.',
                     'legado con una segunda regla que contradice: los números salen de la primera y la regla no se guarda como nota');
  update plans set politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Entre 24 y 48 horas: reembolso del 50%. Nota fija.' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 72 and p.politica_notas = 'Nota fija.',
                     'legado con una política incoherente: los números no cambian y la regla no se guarda como nota');
  -- redacción libre de una regla en el texto de legado: tampoco puede acabar en las notas
  perform pg_temp.falla_con(format($q$update plans set politica_cancelacion = 'Cancelación gratuita hasta 24 horas antes. Reembolso del 100 %% hasta 1 hora antes.' where id = %L$q$, v_plan),
                            'NOTAS_CON_POLITICA', 'legado: una regla de redacción libre no se guarda como nota');
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.horas_cancelacion_gratuita = 72 and p.politica_notas = 'Nota fija.', 'y el plan queda como estaba');

  -- 2.5 PRESERVE: editar otras columnas no revisa ni toca la política
  update plans set titulo = 'TEST notas sin política 2' where id = v_plan;
  select * into p from plans where id = v_plan;
  perform pg_temp.ok(p.titulo = 'TEST notas sin política 2' and p.politica_notas = 'Nota fija.', 'PRESERVE: editar el título no toca la política');
end $$;

-- 3. Ningún plan existente queda rechazado ---------------------------------------------------------------
select pg_temp.ok(not exists (select 1 from plans where public.notas_con_politica(politica_notas)),
                  'ningún plan (BD viva o seed nuevo) tiene hoy notas que sean una regla de política');
select pg_temp.ok((select count(*) from plans where politica_notas <> '') >= 6, 'los planes con notas siguen ahí (6 del seed)');
do $$
declare v_antes text; v_despues text;
begin
  select string_agg(id || politica_cancelacion || politica_notas, '|' order by id) into v_antes from plans;
  -- Reescribir las notas de TODOS los planes dispara el nuevo chequeo en cada uno
  update plans set politica_notas = politica_notas;
  -- Y el panel legado reescribiendo el texto tal cual está
  update plans set politica_cancelacion = politica_cancelacion;
  select string_agg(id || politica_cancelacion || politica_notas, '|' order by id) into v_despues from plans;
  perform pg_temp.ok(v_antes = v_despues, 'reescribir notas y texto de todos los planes no rechaza ni cambia ninguno');
end $$;

-- 4. horas_antes se trunca, no se redondea ------------------------------------------------------------------
create or replace function pg_temp.mk_reserva_en(p_resta interval) returns uuid language plpgsql as $$
declare v_plan uuid; v_pd uuid; v_b uuid;
begin
  insert into plans (agency_id, titulo, destino, categoria, precio_cop, estado)
  values ((select id from agencies where numero_rnt = '85421'), 'TEST horas', 'Guatapé', 'aventura', 100000, 'publicado')
  returning id into v_plan;
  insert into plan_dates (plan_id, fecha, cupo_total, cupo_disponible)
  values (v_plan, current_date + 30, 10, 8) returning id into v_pd;
  insert into bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado, salida_at)
  values ('T7-' || upper(substr(md5(random()::text), 1, 8)), v_pd,
          (select id from auth.users where email = 'viajero@demo.com'), 2, 200000, 'confirmada', now() + p_resta)
  returning id into v_b;
  insert into payments (booking_id, metodo, estado, monto, referencia, provider, simulated, provider_transaction_id)
  values (v_b, 'tarjeta', 'aprobado', 200000, 'P7-' || substr(md5(random()::text), 1, 10), 'wompi', false, 'tx7-' || v_b);
  return v_b;
end $$;
do $$
declare v_b uuid; r record; j json;
begin
  v_b := pg_temp.mk_reserva_en(interval '48 hours' - interval '10 seconds');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = 47.99 and r.porcentaje = 0 and not r.aplica,
                     '48 h − 10 s muestra 47.99 h (antes 48.00, junto a «menos de 48 h»); la decisión (plan de 48 h sin tramo parcial: sin reembolso) no cambia');
  v_b := pg_temp.mk_reserva_en(interval '24 hours' - interval '10 seconds');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = 23.99, '24 h − 10 s muestra 23.99 h');
  v_b := pg_temp.mk_reserva_en(interval '1 hour 59 minutes 59.9 seconds');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = 1.99, '1 h 59 min 59,9 s muestra 1.99 h (no 2.00)');
  v_b := pg_temp.mk_reserva_en(interval '48 hours');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = 48.00 and r.porcentaje = 100, 'PRESERVE: exactamente 48 h sigue mostrando 48 h');
  v_b := pg_temp.mk_reserva_en(interval '100.5 hours');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = 100.50, 'PRESERVE: una cifra que ya tiene 2 decimales o menos no cambia');
  v_b := pg_temp.mk_reserva_en(interval '-30 minutes');
  select * into r from public.reembolso_por_politica(v_b);
  perform pg_temp.ok(r.horas_antes = -0.50 and r.porcentaje = 0, 'PRESERVE: salida pasada: cifra negativa y sin reembolso');

  -- la misma cifra llega a la vista previa del dueño
  v_b := pg_temp.mk_reserva_en(interval '48 hours' - interval '10 seconds');
  perform pg_temp.como('viajero@demo.com');
  set local role authenticated;
  j := public.vista_previa_cancelacion(v_b);
  reset role;
  perform pg_temp.ok((j->>'horas_antes')::numeric = 47.99, 'vista_previa_cancelacion muestra 47.99 h');
end $$;

rollback;
