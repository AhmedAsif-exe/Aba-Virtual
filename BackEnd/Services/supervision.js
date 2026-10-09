// Shared supervision arithmetic: week bucketing and the dashboard totals.
//
// The two running totals are computed on read rather than stored as counters
// on the profile. A supervisee generates on the order of fifty week rows and
// fifty meetings a year, so the aggregation is cheap — and a stored counter
// that drifts after an edit or a delete is a genuine problem in a system
// whose whole purpose is an hour count a certifying board will rely on.

const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");
const SupervisionAssignment = require("../Schema/SupervisionAssignment");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Snap a date to 00:00 UTC on the Monday of its week.
 *
 * Every week entry goes through this, which is what makes the unique index
 * on (superviseeId, weekStartDate) meaningful: without it "the week of the
 * 3rd" logged from two different timezones would be two different Dates and
 * both would be accepted.
 */
function normalizeWeekStart(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  // getUTCDay: 0 = Sunday. Shift so Monday is the start of the week.
  const dayOffset = (new Date(utc).getUTCDay() + 6) % 7;
  return new Date(utc - dayOffset * MS_PER_DAY);
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * The figures at the top of a supervisee's dashboard.
 *
 * Note what is deliberately absent: any judgement about whether the
 * supervision provided satisfies the board's ratio. Boards define it
 * differently, the supervisor tracks it herself, and a confidently wrong
 * compliance number here would be worse than no number at all.
 */
async function buildSummary(profile) {
  const [worked, supervised] = await Promise.all([
    WorkHoursEntry.aggregate([
      { $match: { superviseeId: profile._id } },
      { $group: { _id: null, hours: { $sum: "$hours" }, weeks: { $sum: 1 } } },
    ]),
    SupervisionMeeting.aggregate([
      { $match: { superviseeId: profile._id } },
      {
        $group: {
          _id: null,
          minutes: { $sum: "$durationMinutes" },
          meetings: { $sum: 1 },
          lastMeetingDate: { $max: "$date" },
        },
      },
    ]),
  ]);

  const totalHoursWorked = round2(worked[0]?.hours || 0);
  const totalSupervisionHours = round2((supervised[0]?.minutes || 0) / 60);
  const required = profile.requiredTotalHours || 0;

  return {
    totalHoursWorked,
    totalSupervisionHours,
    requiredTotalHours: required,
    remainingHours: round2(Math.max(required - totalHoursWorked, 0)),
    weeksLogged: worked[0]?.weeks || 0,
    meetingCount: supervised[0]?.meetings || 0,
    lastMeetingDate: supervised[0]?.lastMeetingDate || null,
    supervisionRatio: profile.supervisionRatio || "",
  };
}

/* ------------------------------------------------------------------ *
 * Monthly progress — the series behind the dashboard charts
 * ------------------------------------------------------------------ */

// Ten years of months. Only a typo'd far-future week could push past it,
// and that should not turn into a ten-thousand-row response.
const MAX_MONTHS = 120;

const monthIndex = (date) => date.getUTCFullYear() * 12 + date.getUTCMonth();
const monthKey = (index) =>
  `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;

/**
 * One row per calendar month (UTC), from the month supervision started (or
 * the earliest record, if earlier) through the current month, empty months
 * included so the chart's x-axis is continuous.
 *
 * A week of hours counts in the month its Monday falls in — the same week
 * key the hours log already files it under, so a week is never split or
 * counted twice. Supervision % is null for a month with no fieldwork rather
 * than 0 or infinity: there is nothing to divide by.
 */
async function buildMonthlyProgress(profile) {
  const match = { superviseeId: profile._id };

  const [weeks, meetings, completed, rated] = await Promise.all([
    WorkHoursEntry.find(match).select("weekStartDate hours").lean(),
    SupervisionMeeting.find(match).select("date durationMinutes format").lean(),
    SupervisionAssignment.find({ ...match, status: "completed" })
      .select("completedAt updatedAt")
      .lean(),
    SupervisionAssignment.find({ ...match, rating: { $ne: null } })
      .select("rating ratedAt updatedAt")
      .lean(),
  ]);

  const dated = [
    ...weeks.map((w) => ({ at: new Date(w.weekStartDate), kind: "hours", value: w.hours })),
    ...meetings.map((m) => ({
      at: new Date(m.date),
      kind: m.format === "group" ? "group" : "individual",
      value: m.durationMinutes / 60,
    })),
    // updatedAt covers anything completed before completedAt existed.
    ...completed.map((a) => ({ at: new Date(a.completedAt || a.updatedAt), kind: "done", value: 1 })),
    // Scores count in the month they were given.
    ...rated.map((a) => ({ at: new Date(a.ratedAt || a.updatedAt), kind: "rating", value: a.rating })),
  ].filter((r) => !Number.isNaN(r.at.getTime()));

  const now = monthIndex(new Date());
  const starts = dated.map((r) => monthIndex(r.at));
  if (profile.supervisionStartDate) starts.push(monthIndex(new Date(profile.supervisionStartDate)));
  let first = starts.length ? Math.min(...starts) : now;
  const last = Math.max(now, ...starts);
  first = Math.max(first, last - MAX_MONTHS + 1);

  const rows = new Map();
  for (let i = first; i <= last; i += 1) {
    rows.set(i, { fieldwork: 0, individual: 0, group: 0, done: 0, ratingSum: 0, ratingCount: 0 });
  }
  for (const r of dated) {
    const row = rows.get(monthIndex(r.at));
    if (!row) continue; // before the capped window
    if (r.kind === "hours") row.fieldwork += r.value;
    else if (r.kind === "done") row.done += r.value;
    else if (r.kind === "rating") {
      row.ratingSum += r.value;
      row.ratingCount += 1;
    }
    else row[r.kind] += r.value;
  }

  let cumulativeSupervision = 0;
  let cumulativeFieldwork = 0;
  const months = [];
  for (const [index, row] of rows) {
    const supervision = row.individual + row.group;
    cumulativeSupervision += supervision;
    cumulativeFieldwork += row.fieldwork;
    months.push({
      month: monthKey(index),
      fieldworkHours: round2(row.fieldwork),
      supervisionHours: round2(supervision),
      individualHours: round2(row.individual),
      groupHours: round2(row.group),
      supervisionPct: row.fieldwork > 0 ? Math.round((supervision / row.fieldwork) * 1000) / 10 : null,
      cumulativeSupervisionHours: round2(cumulativeSupervision),
      cumulativeFieldworkHours: round2(cumulativeFieldwork),
      assignmentsCompleted: row.done,
      // Mean of the 1-10 scores given that month; null when none were.
      averageRating: row.ratingCount ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10 : null,
    });
  }

  return { months };
}

module.exports = { normalizeWeekStart, buildSummary, buildMonthlyProgress, round2 };
