-- Security hardening migration (apply after initial schema.sql)
-- Tightens public insert policies and adds get_booked_ranges RPC.

drop policy if exists "appointments_insert_public" on public.appointments;
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

drop policy if exists "page_views_insert_public" on public.page_views;
create policy "page_views_insert_public" on public.page_views
  for insert with check (
    exists (select 1 from public.businesses b where b.id = business_id)
  );

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
