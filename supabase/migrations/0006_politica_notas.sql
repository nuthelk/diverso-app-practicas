-- =====================================================================
-- Diverso App — notas de la política de cancelación
--
-- 0005 hizo que el texto de la política se genere SIEMPRE desde los números, y con eso
-- perdió frases útiles que no son política («Reprogramación gratuita por clima.»,
-- «Avisar restricciones alimentarias.», «Requiere condición física media.») en 6 planes
-- del seed, y las habría perdido de nuevo en cada edición.
--
-- Solución: plans.politica_notas guarda toda frase que NO es una frase de política
-- reconocida, y el texto es siempre
--     <texto canónico de los números> [ + ' ' + <notas> ]
-- generado igual en SQL (texto_politica_con_notas) y en el panel
-- (apps/panel_svelte/src/lib/politica.ts: textoPoliticaCompleto).
--
--  * Edición desde el panel Svelte (números y/o notas): mandan números y notas.
--  * Edición solo del texto (panel Flutter antiguo, seed): se leen los números y las frases
--    que no son política pasan a notas — nunca se descarta texto que no sea política.
--    Las frases de política que se contradicen (ventana parcial >= gratuita) se ignoran:
--    los números son la fuente de verdad.
--  * Las frases perdidas por 0005 se restauran EXACTAMENTE desde los textos originales de
--    seed.sql, por plan, solo donde el plan sigue como lo dejó 0005. En una BD nueva
--    (migraciones + seed) la tabla plans está vacía aquí: el seed pasa por el disparador y
--    obtiene el mismo resultado.
--  * Las reservas de esos planes actualizan su texto congelado SOLO si era el texto canónico
--    sin notas de sus propios números (los números congelados no cambian nunca).
--
-- Segura sobre una BD con 0001–0005 aplicadas (no borra datos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columna y generador de texto
-- ---------------------------------------------------------------------
alter table public.plans add column politica_notas text not null default '';

-- Recorta y colapsa espacios, tabuladores y saltos de línea (igual que normalizarNotas() en politica.ts).
create or replace function public.normalizar_notas_politica(p_notas text)
returns text
language sql immutable
set search_path = public
as $$
  select btrim(regexp_replace(coalesce(p_notas, ''), '[ \t\r\n]+', ' ', 'g'), ' ')
$$;

-- Mismas cadenas que textoPoliticaCompleto() de apps/panel_svelte/src/lib/politica.ts; las dos pruebas
-- (SQL y vitest) afirman los mismos vectores.
create or replace function public.texto_politica_con_notas(p_gratuita int, p_parcial int, p_porcentaje int, p_notas text)
returns text
language sql immutable
set search_path = public
as $$
  select public.texto_politica(p_gratuita, p_parcial, p_porcentaje)
         || case when public.normalizar_notas_politica(p_notas) = '' then ''
                 else ' ' || public.normalizar_notas_politica(p_notas) end
$$;

-- ---------------------------------------------------------------------
-- 2. Lectura de un texto: números y notas
-- ---------------------------------------------------------------------
-- Cambia la firma (nuevo parámetro de salida): hay que reemplazarla.
drop function public.politica_desde_texto(text);

-- Devuelve los números (como en 0005) y, en `notas`, las frases que no son frases de política
-- (ni «Cancelación gratuita hasta N …», ni «Entre N y M …: reembolso del P %», ni «Menos de N …:
-- reembolso del P % / sin reembolso»), en su orden y unidas por un espacio. Un texto sin política
-- reconocible devuelve todo el texto como notas.
create or replace function public.politica_desde_texto(
  p_texto text,
  out gratuita int,
  out parcial_h int,
  out parcial_pct int,
  out notas text
)
language plpgsql immutable
set search_path = public
as $$
declare
  v_frase text;
  v_notas text[] := '{}';
  v_libre text[];
  v_entre text[];
  v_pct text[];
begin
  foreach v_frase in array regexp_split_to_array(btrim(coalesce(p_texto, '')), '(?<=\.)\s+') loop
    v_frase := btrim(v_frase);
    if v_frase = '' then
      continue;
    end if;
    if v_frase ~ '^Cancelación gratuita hasta \d{1,6} (horas?|días?)( antes)?\.?$'
       or v_frase ~ '^Entre \d{1,6} y \d{1,6} (horas?|días?): (reembolso del )?\d{1,3}\s?%\.?$'
       or v_frase ~ '^Menos de \d{1,6} (horas?|días?): ((reembolso del )?\d{1,3}\s?%|sin reembolso)\.?$' then
      continue;
    end if;
    v_notas := v_notas || v_frase;
  end loop;
  notas := public.normalizar_notas_politica(array_to_string(v_notas, ' '));

  v_libre := regexp_match(p_texto, 'gratuita hasta (\d{1,6}) (horas?|días?)');
  if v_libre is null then
    return;
  end if;
  gratuita := v_libre[1]::int * case when v_libre[2] like 'd%' then 24 else 1 end;

  v_entre := regexp_match(p_texto, 'Entre \d{1,6} y (\d{1,6}) (horas?|días?)');
  if v_entre is not null then
    parcial_h := v_entre[1]::int * case when v_entre[2] like 'd%' then 24 else 1 end;
    v_pct := regexp_match(p_texto, 'Entre \d{1,6} y \d{1,6} (?:horas?|días?): (?:reembolso del )?(\d{1,3})\s?%');
    if v_pct is null then
      v_pct := regexp_match(p_texto, '(\d{1,3})\s?%');
    end if;
  else
    v_pct := regexp_match(p_texto, 'Menos de \d{1,6} (?:horas?|días?): (?:reembolso del )?(\d{1,3})\s?%');
    if v_pct is not null then
      parcial_h := 0;  -- «Menos de X: 50 %»: el porcentaje rige hasta la salida
    end if;
  end if;
  parcial_pct := v_pct[1]::int;

  if parcial_pct is null then
    parcial_h := null;
  end if;
  if gratuita <= 0 or (parcial_h is not null and parcial_h >= gratuita)
     or (parcial_pct is not null and parcial_pct > 100) then
    gratuita := null;
    parcial_h := null;
    parcial_pct := null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. plans: texto = números + notas, siempre coherentes
-- ---------------------------------------------------------------------
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

  new.politica_cancelacion := public.texto_politica_con_notas(new.horas_cancelacion_gratuita,
                                                              new.horas_reembolso_parcial,
                                                              new.porcentaje_reembolso_parcial,
                                                              new.politica_notas);
  return new;
end;
$$;

drop trigger plans_politica_sincronizada on public.plans;
create trigger plans_politica_sincronizada
  before insert or update of politica_cancelacion, politica_notas, horas_cancelacion_gratuita,
                             horas_reembolso_parcial, porcentaje_reembolso_parcial
  on public.plans
  for each row execute function public.plans_sincronizar_politica();

-- ---------------------------------------------------------------------
-- 4. Restaurar las frases que 0005 borró (textos originales de supabase/seed.sql)
-- ---------------------------------------------------------------------
-- Solo planes del seed por (RNT de la agencia, título), que siguen como los dejó 0005: sin notas, con los
-- mismos números que dice el texto original y con el texto canónico de esos números. Si la agencia ya
-- tocó la política, no se pisa nada. Las reservas de esos planes reciben el texto con notas únicamente
-- si su texto congelado era el canónico sin notas de SUS números.
do $$
declare
  v_planes int;
  v_reservas int;
begin
  with originales(rnt, titulo, texto) as (
    values
      ('85421', 'Parapente San Félix — vuelo de 15 minutos',
       'Reprogramación gratuita si el clima no permite volar. Cancelación gratuita hasta 24 horas antes.'),
      ('44950', 'Espeleísmo en cuevas de Río Claro',
       'Cancelación gratuita hasta 72 horas antes. Requiere condición física media.'),
      ('77849', 'Street food tour: sabores de la comuna',
       'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.'),
      ('52263', 'Parapente premium 20 minutos + video',
       'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.'),
      ('52263', 'Bautismo de vuelo — 10 minutos',
       'Reprogramación gratuita por clima. Cancelación gratuita hasta 24 horas antes.'),
      ('81025', 'Ruta gastronómica del sur',
       'Cancelación gratuita hasta 24 horas antes. Avisar restricciones alimentarias.')
  ), restaurables as (
    select pl.id, t.notas
      from originales o
      join public.agencies a on a.numero_rnt = o.rnt
      join public.plans pl on pl.agency_id = a.id and pl.titulo = o.titulo
      cross join lateral public.politica_desde_texto(o.texto) t
     where pl.politica_notas = ''
       and t.notas <> ''
       and (pl.horas_cancelacion_gratuita, pl.horas_reembolso_parcial, pl.porcentaje_reembolso_parcial)
           is not distinct from (t.gratuita, t.parcial_h, t.parcial_pct)
       and pl.politica_cancelacion = public.texto_politica(pl.horas_cancelacion_gratuita, pl.horas_reembolso_parcial,
                                                          pl.porcentaje_reembolso_parcial)
  ), planes as (
    update public.plans pl
       set politica_notas = r.notas
      from restaurables r
     where pl.id = r.id
    returning pl.id, pl.politica_notas
  ), reservas as (
    update public.bookings b
       set politica_texto = public.texto_politica_con_notas(b.politica_horas_gratuita, b.politica_horas_parcial,
                                                            b.politica_porcentaje_parcial, p.politica_notas)
      from planes p
      join public.plan_dates pd on pd.plan_id = p.id
     where b.plan_date_id = pd.id
       and b.politica_texto = public.texto_politica(b.politica_horas_gratuita, b.politica_horas_parcial,
                                                    b.politica_porcentaje_parcial)
    returning b.id
  )
  select (select count(*) from planes), (select count(*) from reservas) into v_planes, v_reservas;
  raise notice '0006: % planes con notas restauradas, % reservas con el texto congelado actualizado', v_planes, v_reservas;
end $$;

-- ---------------------------------------------------------------------
-- 5. Permisos
-- ---------------------------------------------------------------------
-- Supabase concede EXECUTE a anon/authenticated por defecto en public: se revoca explícitamente además de PUBLIC.
revoke all on function public.normalizar_notas_politica(text) from public, anon, authenticated;
revoke all on function public.texto_politica_con_notas(int, int, int, text) from public, anon, authenticated;
revoke all on function public.politica_desde_texto(text) from public, anon, authenticated;
grant execute on function public.normalizar_notas_politica(text) to service_role;
grant execute on function public.texto_politica_con_notas(int, int, int, text) to service_role;
grant execute on function public.politica_desde_texto(text) to service_role;
