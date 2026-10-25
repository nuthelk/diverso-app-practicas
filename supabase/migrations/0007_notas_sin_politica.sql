-- =====================================================================
-- Diverso App — las notas de la política no pueden contener una regla de reembolso
--
-- 0006 dejó las frases que no son política en plans.politica_notas y las pone al final del texto. Pero una
-- nota podía ser ella misma una regla («Cancelación gratuita hasta 1 hora antes.» en un plan de 72 h) y el
-- viajero leería dos políticas distintas en el mismo texto. Los números son la única política: las notas ya
-- no pueden decir una.
--
--  * notas_con_politica(texto): true si alguna frase de las notas es una regla de política — las frases que
--    reconoce politica_desde_texto («Cancelación gratuita hasta N …», «Entre N y M …: …», «Menos de N …: …»)
--    o la redacción libre de una regla de reembolso («Reembolso del 100 % hasta 1 hora antes.»,
--    «Sin reembolso a menos de 12 horas.», «Cancela gratis hasta 2 horas antes.»). Las mismas expresiones
--    están en apps/panel_svelte/src/lib/politica.ts (notasConPolitica) y las dos pruebas (SQL y vitest)
--    afirman los mismos vectores. Es una guarda de coherencia contra el descuido, no un analizador de
--    lenguaje: la fuente de verdad de lo que se reembolsa siguen siendo los números.
--  * plans_sincronizar_politica rechaza con NOTAS_CON_POLITICA las notas que cumplan esa regla, venga el
--    cambio del panel Svelte (notas) o del panel Flutter antiguo (texto): del texto de legado se siguen leyendo
--    los números y las frases que no son política pasan a notas como hasta ahora; una segunda regla
--    reconocible (p. ej. otra «gratuita hasta») sigue sin ir a las notas ni cambiar los números.
--  * reembolso_por_politica devuelve horas_antes TRUNCADO (no redondeado) a 2 decimales: con 48 h − 10 s
--    se mostraba 48.00 junto al texto «menos de 48 h». La decisión del reembolso no cambia (ya comparaba el
--    intervalo exacto).
--
-- Los 30 planes de la BD viva y los del seed tienen notas que pasan la regla (lo afirma la prueba).
-- Segura sobre una BD con 0001–0006 aplicadas (no borra ni cambia datos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ¿Las notas dicen una regla de política?
-- ---------------------------------------------------------------------
-- Expresiones en ASCII y sin delimitadores de palabra para que POSIX (Postgres) y JavaScript coincidan; el
-- punto cubre las vocales con tilde («d.as?» = día/dia/días). Se evalúan sin distinguir mayúsculas sobre el
-- texto con espacios colapsados y normalizado a NFC. Cada expresión se limita a una frase con [^.].
create or replace function public.notas_con_politica(p_notas text)
returns boolean
language sql immutable
set search_path = public
as $$
  select exists (
    select 1
      from unnest(array[
        -- redacción libre de un reembolso
        'reembols|reintegr|devoluciones',
        '(devol|devuelv)[^ ]*( [^ ]+){0,3} (dinero|valor|pago|plata|abono|monto|total)',
        '(dinero|valor|pago|plata|abono|monto)( [^ ]+){0,3} (devol|devuelv)',
        -- «Cancelación gratuita …», «Cancela gratis …», «gratis hasta …»
        'cancel[^ ]*( [^ ]+){0,2} (gratis|gratuit)',
        'grat(is|uit)[^ ]* hasta',
        -- una cancelación con una cifra de horas, días o porcentaje (en cualquier orden) o con costo
        'cancel[^.]*[0-9]+ ?(%|h(rs?|oras?)?|d.as?)([^a-z]|$)',
        '[0-9]+ ?(%|h(rs?|oras?)?|d.as?)([^a-z]|$)[^.]*cancel',
        'cancel[^.]*(penaliz|multa|cobr|(sin|con) (costo|cargo|penal|recargo))',
        '(sin|con) (costo|cargo|penal|recargo)[^.]*cancel',
        -- los tramos de politica_desde_texto: «Entre N y M horas: …», «Menos de N horas: …»
        'entre [0-9]+ y [0-9]+ (horas?|d.as?) ?:',
        'menos de [0-9]+ (horas?|d.as?) ?:'
      ]) as regla(re)
     where normalize(public.normalizar_notas_politica(p_notas), NFC) ~* regla.re
  )
$$;

-- ---------------------------------------------------------------------
-- 2. plans: las notas no pueden ser una regla
-- ---------------------------------------------------------------------
-- Igual que 0006, más el rechazo; se evalúa con las notas ya definitivas (las del panel Svelte o las que salen
-- de leer el texto de legado).
create or replace function public.plans_sincronizar_politica()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
  v_numeros boolean;
  v_notas boolean;
  v_texto boolean;
begin
  if new.horas_cancelacion_gratuita is null or new.horas_cancelacion_gratuita <= 0 then
    return new;  -- NOT NULL / CHECK de la tabla rechazan la fila
  end if;

  new.politica_notas := public.normalizar_notas_politica(new.politica_notas);
  if tg_op = 'UPDATE' then
    v_numeros := (new.horas_cancelacion_gratuita, new.horas_reembolso_parcial, new.porcentaje_reembolso_parcial)
                 is distinct from (old.horas_cancelacion_gratuita, old.horas_reembolso_parcial, old.porcentaje_reembolso_parcial);
    v_notas := new.politica_notas is distinct from old.politica_notas;
    v_texto := new.politica_cancelacion is distinct from old.politica_cancelacion;
  else
    v_numeros := (new.horas_cancelacion_gratuita, new.horas_reembolso_parcial, new.porcentaje_reembolso_parcial)
                 is distinct from (48, null::int, null::int);
    v_notas := new.politica_notas <> '';
    v_texto := new.politica_cancelacion <> '';
  end if;

  -- Solo cambió el texto (panel Flutter antiguo, seed): el texto es lo que dice la agencia.
  if v_texto and not v_numeros and not v_notas then
    select * into v from public.politica_desde_texto(new.politica_cancelacion);
    if v.gratuita is not null then
      new.horas_cancelacion_gratuita := v.gratuita;
      new.horas_reembolso_parcial := v.parcial_h;
      new.porcentaje_reembolso_parcial := v.parcial_pct;
    end if;
    new.politica_notas := v.notas;
  end if;

  -- Los números son la política: unas notas que digan otra regla se rechazan, no se descartan en silencio.
  if public.notas_con_politica(new.politica_notas) then
    raise exception 'NOTAS_CON_POLITICA';
  end if;

  new.politica_cancelacion := public.texto_politica_con_notas(new.horas_cancelacion_gratuita,
                                                              new.horas_reembolso_parcial,
                                                              new.porcentaje_reembolso_parcial,
                                                              new.politica_notas);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. horas_antes truncado a 2 decimales
-- ---------------------------------------------------------------------
-- Igual que 0005, salvo que v_horas se trunca en vez de redondearse (la firma y los permisos no cambian).
create or replace function public.reembolso_por_politica(p_booking_id uuid)
returns table (horas_antes numeric, porcentaje int, monto numeric, aplica boolean, motivo text)
language plpgsql stable
set search_path = public
as $$
declare
  b public.bookings;
  v_pago public.payments;
  v_restante interval;
  v_horas numeric;
  v_pct int;
begin
  select * into b from public.bookings where id = p_booking_id;
  if b.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;

  -- La decisión compara el intervalo exacto; la cifra mostrada se TRUNCA (nunca muestra más horas de las que
  -- quedan: 48 h − 10 s es 47.99, no 48.00 junto a «menos de 48 h»).
  v_restante := b.salida_at - now();
  v_horas := trunc(extract(epoch from v_restante) / 3600, 2);

  select * into v_pago from public.payments
   where booking_id = b.id and estado = 'aprobado'
   order by created_at limit 1;

  if b.estado = 'pendiente_pago' or v_pago.id is null then
    return query select v_horas, 0, 0::numeric, false, 'Reserva sin pago confirmado: no hay nada que reembolsar'::text;
    return;
  end if;

  if v_restante >= make_interval(hours => b.politica_horas_gratuita) then
    return query select v_horas, 100, round(v_pago.monto, 2), true,
      format('Cancelación con al menos %s h de anticipación: reembolso del 100 %%', b.politica_horas_gratuita);
  elsif b.politica_horas_parcial is not null and v_restante >= make_interval(hours => b.politica_horas_parcial) then
    v_pct := b.politica_porcentaje_parcial;
    return query select v_horas, v_pct, round(v_pago.monto * v_pct / 100, 2), v_pct > 0,
      format('Cancelación con menos de %s h y al menos %s h de anticipación: reembolso del %s %%',
             b.politica_horas_gratuita, b.politica_horas_parcial, v_pct);
  else
    return query select v_horas, 0, 0::numeric, false,
      format('Cancelación con menos de %s h de anticipación: sin reembolso',
             coalesce(b.politica_horas_parcial, b.politica_horas_gratuita));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------
revoke all on function public.notas_con_politica(text) from public, anon, authenticated;
grant execute on function public.notas_con_politica(text) to service_role;
