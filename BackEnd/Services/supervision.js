// Shared supervision arithmetic: week bucketing and the dashboard totals.
//
// The two running totals are computed on read rather than stored as counters
// on the profile. A supervisee generates on the order of fifty week rows and
// fifty meetings a year, so the aggregation is cheap — and a stored counter
// that drifts after an edit or a delete is a genuine problem in a system
// whose whole purpose is an hour count a certifying board will rely on.

const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");

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

module.exports = { normalizeWeekStart, buildSummary, round2 };
