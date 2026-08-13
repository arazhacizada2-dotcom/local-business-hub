import assert from "node:assert/strict";
import test from "node:test";
import { generateAvailableSlots } from "../lib/slots";
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

test("accepts IANA zones and rejects invalid zones", () => {
  assert.equal(isValidIanaTimeZone("Europe/Berlin"), true);
  assert.equal(isValidIanaTimeZone("Asia/Tokyo"), true);
  assert.equal(isValidIanaTimeZone("Not/AZone"), false);
});

test("converts Berlin local time correctly across standard and daylight time", () => {
  assert.equal(zonedTimeToUtc("2030-01-15", "09:00", "Europe/Berlin").toISOString(), "2030-01-15T08:00:00.000Z");
  assert.equal(zonedTimeToUtc("2030-07-15", "09:00", "Europe/Berlin").toISOString(), "2030-07-15T07:00:00.000Z");
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

test("DST spring-forward date retains the intended business-local opening hour", () => {
  const instant = zonedTimeToUtc("2030-03-31", "09:00", "Europe/Berlin");
  assert.equal(instant.toISOString(), "2030-03-31T07:00:00.000Z");
  assert.equal(formatInTimeZone(instant, "Europe/Berlin", { hour: "2-digit", minute: "2-digit" }), "09:00");
});

test("DST fall-back date retains the intended business-local opening hour", () => {
  const instant = zonedTimeToUtc("2030-10-27", "09:00", "Europe/Berlin");
  assert.equal(instant.toISOString(), "2030-10-27T08:00:00.000Z");
  assert.equal(formatInTimeZone(instant, "Europe/Berlin", { hour: "2-digit", minute: "2-digit" }), "09:00");
});

test("midnight boundaries stay on the intended business calendar date", () => {
  const justBeforeTokyoMidnight = new Date("2030-07-14T14:59:59.000Z");
  const justAfterTokyoMidnight = new Date("2030-07-14T15:00:01.000Z");
  assert.equal(formatDateISOInTimeZone(justBeforeTokyoMidnight, "Asia/Tokyo"), "2030-07-14");
  assert.equal(formatDateISOInTimeZone(justAfterTokyoMidnight, "Asia/Tokyo"), "2030-07-15");
});
