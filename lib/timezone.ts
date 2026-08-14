const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  let formatter = formatterCache.get(timeZone);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    formatterCache.set(timeZone, formatter);
  }

  return formatter;
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const parts = getFormatter(timeZone).formatToParts(date);
  const result: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== "literal") result[part.type] = Number(part.value);
  }

  return result;
}

/** Returns true only for a timezone recognized by the runtime's IANA database. */
export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone.trim()) return false;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

/** Converts a local calendar date/time in an IANA timezone into its UTC instant. */
export function zonedTimeToUtc(
  dateISO: string,
  time: string,
  timeZone: string
): Date {
  if (!isValidIanaTimeZone(timeZone)) {
    throw new Error(`Invalid IANA timezone: ${timeZone}`);
  }

  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

  // Correct for the timezone offset. The iterative approach also handles DST offsets.
  for (let i = 0; i < 3; i++) {
    const parts = getTimeZoneParts(utc, timeZone);
    const asIfUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const wanted = Date.UTC(year, month - 1, day, hour, minute, 0);
    utc = new Date(utc.getTime() + (wanted - asIfUtc));
  }

  return utc;
}

export function formatInTimeZone(
  date: Date | string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat([], {
    ...options,
    timeZone,
  }).format(new Date(date));
}

/** Returns the local YYYY-MM-DD calendar date for an instant in an IANA timezone. */
export function formatDateISOInTimeZone(date: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

/** Returns the start of a business-local calendar day as a UTC instant. */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const localDate = formatDateISOInTimeZone(date, timeZone);
  return zonedTimeToUtc(localDate, "00:00", timeZone);
}

/** Returns the start of the next business-local calendar day as a UTC instant. */
export function startOfNextDayInTimeZone(date: Date, timeZone: string): Date {
  const localDate = formatDateISOInTimeZone(date, timeZone);
  const [year, month, day] = localDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  const nextISO = next.toISOString().slice(0, 10);
  return zonedTimeToUtc(nextISO, "00:00", timeZone);
}
