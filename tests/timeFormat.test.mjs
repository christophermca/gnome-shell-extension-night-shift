// Run with a fixed computer time zone: `make test`, or
//   TZ=America/New_York node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveHourCycle, FormatSunTime } from "../src/timeFormat.js";

assert.equal(
  process.env.TZ,
  "America/New_York",
  "run these tests with TZ=America/New_York",
);

// "en-US" so the expected text doesn't depend on the machine's language
const h12 = new FormatSunTime("h12", "en-US");
const h23 = new FormatSunTime("h23", "en-US");

const NEW_YORK_SUNRISE = "2026-09-25T06:52:10-04:00";
const NEW_YORK_SUNSET = "2026-09-25T18:51:30-04:00";
const NEW_YORK_00_15 = "2026-09-25T00:15:00-04:00";

test("each time format gives its own hour cycle", () => {
  const cases = {
    h11: ["6:51 PM", "0:15 AM"],
    h12: ["06:51 PM", "12:15 AM"],
    h23: ["18:51", "00:15"],
    h24: ["18:51", "24:15"],
  };
  for (const [format, [sunset, afterMidnight]] of Object.entries(cases)) {
    const formatter = new FormatSunTime(format, "en-US");
    assert.equal(
      formatter.formatSunTime(NEW_YORK_SUNSET, "America/New_York"),
      sunset,
      format,
    );
    assert.equal(
      formatter.formatSunTime(NEW_YORK_00_15, "America/New_York"),
      afterMidnight,
      format,
    );
  }
});

test("same time zone shows only the location's time", () => {
  assert.equal(
    h23.formatSunTime(NEW_YORK_SUNRISE, "America/New_York"),
    "06:52",
  );
  assert.equal(
    h12.formatSunTime(NEW_YORK_SUNRISE, "America/New_York"),
    "06:52 AM",
  );
});

test("another zone with the same offset counts as the same", () => {
  assert.equal(h23.formatSunTime(NEW_YORK_SUNRISE, "America/Detroit"), "06:52");
});

test("different time zone adds the local time", () => {
  const kolkata = "2026-09-25T06:30:00+05:30";
  assert.equal(
    h23.formatSunTime(kolkata, "Asia/Kolkata"),
    "06:30 +0530 | (21:00 -0400 -1 day)",
  );
  assert.equal(
    h12.formatSunTime(kolkata, "Asia/Kolkata"),
    "06:30 AM +0530 | (09:00 PM -0400 -1 day)",
  );
});

test("the offsets follow daylight saving time", () => {
  assert.equal(
    h23.formatSunTime("2026-01-15T08:06:00+00:00", "Europe/London"),
    "08:06 +0000 | (03:06 -0500)",
  );
});

test("offsets stay +0530 / -0400 in other languages", () => {
  const french = new FormatSunTime("h23", "fr-FR");
  assert.equal(
    french.formatSunTime("2026-09-25T06:30:00+05:30", "Asia/Kolkata"),
    "06:30 +0530 | (21:00 -0400 -1 day)",
  );
});

test("an empty or unknown tzid falls back to this computer's zone", () => {
  assert.equal(h23.formatSunTime(NEW_YORK_SUNRISE, ""), "06:52");
  assert.equal(h23.formatSunTime(NEW_YORK_SUNRISE, "Not/AZone"), "06:52");
});

test("the schema default before the first fetch gives null", () => {
  assert.equal(h23.formatSunTime("sunrise", ""), null);
  assert.equal(h23.formatSunTime("", ""), null);
});

test("old HH:MM values are shown as they are", () => {
  assert.equal(h23.formatSunTime("06:52", "America/New_York"), "06:52");
});

test('"system" follows GNOME\'s 12h/24h clock setting', () => {
  assert.equal(resolveHourCycle("system", "12h"), "h12");
  assert.equal(resolveHourCycle("system", "24h"), "h23");
  // unknown or missing clock-format: 24-hour, GNOME's default
  assert.equal(resolveHourCycle("system", ""), "h23");
});

test("an explicit choice ignores GNOME's clock setting", () => {
  for (const cycle of ["h11", "h12", "h23", "h24"]) {
    assert.equal(resolveHourCycle(cycle, "12h"), cycle);
    assert.equal(resolveHourCycle(cycle, "24h"), cycle);
  }
});

test('"system" with a 12h clock shows AM/PM', () => {
  const formatter = new FormatSunTime(
    resolveHourCycle("system", "12h"),
    "en-US",
  );
  assert.equal(
    formatter.formatSunTime(NEW_YORK_SUNSET, "America/New_York"),
    "06:51 PM",
  );
});

test("a day marker is added when the local day is different", () => {
  // 06:30 Fri 25 Sep in Kolkata is 21:00 Thu 24 Sep in New York
  assert.equal(
    h12.formatSunTime("2026-09-25T06:30:00+05:30", "Asia/Kolkata"),
    "06:30 AM +0530 | (09:00 PM -0400 -1 day)",
  );
  // 18:30 Fri 25 Sep in Honolulu is 00:30 Sat 26 Sep in New York
  assert.equal(
    h23.formatSunTime("2026-09-25T18:30:00-10:00", "Pacific/Honolulu"),
    "18:30 -1000 | (00:30 -0400 +1 day)",
  );
});

test("no day marker when the local time is on the same day", () => {
  // 06:55 in London is 01:55 the same day in New York
  assert.equal(
    h23.formatSunTime("2026-09-25T06:55:00+01:00", "Europe/London"),
    "06:55 +0100 | (01:55 -0400)",
  );
});

test("a difference of more than one day says days", () => {
  // 00:30 Sat 26 Sep in Kiritimati (UTC+14) is 23:30 Thu 24 Sep in
  // Pago Pago (UTC-11): two calendar days apart
  process.env.TZ = "Pacific/Pago_Pago";
  try {
    assert.equal(
      h23.formatSunTime("2026-09-26T00:30:00+14:00", "Pacific/Kiritimati"),
      "00:30 +1400 | (23:30 -1100 -2 days)",
    );
  } finally {
    process.env.TZ = "America/New_York";
  }
});
