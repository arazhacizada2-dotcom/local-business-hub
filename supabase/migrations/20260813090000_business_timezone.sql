-- Per-business IANA timezone support.
-- Existing businesses safely default to UTC until an owner selects their real timezone.

alter table public.businesses
  add column if not exists timezone text not null default 'UTC';

alter table public.businesses
  drop constraint if exists businesses_timezone_nonempty;

alter table public.businesses
  add constraint businesses_timezone_nonempty
  check (length(trim(timezone)) > 0);

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
  -- Status-only updates should not be rejected because historical bookings
  -- may legitimately sit outside today's opening hours.
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
  day_key := lower(to_char(local_start, 'Dy'));
  day_hours := opening -> day_key;

  if day_hours is null or coalesce((day_hours ->> 'closed')::boolean, false) then
    raise exception 'Appointment is outside business opening hours';
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
create trigger enforce_appointment_duration_trg
  before insert or update on public.appointments
  for each row
  execute procedure public.enforce_appointment_duration();

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
  timezone,
  opening_hours
from public.businesses;

revoke all on public.businesses_public from public;
grant select on public.businesses_public to anon, authenticated;

create or replace function public.get_booked_ranges(p_business_id uuid, p_day date)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
security definer
stable
set search_path = public
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
