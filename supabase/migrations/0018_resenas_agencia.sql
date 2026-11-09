-- =====================================================================
-- 0018 — Todas las reseñas de la agencia, con paginación (página «Reseñas» del panel)
--
-- `resenas_recientes_agencia` (0015) sigue igual: tres reseñas para el Resumen, tope 20. Esta función nueva es la
-- que lista todas, de a páginas, con las mismas reglas de privacidad:
--   * `security definer`, `stable`, `search_path` fijo; solo `authenticated`;
--   * la agencia es la de quien llama (`agencies.owner_user_id = auth.uid()`): para cualquier otra persona, sin filas;
--   * el viajero solo aparece con `nombre_corto_viajero` (0016): nunca correo, teléfono, documento ni id de usuario;
--   * de la más nueva a la más antigua, con `id` como desempate: las páginas no se solapan ni se saltan filas;
--   * `p_limite` se acota a 1–50 (por defecto 20) y `p_desde` (cuántas saltar) nunca es negativo.
-- Devuelve lo mismo que `resenas_recientes_agencia` más `id` de la reseña, para usarlo de llave en la lista.
-- =====================================================================

create or replace function public.resenas_agencia(p_limite int default 20, p_desde int default 0)
returns table (id uuid, calificacion int, comentario text, nombre_corto text, plan_titulo text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select r.id, r.calificacion, r.comentario, public.nombre_corto_viajero(pr.nombre), p.titulo, r.created_at
    from public.reviews r
    join public.plans p on p.id = r.plan_id
    join public.agencies a on a.id = p.agency_id and a.owner_user_id = auth.uid()
    left join public.profiles pr on pr.id = r.viajero_id
   order by r.created_at desc, r.id desc
   limit least(greatest(coalesce(p_limite, 20), 1), 50)
  offset greatest(coalesce(p_desde, 0), 0);
$$;

revoke all on function public.resenas_agencia(int, int) from public, anon, service_role;
grant execute on function public.resenas_agencia(int, int) to authenticated;
