// "HH:MM" and "+0530" for a Date in a time zone (undefined = the system's)
function timeAndOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  // "GMT+05:30" -> "+0530"; plain "GMT" means UTC -> "+0000"
  const offset =
    get("timeZoneName").replace("GMT", "").replace(":", "") || "+0000";
  return [`${get("hour")}:${get("minute")}`, offset];
}

// A tzid Intl can use, or undefined (empty, or a name it doesn't know)
function validTimeZone(tzid) {
  if (!tzid) return undefined;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tzid });
    return tzid;
  } catch {
    return undefined;
  }
}

// Label for a saved sunrise/sunset value.
//
// `value` is the ISO date-time nocturne-shift saves
// ("2026-09-25T06:52:10-04:00"); `tzid` is the location's time zone
// ("America/New_York"). Shows the time at the location, and adds this
// computer's local time only when its UTC offset differs at that moment:
//
//   "06:52"                                 same time zone
//   "06:30 +0530 | (21:00 -0400)" different time zone
//
// Returns null when there's nothing to show yet: the schema default
// ("sunrise"/"sunset") before the first fetch. Plain "HH:MM", saved by
// nocturne-shift before 0.7.1, is shown as it is.
function formatSunTime(value, tzid) {
  if (/^\d{2}:\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const [time, offset] = timeAndOffset(date, validTimeZone(tzid));
  const [localTime, localOffset] = timeAndOffset(date);

  if (offset === localOffset) return `${time}`;
  return `${time} ${offset} | (${localTime} ${localOffset})`;
}

export { formatSunTime };
