-- H1: Enforce appointment duration from the linked service at the DB layer.
-- Client-supplied ends_at (including direct anon API inserts) cannot stretch
-- or shrink a booking beyond the active service's duration_minutes.

create or replace function public.enforce_appointment_duration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  dur integer;
begin
  -- Inserts always need a service to derive duration.
  -- Updates that clear service_id may only change non-time fields.
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

  -- Prefer active service matching the appointment business (public bookings).
  select s.duration_minutes into dur
  from public.services s
  where s.id = new.service_id
    and s.business_id = new.business_id
    and s.is_active = true;

  -- Owners may reschedule historical rows whose service was later deactivated.
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

  -- Overwrite any client-supplied ends_at.
  new.ends_at := new.starts_at + make_interval(mins => dur);

  return new;
end;
$$;

drop trigger if exists enforce_appointment_duration_trg on public.appointments;

create trigger enforce_appointment_duration_trg
  before insert or update on public.appointments
  for each row
  execute procedure public.enforce_appointment_duration();
