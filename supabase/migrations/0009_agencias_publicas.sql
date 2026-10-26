-- =====================================================================
-- Diverso App — 0009: catálogo público de agencias para la app del viajero
-- =====================================================================
-- La app lista las agencias con su puntaje, logo y portada. Para eso NO lee la tabla
-- `agencies` (cuya política deja ver al viajero todas las columnas de una agencia habilitada:
-- contactos, comisión, datos de verificación). Lee esta función de solo lectura, que devuelve
-- únicamente columnas públicas y agregados.
--
-- Mecanismo: función `security definer` con `search_path` fijo en lugar de una vista
-- `security_invoker`. Así la app no depende de la política de `agencies`: si más adelante se
-- restringe (decisión pendiente del usuario), el catálogo de agencias sigue funcionando. La
-- visibilidad se decide aquí con `agencia_habilitada` (verificada y RNT vigente), la misma regla
-- con la que `plans_select_published` muestra los planes; por eso una agencia aparece si y solo
-- si el viajero puede ver al menos un plan suyo.
--
-- Audiencia: `authenticated`, igual que el catálogo de planes (anon no lee planes).
-- No cambia ninguna política ni tabla existente.
-- =====================================================================

create or replace function public.agencias_publicas(p_agency_id uuid default null)
returns table (
  id            uuid,
  nombre        text,
  ciudad        text,
  descripcion   text,
  logo_url      text,
  planes_count  int,
  rating        numeric,
  reviews_total int,
  portada_url   text
)
language sql stable security definer
set search_path = public
as $$
  select a.id,
         a.nombre,
         a.ciudad,
         a.descripcion,
         a.logo_url,
         s.planes_count,
         -- Promedio de los planes publicados ponderado por sus reseñas; null si no hay ninguna.
         case when s.reviews_total > 0 then round(s.puntos / s.reviews_total, 2) end,
         s.reviews_total,
         -- Primera foto del plan publicado mejor puntuado que tenga fotos (si el mejor no tiene,
         -- la del siguiente).
         (select p.fotos[1]
            from public.plans p
           where p.agency_id = a.id and p.estado = 'publicado' and cardinality(p.fotos) > 0
           order by p.rating_promedio desc, p.reviews_count desc, p.created_at, p.id
           limit 1)
    from public.agencies a
    cross join lateral (
      select count(*)::int                                          as planes_count,
             coalesce(sum(p.reviews_count), 0)::int                 as reviews_total,
             coalesce(sum(p.rating_promedio * p.reviews_count), 0)  as puntos
        from public.plans p
       where p.agency_id = a.id and p.estado = 'publicado'
    ) s
   where public.agencia_habilitada(a.id)
     and s.planes_count > 0
     and (p_agency_id is null or a.id = p_agency_id)
   order by a.nombre;
$$;

-- Las funciones nuevas en `public` nacen ejecutables por anon/PUBLIC: se cierra explícitamente.
revoke all on function public.agencias_publicas(uuid) from public, anon;
grant execute on function public.agencias_publicas(uuid) to authenticated, service_role;

comment on function public.agencias_publicas(uuid) is
  'Catálogo público de agencias para el viajero: columnas públicas y agregados; sin contactos ni comisión.';
