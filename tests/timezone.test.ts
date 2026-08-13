import assert from "node:assert/strict";
import test from "node:test";
import { generateAvailableSlots, isRequestedSlotAvailable } from "../lib/slots";
import {
  formatDateISOInTimeZone,
  formatInTimeZone,
  isValidIanaTimeZone,
  zonedTimeToUtc,
} from "../lib/timezone";

const OPENING_HOURS = {
  mon: { open: "09:00", close: "17:00", closed: false },
  tue: { open: "09:00", close: "17:00", closed: false },
  wed: { open: "09:00", close: "17:00", closed: false },
  thu: { open: "09:00", close: "17:00", closed: false },
  fri: { open: "09:00", close: "17:00", closed: false },
  sat: { open: "09:00", close: "17:00", closed: false },
  sun: { open: "09:00", close: "17:00", closed: false },
} as const;

test("accepts common IANA zones and rejects invalid zones", () => {
  assert.equal(isValidIanaTimeZone("Europe/Berlin"), true);
  assert.equal(isValidIanaTimeZone("Asia/Baku"), true);
  assert.equal(isValidIanaTimeZone("America/New_York"), true);
  assert.equal(isValidIanaTimeZone("Not/AZone"), false);
});

test("converts Berlin local time correctly across standard and daylight time", () => {
  assert.equal(zonedTimeToUtc("2030-01-15", "09:00", "Europe/Berlin").toISOString(), "2030-01-15T08:00:00.000Z");
  assert.equal(zonedTimeToUtc("2030-07-15", "09:00", "Europe/Berlin").toISOString(), "2030-07-15T07:00:00.000Z");
});

test("Baku and New York local opening times map to different instants", () => {
  assert.equal(zonedTimeToUtc("2030-07-15", "09:00", "Asia/Baku").toISOString(), "2030-07-15T05:00:00.000Z");
  assert.equal(zonedTimeToUtc("2030-07-15", "09:00", "America/New_York").toISOString(), "2030-07-15T13:00:00.000Z");
});

test("different businesses keep their local dates and slots isolated", () => {
  const instant = new Date("2030-07-15T08:00:00.000Z");
  assert.equal(formatDateISOInTimeZone(instant, "Europe/Berlin"), "2030-07-15");
  assert.equal(formatDateISOInTimeZone(instant, "America/New_York"), "2030-07-15");

  const berlinSlots = generateAvailableSlots(
    "2030-07-15",
    OPENING_HOURS,
    60,
    [],
    "Europe/Berlin",
    60
  );
  const newYorkSlots = generateAvailableSlots(
    "2030-07-15",
    OPENING_HOURS,
    60,
    [],
    "America/New_York",
    60
  );

  assert.equal(berlinSlots[0]?.toISOString(), "2030-07-15T07:00:00.000Z");
  assert.equal(newYorkSlots[0]?.toISOString(), "2030-07-15T13:00:00.000Z");
  assert.notEqual(berlinSlots[0]?.getTime(), newYorkSlots[0]?.getTime());
});

test("opening and closing boundaries produce only valid full-duration slots", () => {
  const hours = {
    ...OPENING_HOURS,
    mon: { open: "09:00", close: "11:00", closed: false },
  };
  const slots = generateAvailableSlots("2030-07-15", hours, 60, [], "Europe/Berlin", 60);
  assert.deepEqual(slots.map((slot) => slot.toISOString()), [
    "2030-07-15T07:00:00.000Z",
    "2030-07-15T08:00:00.000Z",
  ]);
});

test("closed days produce no slots", () => {
  const hours = {
    ...OPENING_HOURS,
    mon: { open: "09:00", close: "17:00", closed: true },
  };
  assert.deepEqual(generateAvailableSlots("2030-07-15", hours, 60, [], "Europe/Berlin", 60), []);
});

test("booking validation helper rejects an instant that is not a generated slot", () => {
  const slots = generateAvailableSlots("2030-07-15", OPENING_HOURS, 60, [], "Europe/Berlin", 60);
  assert.equal(isRequestedSlotAvailable(zonedTimeToUtc("2030-07-15", "09:00", "Europe/Berlin"), slots), true);
  assert.equal(isRequestedSlotAvailable(zonedTimeToUtc("2030-07-15", "09:30", "Europe/Berlin"), slots), false);
});

test("DST spring-forward retains intended opening hour and does not create duplicate instants", () => {
  const instant = zonedTimeToUtc("2030-03-31", "09:00", "Europe/Berlin");
  assert.equal(instant.toISOString(), "2030-03-31T07:00:00.000Z");
  assert.equal(formatInTimeZone(instant, "Europe/Berlin", { hour: "2-digit", minute: "2-digit" }), "09:00");

  const springHours = {
    ...OPENING_HOURS,
    sun: { open: "00:00", close: "05:00", closed: false },
  };
  const slots = generateAvailableSlots("2030-03-31", springHours, 30, [], "Europe/Berlin", 30);
  assert.equal(new Set(slots.map((slot) => slot.getTime())).size, slots.length);
});

test("DST fall-back retains intended opening hour and keeps slot instants unique", () => {
  const instant = zonedTimeToUtc("2030-10-27", "09:00", "Europe/Berlin");
  assert.equal(instant.toISOString(), "2030-10-27T08:00:00.000Z");
  assert.equal(formatInTimeZone(instant, "Europe/Berlin", { hour: "2-digit", minute: "2-digit" }), "09:00");

  const fallHours = {
    ...OPENING_HOURS,
    sun: { open: "00:00", close: "05:00", closed: false },
  };
  const slots = generateAvailableSlots("2030-10-27", fallHours, 30, [], "Europe/Berlin", 30);
  assert.equal(new Set(slots.map((slot) => slot.getTime())).size, slots.length);
});

test("midnight boundaries stay on the intended business calendar date", () => {
  const justBeforeTokyoMidnight = new Date("2030-07-14T14:59:59.000Z");
  const justAfterTokyoMidnight = new Date("2030-07-14T15:00:01.000Z");
  assert.equal(formatDateISOInTimeZone(justBeforeTokyoMidnight, "Asia/Tokyo"), "2030-07-14");
  assert.equal(formatDateISOInTimeZone(justAfterTokyoMidnight, "Asia/Tokyo"), "2030-07-15");
});
