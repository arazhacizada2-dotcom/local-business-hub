-- ============================================================
-- LOCAL BUSINESS HUB — Supabase schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`)
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

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
  timezone text not null default 'UTC',
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
  updated_at timestamptz not null default now(),
  constraint businesses_timezone_nonempty check (length(trim(timezone)) > 0)
);

create index if not exists businesses_owner_id_idx on public.businesses(owner_id);
create index if not exists businesses_slug_idx on public.businesses(slug);

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

create extension if not exists btree_gist;

alter table public.appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at) with &&
  )
  where (status <> 'cancelled');

create or replace function public.enforce_appointment_duration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  dur integer;
  business_timezone text;
  opening jsonb;
  local_start timestamp;
  day_key text;
  day_hours jsonb;
  open_at timestamptz;
  close_at timestamptz;
begin
  if tg_op = 'UPDATE'
     and new.starts_at is not distinct from old.starts_at
     and new.ends_at is not distinct from old.ends_at
     and new.service_id is not distinct from old.service_id
     and new.business_id is not distinct from old.business_id then
    return new;
  end if;

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

  select b.timezone, b.opening_hours
    into business_timezone, opening
  from public.businesses b
  where b.id = new.business_id;

  if business_timezone is null then
    raise exception 'Business timezone is not configured';
  end if;

  local_start := new.starts_at at time zone business_timezone;
  day_key := case extract(isodow from local_start)::int
    when 1 then 'mon'
    when 2 then 'tue'
    when 3 then 'wed'
    when 4 then 'thu'
    when 5 then 'fri'
    when 6 then 'sat'
    when 7 then 'sun'
  end;
  day_hours := opening -> day_key;

  if day_hours is null or coalesce((day_hours ->> 'closed')::boolean, false) then
    raise exception 'Appointment is outside business opening hours';
  end if;

  if day_hours ->> 'open' is null or day_hours ->> 'close' is null then
    raise exception 'Business opening hours are invalid';
  end if;

  open_at := ((local_start::date::text || ' ' || (day_hours ->> 'open'))::timestamp at time zone business_timezone);
  close_at := ((local_start::date::text || ' ' || (day_hours ->> 'close'))::timestamp at time zone business_timezone);

  if new.starts_at < open_at or new.ends_at > close_at then
    raise exception 'Appointment is outside business opening hours';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_appointment_duration_trg on public.appointments;
create trigger enforce_appointment_duration_trg before insert or update on public.appointments for each row execute procedure public.enforce_appointment_duration();

create table if not exists public.page_views (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  event_type text not null default 'page_view' check (event_type in ('page_view', 'booking_attempt', 'booking_completed')),
  created_at timestamptz not null default now()
);

create index if not exists page_views_business_id_idx on public.page_views(business_id);
create index if not exists page_views_event_type_idx on public.page_views(event_type);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at before update on public.businesses for each row execute procedure public.set_updated_at();
drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at before update on public.services for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.page_views enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "businesses_select_own" on public.businesses for select using (auth.uid() = owner_id);
create policy "businesses_insert_own" on public.businesses for insert with check (auth.uid() = owner_id);
create policy "businesses_update_own" on public.businesses for update using (auth.uid() = owner_id);
create policy "businesses_delete_own" on public.businesses for delete using (auth.uid() = owner_id);

create or replace view public.businesses_public with (security_invoker = false) as
select id, slug, name, business_type, description, address, phone, email, logo_url, timezone, opening_hours
from public.businesses
where onboarding_complete = true;

revoke all on public.businesses_public from public;
grant select on public.businesses_public to anon, authenticated;

create policy "services_owner_all" on public.services for all using (
  exists (select 1 from public.businesses b where b.id = services.business_id and b.owner_id = auth.uid())
);

create policy "appointments_owner_all" on public.appointments for all using (
  exists (select 1 from public.businesses b where b.id = appointments.business_id and b.owner_id = auth.uid())
);
create policy "appointments_insert_public" on public.appointments for insert with check (
  status = 'pending'
  and starts_at >= (now() - interval '1 minute')
  and ends_at > starts_at
  and exists (
    select 1 from public.services s
    join public.businesses b on b.id = s.business_id
    where s.id = service_id
      and s.business_id = appointments.business_id
      and s.is_active = true
      and b.onboarding_complete = true
  )
);

create or replace function public.get_booked_ranges(p_business_id uuid, p_day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql security definer stable set search_path = public
as $$
  select a.starts_at, a.ends_at
  from public.appointments a
  join public.businesses b on b.id = a.business_id
  where a.business_id = p_business_id
    and a.status <> 'cancelled'
    and a.starts_at >= ((p_day::text || ' 00:00:00')::timestamp at time zone b.timezone)
    and a.starts_at < (((p_day + 1)::text || ' 00:00:00')::timestamp at time zone b.timezone);
$$;

revoke all on function public.get_booked_ranges(uuid, date) from public;
grant execute on function public.get_booked_ranges(uuid, date) to anon, authenticated;

create or replace function public.get_public_business_by_slug(p_slug text)
returns table (
  id uuid,
  slug text,
  name text,
  business_type text,
  description text,
  address text,
  phone text,
  email text,
  logo_url text,
  timezone text,
  opening_hours jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.slug,
    b.name,
    b.business_type,
    b.description,
    b.address,
    b.phone,
    b.email,
    b.logo_url,
    b.timezone,
    b.opening_hours
  from public.businesses b
  where b.slug = p_slug
    and b.onboarding_complete = true
  limit 1;
$$;

revoke all on function public.get_public_business_by_slug(text) from public;
grant execute on function public.get_public_business_by_slug(text) to anon, authenticated;

create or replace function public.get_public_business_by_id(p_business_id uuid)
returns table (
  id uuid,
  slug text,
  name text,
  business_type text,
  description text,
  address text,
  phone text,
  email text,
  logo_url text,
  timezone text,
  opening_hours jsonb
)
language sql
security definer
stable
set search_path = public
as $$
  select
    b.id,
    b.slug,
    b.name,
    b.business_type,
    b.description,
    b.address,
    b.phone,
    b.email,
    b.logo_url,
    b.timezone,
    b.opening_hours
  from public.businesses b
  where b.id = p_business_id
    and b.onboarding_complete = true
  limit 1;
$$;

revoke all on function public.get_public_business_by_id(uuid) from public;
grant execute on function public.get_public_business_by_id(uuid) to anon, authenticated;

create or replace function public.get_public_services_by_business_id(p_business_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  price_cents integer,
  duration_minutes integer,
  sort_order integer
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.name,
    s.description,
    s.price_cents,
    s.duration_minutes,
    s.sort_order
  from public.services s
  join public.businesses b on b.id = s.business_id
  where s.business_id = p_business_id
    and s.is_active = true
    and b.onboarding_complete = true
  order by s.sort_order asc, s.created_at asc;
$$;

revoke all on function public.get_public_services_by_business_id(uuid) from public;
grant execute on function public.get_public_services_by_business_id(uuid) to anon, authenticated;

create or replace function public.get_public_service_by_id(p_service_id uuid, p_business_id uuid)
returns table (
  id uuid,
  business_id uuid,
  name text,
  duration_minutes integer,
  is_active boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.id,
    s.business_id,
    s.name,
    s.duration_minutes,
    s.is_active
  from public.services s
  join public.businesses b on b.id = s.business_id
  where s.id = p_service_id
    and s.business_id = p_business_id
    and s.is_active = true
    and b.onboarding_complete = true
  limit 1;
$$;

revoke all on function public.get_public_service_by_id(uuid, uuid) from public;
grant execute on function public.get_public_service_by_id(uuid, uuid) to anon, authenticated;

create policy "page_views_owner_select" on public.page_views for select using (
  exists (select 1 from public.businesses b where b.id = page_views.business_id and b.owner_id = auth.uid())
);
create policy "page_views_insert_public" on public.page_views for insert with check (
  exists (select 1 from public.businesses b where b.id = business_id)
);
