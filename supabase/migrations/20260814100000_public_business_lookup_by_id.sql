-- Safe public business lookup for booking confirmation.
-- Mirrors the public field allowlist without exposing owner/private fields.
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
  limit 1;
$$;

revoke all on function public.get_public_business_by_id(uuid) from public;
grant execute on function public.get_public_business_by_id(uuid) to anon, authenticated;
