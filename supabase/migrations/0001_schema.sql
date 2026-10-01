-- =====================================================================
-- Diverso App — esquema inicial
-- Marketplace de planes turísticos de agencias antioqueñas verificadas.
-- Design: dos lados (viajero B2C / agencia B2B), confianza y transparencia
-- (Anexos 4-6). El control de concurrencia de cupos (anti-sobreventa) vive
-- en las funciones RPC de la sección inferior (decremento atómico condicional).
-- =====================================================================

-- Tipos ---------------------------------------------------------------
create type public.user_role as enum ('viajero', 'agencia', 'admin');
create type public.verification_status as enum ('pendiente', 'verificado', 'rechazado');
create type public.plan_status as enum ('borrador', 'publicado', 'archivado');
create type public.booking_status as enum ('pendiente_pago', 'confirmada', 'cancelada', 'completada');
create type public.payment_method as enum ('pse', 'nequi', 'daviplata', 'tarjeta');
create type public.payment_status as enum ('pendiente', 'aprobado', 'rechazado', 'reembolsado');
create type public.experience_category as enum ('aventura', 'naturaleza', 'cultura', 'gastronomia', 'relax', 'urbano');

-- Perfiles (extensión de auth.users) ----------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  rol         public.user_role not null default 'viajero',
  nombre      text not null default '',
  telefono    text,
  created_at  timestamptz not null default now()
);

create table public.agencies (
  id                     uuid primary key default gen_random_uuid(),
  owner_user_id          uuid references public.profiles(id) on delete set null,
  nombre                 text not null,
  descripcion            text not null default '',
  numero_rnt             text not null unique,
  matricula_camara_comercio text not null,
  ciudad                 text not null default 'Medellín',
  telefono               text,
  email                  text,
  whatsapp               text,
  logo_url               text,
  estado_verificacion    public.verification_status not null default 'pendiente',
  comision_pct           numeric(5,2) not null default 12.00 check (comision_pct between 0 and 100),
  created_at             timestamptz not null default now()
);
create index agencies_owner_idx on public.agencies(owner_user_id);
create index agencies_estado_idx on public.agencies(estado_verificacion);

create table public.plans (
  id                    uuid primary key default gen_random_uuid(),
  agency_id             uuid not null references public.agencies(id) on delete cascade,
  titulo                text not null,
  destino               text not null,
  categoria             public.experience_category not null,
  descripcion           text not null default '',
  resumen               text not null default '',
  duracion_texto        text not null default '1 día',
  duracion_horas        numeric(6,2) not null default 12 check (duracion_horas > 0),
  punto_encuentro       text not null default '',
  precio_cop            numeric(12,2) not null check (precio_cop > 0),
  incluye               text[] not null default '{}',
  incluye_transporte    boolean not null default false,
  incluye_comida        boolean not null default false,
  incluye_hospedaje     boolean not null default false,
  itinerario            jsonb not null default '[]',
  politica_cancelacion  text not null default '',
  fotos                 text[] not null default '{}',
  estado                public.plan_status not null default 'borrador',
  rating_promedio       numeric(3,2) not null default 0,
  reviews_count         int not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index plans_agency_idx on public.plans(agency_id);
create index plans_estado_idx on public.plans(estado);
create index plans_destino_idx on public.plans(destino);
create index plans_categoria_idx on public.plans(categoria);
create index plans_precio_idx on public.plans(precio_cop);

create table public.plan_dates (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.plans(id) on delete cascade,
  fecha            date not null,
  cupo_total       int not null check (cupo_total > 0),
  cupo_disponible  int not null check (cupo_disponible >= 0),
  created_at       timestamptz not null default now(),
  unique (plan_id, fecha),
  check (cupo_disponible <= cupo_total)
);
create index plan_dates_plan_fecha_idx on public.plan_dates(plan_id, fecha);

create table public.bookings (
  id             uuid primary key default gen_random_uuid(),
  codigo         text not null unique,
  plan_date_id   uuid not null references public.plan_dates(id),
  viajero_id     uuid not null references public.profiles(id),
  pax            int not null check (pax between 1 and 20),
  monto_total    numeric(12,2) not null check (monto_total >= 0),
  estado         public.booking_status not null default 'pendiente_pago',
  created_at     timestamptz not null default now(),
  cancelled_at   timestamptz
);
create index bookings_viajero_idx on public.bookings(viajero_id);
create index bookings_plan_date_idx on public.bookings(plan_date_id);
create index bookings_estado_idx on public.bookings(estado);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  metodo      public.payment_method not null,
  estado      public.payment_status not null default 'pendiente',
  monto       numeric(12,2) not null check (monto >= 0),
  moneda      text not null default 'COP',
  referencia  text not null unique,
  provider    text not null default 'simulado',
  simulated   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index payments_booking_idx on public.payments(booking_id);

create table public.reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null unique references public.bookings(id) on delete cascade,
  plan_id      uuid not null references public.plans(id) on delete cascade,
  viajero_id   uuid not null references public.profiles(id),
  calificacion int not null check (calificacion between 1 and 5),
  comentario   text,
  created_at   timestamptz not null default now()
);
create index reviews_plan_idx on public.reviews(plan_id);

-- Vista de conciliación para el panel de agencias ---------------------
create view public.agency_sales as
select
  b.id            as booking_id,
  b.codigo,
  pl.agency_id,
  pl.titulo       as plan_titulo,
  pl.destino,
  pd.fecha,
  b.pax,
  b.monto_total,
  a.comision_pct,
  round(b.monto_total * a.comision_pct / 100, 2) as comision,
  round(b.monto_total - (b.monto_total * a.comision_pct / 100), 2) as saldo_agencia,
  b.estado        as booking_estado,
  pay.metodo,
  pay.estado      as pago_estado,
  pay.provider,
  pay.referencia,
  b.created_at
from public.bookings b
join public.plan_dates pd on pd.id = b.plan_date_id
join public.plans pl      on pl.id = pd.plan_id
join public.agencies a    on a.id = pl.agency_id
left join public.payments pay on pay.booking_id = b.id;

-- La vista consulta con los permisos del usuario que llama (no del dueño),
-- de modo que el RLS de las tablas base se aplique también aquí.
alter view public.agency_sales set (security_invoker = true);

-- =====================================================================
-- Triggers
-- =====================================================================

-- Perfil automático al registrar usuario (rol desde raw_user_meta_data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol text;
begin
  v_rol := coalesce(new.raw_user_meta_data->>'rol', 'viajero');
  if v_rol not in ('viajero', 'agencia', 'admin') then
    v_rol := 'viajero';
  end if;
  insert into public.profiles (id, rol, nombre, telefono)
  values (new.id, v_rol::public.user_role,
          coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'telefono');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at de plans
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger plans_touch_updated_at
  before update on public.plans
  for each row execute function public.touch_updated_at();

-- Agencia: solo admin cambia estado_verificacion; el dueño no se autoverifica
create or replace function public.guard_agency_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.estado_verificacion := old.estado_verificacion;
    new.comision_pct := old.comision_pct;
  end if;
  return new;
end;
$$;

create trigger agencies_guard_verification
  before update on public.agencies
  for each row execute function public.guard_agency_verification();

-- Plan: solo se puede publicar si la agencia está verificada
create or replace function public.guard_plan_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.verification_status;
begin
  if new.estado = 'publicado' then
    select estado_verificacion into v_estado
      from public.agencies where id = new.agency_id;
    if v_estado is distinct from 'verificado' then
      raise exception 'AGENCIA_NO_VERIFICADA';
    end if;
  end if;
  return new;
end;
$$;

create trigger plans_guard_publish
  before insert or update on public.plans
  for each row execute function public.guard_plan_publish();

-- Reseña: plan_id y viajero_id se derivan de la reserva (no del cliente)
create or replace function public.fill_review_from_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan uuid;
  v_viajero uuid;
begin
  select pd.plan_id, b.viajero_id into v_plan, v_viajero
    from public.bookings b
    join public.plan_dates pd on pd.id = b.plan_date_id
   where b.id = new.booking_id;
  if v_plan is null then
    raise exception 'RESERVA_INVALIDA';
  end if;
  new.plan_id := v_plan;
  new.viajero_id := v_viajero;
  return new;
end;
$$;

create trigger reviews_fill_from_booking
  before insert on public.reviews
  for each row execute function public.fill_review_from_booking();

-- Rating promedio del plan al insertar/borrar reseñas
create or replace function public.refresh_plan_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan uuid;
begin
  v_plan := coalesce(new.plan_id, old.plan_id);
  update public.plans p
     set rating_promedio = coalesce((select round(avg(calificacion)::numeric, 2)
                                       from public.reviews r where r.plan_id = v_plan), 0),
         reviews_count = (select count(*) from public.reviews r where r.plan_id = v_plan)
   where p.id = v_plan;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or delete on public.reviews
  for each row execute function public.refresh_plan_rating();

-- =====================================================================
-- Funciones auxiliares (seguridad)
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.is_agency_owner(p_agency_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.agencies
    where id = p_agency_id and owner_user_id = auth.uid()
  );
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles   enable row level security;
alter table public.agencies   enable row level security;
alter table public.plans      enable row level security;
alter table public.plan_dates enable row level security;
alter table public.bookings   enable row level security;
alter table public.payments   enable row level security;
alter table public.reviews    enable row level security;

-- profiles
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and rol = (select rol from public.profiles where id = auth.uid()));

-- agencies: catálogo visible para autenticados; registro y edición por dueño
create policy agencies_select_all on public.agencies
  for select to authenticated using (true);
create policy agencies_insert_own on public.agencies
  for insert to authenticated
  with check (owner_user_id = auth.uid() and estado_verificacion = 'pendiente');
create policy agencies_update_own on public.agencies
  for update to authenticated
  using (owner_user_id = auth.uid() or public.is_admin());
create policy agencies_delete_admin on public.agencies
  for delete to authenticated using (public.is_admin());

-- plans
create policy plans_select_published on public.plans
  for select to authenticated
  using (estado = 'publicado' or public.is_agency_owner(agency_id) or public.is_admin());
create policy plans_insert_agency on public.plans
  for insert to authenticated with check (public.is_agency_owner(agency_id));
create policy plans_update_agency on public.plans
  for update to authenticated using (public.is_agency_owner(agency_id) or public.is_admin());
create policy plans_delete_agency on public.plans
  for delete to authenticated using (public.is_agency_owner(agency_id) or public.is_admin());

-- plan_dates (misma visibilidad que su plan)
create policy plan_dates_select_visible on public.plan_dates
  for select to authenticated
  using (
    exists (select 1 from public.plans p
            where p.id = plan_id
              and (p.estado = 'publicado' or public.is_agency_owner(p.agency_id) or public.is_admin()))
  );
create policy plan_dates_write_agency on public.plan_dates
  for all to authenticated
  using (
    exists (select 1 from public.plans p
            where p.id = plan_id and (public.is_agency_owner(p.agency_id) or public.is_admin()))
  )
  with check (
    exists (select 1 from public.plans p
            where p.id = plan_id and (public.is_agency_owner(p.agency_id) or public.is_admin()))
  );

-- bookings: sin insert/update directo (solo RPCs); lectura por interesados.
-- La verificación de dueño de agencia va en función security definer para
-- evitar recursión infinita de RLS (subconsulta sobre la misma tabla).
create or replace function public.is_plan_agency_booking_owner(p_booking_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
      join public.plan_dates pd on pd.id = b.plan_date_id
      join public.plans p on p.id = pd.plan_id
      join public.agencies a on a.id = p.agency_id
     where b.id = p_booking_id and a.owner_user_id = auth.uid()
  );
$$;

create policy bookings_select_interested on public.bookings
  for select to authenticated
  using (
    viajero_id = auth.uid()
    or public.is_admin()
    or public.is_plan_agency_booking_owner(id)
  );

-- payments: lectura por interesados; escritura solo vía RPC
create policy payments_select_interested on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.bookings b
             where b.id = payments.booking_id
               and (b.viajero_id = auth.uid() or public.is_admin()
                    or exists (select 1 from public.plan_dates pd
                                 join public.plans p on p.id = pd.plan_id
                                where pd.id = b.plan_date_id
                                  and public.is_agency_owner(p.agency_id))))
  );

-- reviews: públicas; escritura solo del viajero con reserva válida
create policy reviews_select_all on public.reviews
  for select to authenticated using (true);
create policy reviews_insert_verified on public.reviews
  for insert to authenticated
  with check (
    exists (
      select 1 from public.bookings b
        join public.plan_dates pd on pd.id = b.plan_date_id
       where b.id = booking_id
         and b.viajero_id = auth.uid()
         and b.estado in ('confirmada', 'completada')
         and pd.fecha <= current_date
    )
  );
create policy reviews_update_own on public.reviews
  for update to authenticated using (viajero_id = auth.uid());
create policy reviews_delete_own on public.reviews
  for delete to authenticated using (viajero_id = auth.uid());

-- =====================================================================
-- RPCs — reserva transaccional (anti-sobreventa) y pagos
-- =====================================================================

-- Crea la reserva decrementando cupos de forma atómica (bloqueo optimista:
-- el UPDATE condicional solo afecta la fila si hay cupo suficiente).
create or replace function public.create_booking(p_plan_date_id uuid, p_pax int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_viajero uuid := auth.uid();
  v_fecha date;
  v_cupo int;
  v_plan record;
  v_booking_id uuid;
  v_codigo text;
begin
  if v_viajero is null then
    raise exception 'NO_AUTENTICADO';
  end if;
  if p_pax is null or p_pax < 1 or p_pax > 20 then
    raise exception 'PAX_INVALIDO';
  end if;

  -- Decremento atómico: si dos viajeros llegan a la vez, solo uno logra
  -- afectar la fila cuando el cupo no alcanza para ambos.
  update public.plan_dates
     set cupo_disponible = cupo_disponible - p_pax
   where id = p_plan_date_id
     and cupo_disponible >= p_pax
  returning fecha, cupo_disponible into v_fecha, v_cupo;

  if not found then
    -- ¿Existe la fecha y el plan está publicado?
    select pd.fecha, p.id, p.titulo, p.precio_cop, p.estado
      into v_plan
      from public.plan_dates pd
      join public.plans p on p.id = pd.plan_id
     where pd.id = p_plan_date_id;
    if v_plan.id is null then
      raise exception 'FECHA_NO_EXISTE';
    elsif v_plan.estado <> 'publicado' then
      raise exception 'PLAN_NO_PUBLICADO';
    else
      raise exception 'SIN_CUPO';
    end if;
  end if;

  select p.id, p.titulo, p.precio_cop into v_plan
    from public.plan_dates pd
    join public.plans p on p.id = pd.plan_id
   where pd.id = p_plan_date_id;

  v_codigo := 'DIV-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into public.bookings (codigo, plan_date_id, viajero_id, pax, monto_total, estado)
  values (v_codigo, p_plan_date_id, v_viajero, p_pax, v_plan.precio_cop * p_pax, 'pendiente_pago')
  returning id into v_booking_id;

  return json_build_object(
    'booking_id', v_booking_id,
    'codigo', v_codigo,
    'monto_total', v_plan.precio_cop * p_pax,
    'plan_titulo', v_plan.titulo,
    'fecha', v_fecha,
    'cupos_restantes', v_cupo
  );
end;
$$;

-- Confirma el pago simulado y deja la reserva confirmada.
-- Punto único de extensión: la pasarela real (Wompi/PayU) confirmará por
-- webhook con esta misma función (provider distinto, simulated=false).
create or replace function public.confirm_payment(
  p_booking_id uuid,
  p_metodo public.payment_method,
  p_provider text default 'simulado',
  p_simulated boolean default true
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_payment_id uuid;
  v_referencia text;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if v_booking.viajero_id <> auth.uid() then
    raise exception 'NO_ES_DUENO';
  end if;
  if v_booking.estado <> 'pendiente_pago' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  v_referencia := upper(coalesce(nullif(p_provider, ''), 'SIM')) || '-' ||
                  upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into public.payments (booking_id, metodo, estado, monto, referencia, provider, simulated)
  values (p_booking_id, p_metodo, 'aprobado', v_booking.monto_total, v_referencia, p_provider, p_simulated)
  returning id into v_payment_id;

  update public.bookings set estado = 'confirmada' where id = p_booking_id;

  return json_build_object(
    'payment_id', v_payment_id,
    'referencia', v_referencia,
    'codigo', v_booking.codigo,
    'monto', v_booking.monto_total
  );
end;
$$;

-- Cancela una reserva del viajero autenticado y libera los cupos.
create or replace function public.cancel_booking(p_booking_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'RESERVA_NO_EXISTE';
  end if;
  if v_booking.viajero_id <> auth.uid() then
    raise exception 'NO_ES_DUENO';
  end if;
  if v_booking.estado not in ('pendiente_pago', 'confirmada') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  update public.bookings
     set estado = 'cancelada', cancelled_at = now()
   where id = p_booking_id;

  -- Liberar cupos (con tope para nunca exceder cupo_total)
  update public.plan_dates
     set cupo_disponible = least(cupo_total, cupo_disponible + v_booking.pax)
   where id = v_booking.plan_date_id;

  update public.payments
     set estado = 'reembolsado'
   where booking_id = p_booking_id and estado = 'aprobado';

  return json_build_object('booking_id', p_booking_id, 'estado', 'cancelada');
end;
$$;

-- Expira reservas quedadas en pendiente_pago (> 30 min) devolviendo cupos.
-- Se llama oportunísticamente desde la app (carga del catálogo).
create or replace function public.expire_stale_bookings()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  with stale as (
    update public.bookings
       set estado = 'cancelada', cancelled_at = now()
     where estado = 'pendiente_pago'
       and created_at < now() - interval '30 minutes'
    returning plan_date_id, pax
  )
  update public.plan_dates pd
     set cupo_disponible = least(cupo_total, cupo_disponible + s.pax)
    from stale s
   where pd.id = s.plan_date_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- =====================================================================
-- Storage: buckets para fotos de planes y logos de agencias
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('plan-photos', 'plan-photos', true),
       ('agency-logos', 'agency-logos', true)
on conflict (id) do nothing;

create policy plan_photos_read on storage.objects
  for select using (bucket_id = 'plan-photos');
create policy plan_photos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'plan-photos'
    and exists (
      select 1 from public.agencies a
      where a.owner_user_id = auth.uid()
        and (storage.foldername(name))[1] = a.id::text
    )
  );
create policy plan_photos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'plan-photos'
    and exists (
      select 1 from public.agencies a
      where a.owner_user_id = auth.uid()
        and (storage.foldername(name))[1] = a.id::text
    )
  );

create policy agency_logos_read on storage.objects
  for select using (bucket_id = 'agency-logos');
create policy agency_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'agency-logos'
    and exists (
      select 1 from public.agencies a
      where a.owner_user_id = auth.uid()
        and (storage.foldername(name))[1] = a.id::text
    )
  );
