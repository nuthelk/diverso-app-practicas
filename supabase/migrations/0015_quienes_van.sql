-- =====================================================================
-- 0015 — «Quiénes van» y reseñas recientes para el panel de agencias
--
-- La agencia no puede leer `profiles` (RLS: solo la fila propia), así que no ve el nombre de quien viaja ni de
-- quien reseñó. En vez de abrir `profiles`, dos funciones de solo lectura, `security definer`, devuelven lo
-- mínimo (minimización de datos, Ley 1581): primera palabra del nombre + inicial del último apellido, y nunca
-- teléfono, correo, documento ni id de usuario. La agencia es la de quien llama (`agencies.owner_user_id =
-- auth.uid()`, la misma regla de `is_agency_owner`); para cualquier otra persona no devuelven filas.
--
--   * quienes_van(uuid[])              — reservas pendiente_pago y confirmada de esas fechas, solo de planes propios
--   * resenas_recientes_agencia(int)   — últimas reseñas de los planes de la agencia (tope 20)
-- =====================================================================

-- «Laura Vélez» → «Laura V.»; una sola palabra → esa palabra; vacío o nulo → «Viajero». Interna: solo la
-- invocan las dos funciones de abajo (corren con los permisos de su dueño), nadie más puede ejecutarla.
create or replace function public.nombre_corto_viajero(p_nombre text)
returns text
language sql immutable
set search_path = public
as $$
  select case
           when palabras[1] = '' then 'Viajero'
           when cardinality(palabras) = 1 then palabras[1]
           else palabras[1] || ' ' || upper(left(palabras[cardinality(palabras)], 1)) || '.'
         end
    from (select regexp_split_to_array(btrim(coalesce(p_nombre, ''), E' \t\r\n'), '\s+') as palabras) t;
$$;

revoke all on function public.nombre_corto_viajero(text) from public, anon, authenticated, service_role;

create or replace function public.quienes_van(p_plan_date_ids uuid[])
returns table (plan_date_id uuid, booking_id uuid, codigo text, nombre_corto text, pax int,
               estado public.booking_status)
language sql stable security definer
set search_path = public
as $$
  select b.plan_date_id, b.id, b.codigo, public.nombre_corto_viajero(pr.nombre), b.pax, b.estado
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
    join public.plans p on p.id = pd.plan_id
    join public.agencies a on a.id = p.agency_id and a.owner_user_id = auth.uid()
    left join public.profiles pr on pr.id = b.viajero_id
   where b.plan_date_id = any (p_plan_date_ids)
     and b.estado in ('pendiente_pago', 'confirmada')
   order by b.plan_date_id, b.created_at, b.id;
$$;

create or replace function public.resenas_recientes_agencia(p_limite int default 3)
returns table (calificacion int, comentario text, nombre_corto text, plan_titulo text, created_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select r.calificacion, r.comentario, public.nombre_corto_viajero(pr.nombre), p.titulo, r.created_at
    from public.reviews r
    join public.plans p on p.id = r.plan_id
    join public.agencies a on a.id = p.agency_id and a.owner_user_id = auth.uid()
    left join public.profiles pr on pr.id = r.viajero_id
   order by r.created_at desc, r.id desc
   limit least(greatest(coalesce(p_limite, 3), 0), 20);
$$;

revoke all on function public.quienes_van(uuid[]) from public, anon, service_role;
grant execute on function public.quienes_van(uuid[]) to authenticated;
revoke all on function public.resenas_recientes_agencia(int) from public, anon, service_role;
grant execute on function public.resenas_recientes_agencia(int) to authenticated;
