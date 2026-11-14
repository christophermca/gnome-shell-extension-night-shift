// Formatting for the sunrise/sunset menu items. No gi:// imports, so this
// file runs in plain Node too: `make test`.

// UTC offset as "+0530" / "-0400" / "+0000". Always worked out in English:
// other locales write it as "UTC+05:30", "UTC−04:00" (Unicode minus) or in
// their own script, which the replace() calls below don't expect.
function utcOffset(date, timeZone) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName").value;
  // "GMT+05:30" -> "+0530"; plain "GMT" means UTC -> "+0000"
  return name.replace("GMT", "").replace(":", "") || "+0000";
}

const HOUR_CYCLES = ["h11", "h12", "h23", "h24"];

// The hour cycle to use for the `time-format` setting. "system" follows
// GNOME's clock setting (org.gnome.desktop.interface clock-format), which
// is "12h" or "24h"; anything unexpected falls back to 24-hour like GNOME.
function resolveHourCycle(timeFormat, clockFormat) {
  if (HOUR_CYCLES.includes(timeFormat)) return timeFormat;
  return clockFormat === "12h" ? "h12" : "h23";
}

// The calendar day of `date` in `timeZone` (undefined = this computer's), as
// "2026-09-25". Built from parts so it doesn't depend on any locale's format.
function calendarDay(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// How many calendar days this computer's date is from the location's date at
// the same moment: -1 when it's still the day before here, +1 the day after.
// calendarDay() strings parse as UTC midnight, so the difference is whole days.
function dayDifference(date, timeZone) {
  const ms =
    Date.parse(calendarDay(date, undefined)) -
    Date.parse(calendarDay(date, timeZone));
  return Math.round(ms / 86_400_000);
}

// A tzid Intl can use, or undefined (empty, or a name it doesn't know)
function validTimeZone(tzid) {
  if (!tzid) return undefined;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tzid });
    return tzid;
  } catch {
    return undefined;
  }
}

// Labels for saved sunrise/sunset values, in the hour cycle chosen in
// preferences (the `time-format` setting):
//
//   h11  12-hour, 0-11  ("0:15 AM", "6:51 PM")
//   h12  12-hour, 1-12  ("12:15 AM", "6:51 PM")
//   h23  24-hour, 0-23  ("00:15", "18:51")
//   h24  24-hour, 1-24  ("24:15", "18:51")
//
// `locale` is for the tests; leave it out to use the user's language, which
// decides how AM/PM is written ("PM", "pm", "nachm.", ...).
class FormatSunTime {
  constructor(timeFormat, locale = undefined) {
    this.timeFormat = timeFormat;
    this.locale = locale;
  }

  // "6:51 PM" or "18:51" for `date` in `timeZone` (undefined = this
  // computer's). format() keeps the AM/PM part, which a 12-hour time needs.
  _time(date, timeZone) {
    return new Intl.DateTimeFormat(this.locale, {
      timeZone,
      hour: ["h11", "h12"].includes(this.timeFormat) ? "numeric" : "2-digit",
      minute: "2-digit",
      hourCycle: this.timeFormat,
    }).format(date);
  }

  // Label for one saved value.
  //
  // `value` is the ISO date-time nocturne-shift saves
  // ("2026-09-25T06:52:10-04:00"); `tzid` is the location's time zone
  // ("America/New_York"). Shows the time at the location, and adds this
  // computer's local time only when its UTC offset differs at that moment:
  //
  //   "6:52 AM"                             same time zone
  //   "6:30 AM +0530 | (9:00 PM -0400)"    different time zone
  //   "6:30 AM +0530 | (9:00 PM -0400 -1 day)"  ...and the day before there
  //
  // Returns null when there's nothing to show yet: the schema default
  // ("sunrise"/"sunset") before the first fetch. Plain "HH:MM", saved by
  // nocturne-shift before 0.7.1, is shown as it is.
  formatSunTime(value, tzid) {
    if (/^\d{2}:\d{2}$/.test(value)) return value;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const zone = validTimeZone(tzid);
    const offset = utcOffset(date, zone);
    const localOffset = utcOffset(date, undefined);

    const time = this._time(date, zone);
    if (offset === localOffset) return time;

    // Converting to local time can cross midnight: Kolkata's sunrise is
    // the evening before in New York. Mark that like flight times do.
    let local = `${this._time(date, undefined)} ${localOffset}`;
    const days = dayDifference(date, zone);
    if (days !== 0) {
      const sign = days > 0 ? "+" : "-";
      const unit = Math.abs(days) === 1 ? "day" : "days";
      local += ` ${sign}${Math.abs(days)} ${unit}`;
    }
    return `${time} ${offset} | (${local})`;
  }
}

export { FormatSunTime, resolveHourCycle };
