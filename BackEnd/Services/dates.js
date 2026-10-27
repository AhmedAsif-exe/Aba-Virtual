// Dates in emails. Stored dates are UTC; a user's own timezone (saved from
// their browser) is used when we have it, otherwise the date is written in
// UTC and says so.

function isValidTimeZone(timeZone) {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "4 November 2026, 14:30 (Asia/Karachi)" or "4 November 2026, 09:30 UTC". */
function formatEmailDate(date, timeZone) {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const text = `${get("day")} ${get("month")} ${get("year")}, ${get("hour")}:${get("minute")}`;
  return zone === "UTC" ? `${text} UTC` : `${text} (${zone})`;
}

module.exports = { formatEmailDate, isValidTimeZone };
