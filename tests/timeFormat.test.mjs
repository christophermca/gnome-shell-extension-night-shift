// Run with a fixed computer time zone, e.g.:
//   TZ=America/New_York node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatSunTime } from "../src/timeFormat.js";

assert.equal(
  process.env.TZ,
  "America/New_York",
  "run these tests with TZ=America/New_York",
);

const NEW_YORK_SUNRISE = "2026-09-25T06:52:10-04:00";

test("same time zone shows only the location's time", () => {
  assert.equal(
    formatSunTime(NEW_YORK_SUNRISE, "America/New_York"),
    "06:52  -0400",
  );
});

test("another zone with the same offset counts as the same", () => {
  assert.equal(
    formatSunTime(NEW_YORK_SUNRISE, "America/Detroit"),
    "06:52  -0400",
  );
});

test("different time zone adds the local time", () => {
  assert.equal(
    formatSunTime("2026-09-25T06:30:00+05:30", "Asia/Kolkata"),
    "06:30  +0530  Your-Local-Time: (21:00) -0400",
  );
});

test("the offsets follow daylight saving time", () => {
  assert.equal(
    formatSunTime("2026-01-15T08:06:00+00:00", "Europe/London"),
    "08:06  +0000  Your-Local-Time: (03:06) -0500",
  );
});

test("an empty or unknown tzid falls back to this computer's zone", () => {
  assert.equal(formatSunTime(NEW_YORK_SUNRISE, ""), "06:52  -0400");
  assert.equal(formatSunTime(NEW_YORK_SUNRISE, "Not/AZone"), "06:52  -0400");
});

test("the schema default before the first fetch gives null", () => {
  assert.equal(formatSunTime("sunrise", ""), null);
  assert.equal(formatSunTime("", ""), null);
});

test("old HH:MM values are shown as they are", () => {
  assert.equal(formatSunTime("06:52", "America/New_York"), "06:52");
});
