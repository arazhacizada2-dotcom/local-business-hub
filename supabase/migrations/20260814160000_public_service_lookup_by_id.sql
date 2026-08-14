-- Safe public service lookup for booking confirmation.
-- Keep the booking service validation independent of anon table/RLS behavior.
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
  where s.id = p_service_id
    and s.business_id = p_business_id
    and s.is_active = true
  limit 1;
$$;

revoke all on function public.get_public_service_by_id(uuid, uuid) from public;
grant execute on function public.get_public_service_by_id(uuid, uuid) to anon, authenticated;
