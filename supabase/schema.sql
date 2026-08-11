-- ============================================================
-- LOCAL BUSINESS HUB — Supabase schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- profiles: one row per authenticated user (owner of a business)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- businesses: one business per owner (MVP: 1:1)
-- ------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  name text not null,
  business_type text not null,
  description text,
  address text,
  phone text,
  email text,
  logo_url text,
  opening_hours jsonb not null default '{
    "mon": {"open": "09:00", "close": "18:00", "closed": false},
    "tue": {"open": "09:00", "close": "18:00", "closed": false},
    "wed": {"open": "09:00", "close": "18:00", "closed": false},
    "thu": {"open": "09:00", "close": "18:00", "closed": false},
    "fri": {"open": "09:00", "close": "18:00", "closed": false},
    "sat": {"open": "10:00", "close": "16:00", "closed": false},
    "sun": {"open": "10:00", "close": "16:00", "closed": true}
  }'::jsonb,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists businesses_slug_idx on public.businesses(slug);

-- ------------------------------------------------------------
-- services
-- ------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null default 0,
  duration_minutes integer not null default 30,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_business_id_idx on public.services(business_id);

-- ------------------------------------------------------------
-- appointments
-- ------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists appointments_business_id_idx on public.appointments(business_id);
create index if not exists appointments_starts_at_idx on public.appointments(starts_at);

-- Prevent obvious double-booking: no two non-cancelled appointments for the
-- same business can overlap in time. Enforced with an exclusion constraint.
create extension if not exists btree_gist;

alter table public.appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelled');

-- Force ends_at from the service duration so clients (including direct anon
-- API inserts) cannot supply an arbitrary window.
create or replace function public.enforce_appointment_duration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  dur integer;
begin
  if new.service_id is null then
    if tg_op = 'INSERT' then
      raise exception 'service_id is required to determine appointment duration';
    end if;

    if new.starts_at is distinct from old.starts_at
       or new.ends_at is distinct from old.ends_at then
      raise exception 'Cannot change appointment times without a service_id';
    end if;

    return new;
  end if;

  select s.duration_minutes into dur
  from public.services s
  where s.id = new.service_id
    and s.business_id = new.business_id
    and s.is_active = true;

  if dur is null then
    select s.duration_minutes into dur
    from public.services s
    where s.id = new.service_id
      and s.business_id = new.business_id;
  end if;

  if dur is null then
    raise exception 'Invalid service for appointment';
  end if;

  if dur <= 0 then
    raise exception 'Service duration must be positive';
  end if;

  new.ends_at := new.starts_at + make_interval(mins => dur);

  return new;
end;
$$;

drop trigger if exists enforce_appointment_duration_trg on public.appointments;

create trigger enforce_appointment_duration_trg
  before insert or update on public.appointments
  for each row
  execute procedure public.enforce_appointment_duration();

-- ------------------------------------------------------------
-- page_views: lightweight analytics
-- ------------------------------------------------------------
create table if not exists public.page_views (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null default 'page_view' check (event_type in ('page_view', 'booking_attempt', 'booking_completed')),
  created_at timestamptz not null default now()
);

create index if not exists page_views_business_id_idx on public.page_views(business_id);
create index if not exists page_views_event_type_idx on public.page_views(event_type);

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
  for each row execute procedure public.set_updated_at();

-- ------------------------------------------------------------
-- auto-create a profile row when a new auth user signs up
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.page_views enable row level security;

-- profiles: a user can read/update only their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- businesses: owners have full access to their own business
create policy "businesses_select_own" on public.businesses
  for select using (auth.uid() = owner_id);
create policy "businesses_insert_own" on public.businesses
  for insert with check (auth.uid() = owner_id);
create policy "businesses_update_own" on public.businesses
  for update using (auth.uid() = owner_id);
create policy "businesses_delete_own" on public.businesses
  for delete using (auth.uid() = owner_id);

-- businesses: anyone (including anonymous visitors) can read the public
-- fields of a business via the public page. We allow full-row select
-- here for simplicity and only ever query the public columns from the
-- client; a stricter setup could use a view instead.
create policy "businesses_select_public" on public.businesses
  for select using (true);

-- services: owners manage their own; anyone can view active services
-- of any business (needed for the public booking page)
create policy "services_owner_all" on public.services
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = services.business_id and b.owner_id = auth.uid()
    )
  );

create policy "services_select_public_active" on public.services
  for select using (is_active = true);

-- appointments: owners can see/manage appointments for their business
create policy "appointments_owner_all" on public.appointments
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = appointments.business_id and b.owner_id = auth.uid()
    )
  );

-- appointments: anonymous customers may INSERT a pending booking only when
-- the service belongs to the business and is active. PII is never readable
-- by anonymous users — slot availability is exposed via get_booked_ranges().
-- ends_at is always rewritten by enforce_appointment_duration from the
-- service duration before RLS WITH CHECK runs.
create policy "appointments_insert_public" on public.appointments
  for insert with check (
    status = 'pending'
    and starts_at >= (now() - interval '1 minute')
    and ends_at > starts_at
    and exists (
      select 1 from public.services s
      where s.id = service_id
        and s.business_id = appointments.business_id
        and s.is_active = true
    )
  );

-- Secure RPC: expose only time ranges (no customer PII) for the booking widget.
create or replace function public.get_booked_ranges(p_business_id uuid, p_day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select a.starts_at, a.ends_at
  from public.appointments a
  where a.business_id = p_business_id
    and a.status <> 'cancelled'
    and a.starts_at >= p_day::timestamptz
    and a.starts_at < (p_day + 1)::timestamptz;
$$;

revoke all on function public.get_booked_ranges(uuid, date) from public;
grant execute on function public.get_booked_ranges(uuid, date) to anon, authenticated;

-- page_views: owners can read analytics for their business
create policy "page_views_owner_select" on public.page_views
  for select using (
    exists (
      select 1 from public.businesses b
      where b.id = page_views.business_id and b.owner_id = auth.uid()
    )
  );

-- page_views: anonymous visitors may write tracking events for real businesses only
create policy "page_views_insert_public" on public.page_views
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id)
  );

-- ============================================================
-- SEED / DEMO DATA
-- Replace <OWNER_UUID> with a real auth.users id after creating
-- a demo account, then run this block separately.
-- ============================================================
-- insert into public.businesses (owner_id, slug, name, business_type, description, address, phone, email, onboarding_complete)
-- values ('<OWNER_UUID>', 'blade-barber', 'Blade Barber', 'Barber Shop',
--   'A classic barbershop in the heart of the city — sharp fades, hot towel shaves, and a chair that''s always warm.',
--   '12 Nizami Street, Baku', '+994 12 345 6789', 'hello@bladebarber.example', true);
--
-- insert into public.services (business_id, name, description, price_cents, duration_minutes, sort_order)
-- select id, 'Haircut', 'Classic cut, tailored to you.', 2000, 30, 1 from public.businesses where slug = 'blade-barber'
-- union all
-- select id, 'Beard Trim', 'Shape and line-up.', 1200, 20, 2 from public.businesses where slug = 'blade-barber'
-- union all
-- select id, 'Haircut + Beard', 'The full package.', 2800, 45, 3 from public.businesses where slug = 'blade-barber';
