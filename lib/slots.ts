import type { OpeningHours } from "@/types/database";
import { zonedTimeToUtc } from "@/lib/timezone";

export interface BookedRange {
  starts_at: string;
  ends_at: string;
}

const DAY_KEYS: (keyof OpeningHours)[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

/**
 * Generates available appointment slots using the BUSINESS timezone,
 * not the Vercel/server timezone.
 */
export function generateAvailableSlots(
  dateISO: string,
  openingHours: OpeningHours,
  durationMinutes: number,
  bookedRanges: BookedRange[],
  timeZone: string,
  slotIntervalMinutes = 15
): Date[] {
  // Determine weekday from the selected calendar date.
  const [year, month, day] = dateISO.split("-").map(Number);

  // Noon UTC avoids DST/date-boundary issues when determining weekday.
  const calendarDate = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  const dayKey = DAY_KEYS[calendarDate.getUTCDay()];
  const hours = openingHours[dayKey];

  if (!hours || hours.closed) return [];

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);

  const dayOpen = zonedTimeToUtc(
    dateISO,
    `${String(openH).padStart(2, "0")}:${String(openM).padStart(2, "0")}`,
    timeZone
  );

  const dayClose = zonedTimeToUtc(
    dateISO,
    `${String(closeH).padStart(2, "0")}:${String(closeM).padStart(2, "0")}`,
    timeZone
  );

  const now = Date.now();
  const slots: Date[] = [];

  for (
    let slotStart = new Date(dayOpen);
    slotStart.getTime() + durationMinutes * 60_000 <= dayClose.getTime();
    slotStart = new Date(
      slotStart.getTime() + slotIntervalMinutes * 60_000
    )
  ) {
    const slotEnd = new Date(
      slotStart.getTime() + durationMinutes * 60_000
    );

    // Never show slots that have already passed.
    if (slotStart.getTime() < now) continue;

    const overlaps = bookedRanges.some((range) => {
      const rangeStart = new Date(range.starts_at).getTime();
      const rangeEnd = new Date(range.ends_at).getTime();

      return (
        slotStart.getTime() < rangeEnd &&
        slotEnd.getTime() > rangeStart
      );
    });

    if (!overlaps) {
      slots.push(new Date(slotStart));
    }
  }

  return slots;
}
