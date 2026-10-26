-- =====================================================================
-- Diverso App — 0010: logo de la agencia (bucket `agency-logos` + agencies.logo_url)
-- =====================================================================
-- La agencia sube su logo desde el panel. El campo `agencies.logo_url` y el bucket público
-- `agency-logos` ya existían (0001), pero el bucket solo tenía política de lectura y de
-- inserción: la dueña no podía reemplazar ni borrar su logo, el insert no limitaba el tipo
-- de archivo (se podía subir un html o un svg con scripts a un bucket público) y `logo_url`
-- aceptaba cualquier texto, incluida una URL externa que la app del viajero habría cargado.
--
-- Cambios:
--   1. El bucket limita cada archivo a 2 MB y admite solo png, jpeg y webp.
--   2. Políticas de `agency-logos` (insert, update, delete) limitadas a la carpeta
--      `<agency_id>/…` de la dueña y a extensiones de imagen. El admin queda como antes:
--      sin política de escritura propia. Lectura pública sin cambios.
--   3. Trigger sobre `agencies.logo_url`: solo acepta null o la URL pública de un objeto
--      que existe en la carpeta de esa misma agencia en este bucket.
--      Limitación conocida: la base no conoce el origen público de la API, así que valida
--      la ruta `/storage/v1/object/public/agency-logos/<agency_id>/<archivo>` y que el objeto
--      exista, pero no fija el host; ver el informe de seguridad (T4).
-- Sin sesión de usuario (service_role, mantenimiento) el trigger no interviene, igual que los
-- guardias de 0001 y 0004.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Límites del bucket
-- ---------------------------------------------------------------------
update storage.buckets
   set file_size_limit    = 2097152, -- 2 MB
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id = 'agency-logos';

-- ---------------------------------------------------------------------
-- 2. Políticas de escritura en la carpeta de la dueña
-- ---------------------------------------------------------------------
-- ¿El objeto es una imagen dentro de la carpeta `<agency_id>/` de la agencia de quien llama?
create or replace function public.es_logo_de_mi_agencia(p_name text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies a
    where a.owner_user_id = auth.uid()
      and (storage.foldername(p_name))[1] = a.id::text
      and lower(storage.extension(p_name)) in ('png', 'jpg', 'jpeg', 'webp')
  );
$$;

revoke all on function public.es_logo_de_mi_agencia(text) from public, anon;
grant execute on function public.es_logo_de_mi_agencia(text) to authenticated;

drop policy if exists agency_logos_write on storage.objects;

create policy agency_logos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'agency-logos' and public.es_logo_de_mi_agencia(name));

create policy agency_logos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'agency-logos' and public.es_logo_de_mi_agencia(name))
  with check (bucket_id = 'agency-logos' and public.es_logo_de_mi_agencia(name));

create policy agency_logos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'agency-logos' and public.es_logo_de_mi_agencia(name));

-- ---------------------------------------------------------------------
-- 3. logo_url solo apunta al logo de la propia agencia
-- ---------------------------------------------------------------------
create or replace function public.guard_agency_logo_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or new.logo_url is null then
    return new;
  end if;
  -- Un valor anterior que no se toca (p. ej. al editar otros campos) no se revalida.
  if tg_op = 'UPDATE' and new.logo_url is not distinct from old.logo_url then
    return new;
  end if;
  if new.logo_url !~* ('^https?://[^/?#@[:space:]]+/storage/v1/object/public/agency-logos/'
                       || new.id::text || '/[a-z0-9._-]+\.(png|jpe?g|webp)$')
     or not exists (
       select 1 from storage.objects o
        where o.bucket_id = 'agency-logos'
          and o.name = new.id::text || '/' || substring(new.logo_url from '[^/]+$')
     ) then
    raise exception 'LOGO_URL_INVALIDO';
  end if;
  return new;
end;
$$;

create trigger agencies_guard_logo_url
  before insert or update of logo_url on public.agencies
  for each row execute function public.guard_agency_logo_url();
