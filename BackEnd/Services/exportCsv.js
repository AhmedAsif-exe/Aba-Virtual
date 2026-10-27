// One supervisee's records as a CSV file: details, fieldwork hours,
// supervision meetings with notes, assignments with ratings, and monthly
// progress — one labelled section each, so it opens straight in Excel.
//
// Reading only: it works while the supervisor's pass has ended (§4.4).
// Supervisor-private notes are included only when `includePrivate`.

const User = require("../Schema/User");
const SupervisionBoard = require("../Schema/SupervisionBoard");
const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");
const SupervisionAssignment = require("../Schema/SupervisionAssignment");
const { buildMonthlyProgress } = require("./supervision");

/**
 * RFC 4180 quoting, plus a guard against spreadsheet formula injection: a
 * text cell starting with = + - @ or a control character is prefixed with
 * an apostrophe so Excel shows it rather than running it.
 */
function cell(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const row = (values) => values.map(cell).join(",");

const STATUS_LABELS = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

async function buildSuperviseeCsv(profile, { includePrivate = false } = {}) {
  const [user, board, hours, meetings, assignments, progress] = await Promise.all([
    User.findById(profile.userId).select("name email").lean(),
    SupervisionBoard.findById(profile.boardId).select("name fullName").lean(),
    WorkHoursEntry.find({ superviseeId: profile._id }).sort({ weekStartDate: 1 }).lean(),
    SupervisionMeeting.find({ superviseeId: profile._id }).sort({ date: 1 }).lean(),
    SupervisionAssignment.find({ superviseeId: profile._id }).sort({ createdAt: 1 }).lean(),
    buildMonthlyProgress(profile),
  ]);

  const lines = [];
  const section = (title, header, rows) => {
    if (lines.length) lines.push("");
    lines.push(row([title]));
    lines.push(row(header));
    for (const r of rows) lines.push(row(r));
  };

  const details = [
    ["Name", user?.name || ""],
    ["Email", user?.email || ""],
    ["Board", board ? [board.name, board.fullName].filter(Boolean).join(" — ") : ""],
    ["Required total hours", profile.requiredTotalHours],
    ["Supervision ratio", profile.supervisionRatio],
    ["Supervision start date", profile.supervisionStartDate],
    ["Status", profile.status],
    ["Archived", profile.archivedAt || "No"],
    ["Exported", new Date()],
  ];
  if (includePrivate) details.push(["Supervisor notes (private)", profile.supervisorNotes]);
  section("Supervisee", ["Field", "Value"], details);

  section(
    "Fieldwork hours",
    ["Week starting", "Hours", "Note"],
    hours.map((h) => [h.weekStartDate, h.hours, h.note]),
  );

  section(
    "Supervision meetings",
    ["Date", "Duration (minutes)", "Format", "Notes"],
    meetings.map((m) => [m.date, m.durationMinutes, m.format, m.notes]),
  );

  section(
    "Assignments",
    [
      "Type",
      "Title",
      "Description",
      "Due date",
      "Status",
      "Completed",
      "Rating (out of 10)",
      "Response",
      "Feedback",
      "Link",
      "Attached files",
    ],
    assignments.map((a) => [
      a.kind,
      a.title,
      a.description,
      a.dueDate,
      STATUS_LABELS[a.status] || a.status,
      a.completedAt,
      a.rating,
      a.response,
      a.feedback,
      a.link,
      (a.attachments || []).map((f) => f.originalName).join("; "),
    ]),
  );

  section(
    "Monthly progress",
    [
      "Month",
      "Fieldwork hours",
      "Supervision hours",
      "Individual supervision hours",
      "Group supervision hours",
      "Supervision %",
      "Cumulative fieldwork hours",
      "Cumulative supervision hours",
      "Assignments completed",
      "Average rating",
    ],
    progress.months.map((m) => [
      m.month,
      m.fieldworkHours,
      m.supervisionHours,
      m.individualHours,
      m.groupHours,
      m.supervisionPct,
      m.cumulativeFieldworkHours,
      m.cumulativeSupervisionHours,
      m.assignmentsCompleted,
      m.averageRating,
    ]),
  );

  // BOM so Excel reads UTF-8 (names, €); CRLF per RFC 4180.
  return { csv: `﻿${lines.join("\r\n")}\r\n`, name: user?.name || "supervisee" };
}

/** "supervision-sam-khan-2026-10-27.csv" */
function exportFileName(name, now = new Date()) {
  const slug =
    String(name)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "supervisee";
  return `supervision-${slug}-${now.toISOString().slice(0, 10)}.csv`;
}

module.exports = { buildSuperviseeCsv, exportFileName, cell };
