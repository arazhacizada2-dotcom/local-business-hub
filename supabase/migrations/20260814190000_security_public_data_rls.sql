-- Public data must be exposed through explicit allowlisted RPCs,
-- not broad anonymous SELECT policies on application tables.

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.page_views enable row level security;

-- Owners retain normal authenticated access through the existing owner policy.
drop policy if exists "services_select_public_active" on public.services;
revoke select on public.services from anon;
grant select on public.services to authenticated;

-- Only completed/onboarded businesses are publicly addressable.
create or replace view public.businesses_public with (security_invoker = false) as
select
  id, slug, name, business_type, description, address, phone, email, logo_url, timezone, opening_hours
from public.businesses
where onboarding_complete = true;

revoke all on public.businesses_public from public;
grant select on public.businesses_public to anon, authenticated;

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

-- Explicit public service allowlist. No business_id, timestamps, or internal fields
-- are returned to anonymous callers from the application table itself.
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

-- Booking confirmation gets only the minimum fields required for server-side
-- validation, and still verifies both service and business IDs.
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
