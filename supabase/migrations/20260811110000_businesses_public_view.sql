-- H2: Stop anonymous full-table SELECT on businesses.
-- Public callers use businesses_public (limited columns only).
-- Owners retain full access via businesses_select_own on the base table.

drop policy if exists "businesses_select_public" on public.businesses;

create or replace view public.businesses_public
with (security_invoker = false)
as
select
  id,
  slug,
  name,
  business_type,
  description,
  address,
  phone,
  email,
  logo_url,
  opening_hours
from public.businesses;

comment on view public.businesses_public is
  'Public booking profile fields only. Does not include owner_id, plan, or onboarding_complete.';

revoke all on public.businesses_public from public;
grant select on public.businesses_public to anon, authenticated;
