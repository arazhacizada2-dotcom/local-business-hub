-- Safe public business lookup for the public business page.
-- Returns exactly the public fields exposed by businesses_public.
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
  limit 1;
$$;

revoke all on function public.get_public_business_by_slug(text) from public;
grant execute on function public.get_public_business_by_slug(text) to anon, authenticated;
