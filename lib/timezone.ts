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
    if (part.type !== "literal") {
      result[part.type] = Number(part.value);
    }
  }

  return result;
}

/**
 * Converts a local calendar date/time in a named IANA timezone
 * into the corresponding UTC Date.
 *
 * Example:
 * Europe/Berlin 2026-08-10 09:00
 * -> 2026-08-10T07:00:00.000Z
 */
export function zonedTimeToUtc(
  dateISO: string,
  time: string,
  timeZone: string
): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  // Initial approximation.
  let utc = new Date(
    Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  );

  // Correct for the timezone offset.
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

    const wanted = Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0
    );

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
