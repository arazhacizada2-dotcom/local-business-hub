import type { OpeningHours } from "@/types/database";

export interface BookedRange {
  starts_at: string;
  ends_at: string;
}

const DAY_KEYS: (keyof OpeningHours)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Generates candidate start times (as Date objects, in 15-minute increments)
 * for a given calendar date, business opening hours and service duration,
 * excluding any that overlap an already-booked range or fall in the past.
 */
export function generateAvailableSlots(
  dateISO: string, // "YYYY-MM-DD"
  openingHours: OpeningHours,
  durationMinutes: number,
  bookedRanges: BookedRange[],
  slotIntervalMinutes = 15
): Date[] {
  const date = new Date(`${dateISO}T00:00:00`);
  const dayKey = DAY_KEYS[date.getDay()];
  const hours = openingHours[dayKey];

  if (!hours || hours.closed) return [];

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);

  const dayOpen = new Date(date);
  dayOpen.setHours(openH, openM, 0, 0);
  const dayClose = new Date(date);
  dayClose.setHours(closeH, closeM, 0, 0);

  const now = new Date();
  const slots: Date[] = [];

  for (
    let slotStart = new Date(dayOpen);
    slotStart.getTime() + durationMinutes * 60_000 <= dayClose.getTime();
    slotStart = new Date(slotStart.getTime() + slotIntervalMinutes * 60_000)
  ) {
    const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

    if (slotStart.getTime() < now.getTime()) continue;

    const overlaps = bookedRanges.some((range) => {
      const rangeStart = new Date(range.starts_at).getTime();
      const rangeEnd = new Date(range.ends_at).getTime();
      return slotStart.getTime() < rangeEnd && slotEnd.getTime() > rangeStart;
    });

    if (!overlaps) slots.push(new Date(slotStart));
  }

  return slots;
}
