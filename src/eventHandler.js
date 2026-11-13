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

// "06:30  +0530  Your-Local-Time: (21:00) -0400"
function describeEvent(date, eventTimeZone) {
  const [eventTime, eventOffset] = timeAndOffset(date, eventTimeZone);
  const [localTime, localOffset] = timeAndOffset(date); // system time zone
  return `${eventTime}  ${eventOffset}  Your-Local-Time: (${localTime}) ${localOffset}`;
}
export { describeEvent, timeAndOffset };
