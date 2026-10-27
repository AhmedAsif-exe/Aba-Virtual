// Supervision records as CSV: details, fieldwork hours, supervision
// meetings with notes, assignments with ratings, and monthly progress — one
// labelled section each, so it opens straight in Excel.
//
//   buildSuperviseeCsv  one supervisee (supervisor, or the supervisee)
//   buildSupervisorCsv  every supervisee of one supervisor in one file; each
//                       row starts with the supervisee's name and email
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

/** Everything one supervisee's export needs. */
async function loadRecords(profile) {
  const [user, board, hours, meetings, assignments, progress] = await Promise.all([
    User.findById(profile.userId).select("name email").lean(),
    SupervisionBoard.findById(profile.boardId).select("name fullName").lean(),
    WorkHoursEntry.find({ superviseeId: profile._id }).sort({ weekStartDate: 1 }).lean(),
    SupervisionMeeting.find({ superviseeId: profile._id }).sort({ date: 1 }).lean(),
    SupervisionAssignment.find({ superviseeId: profile._id }).sort({ createdAt: 1 }).lean(),
    buildMonthlyProgress(profile),
  ]);
  return { profile, user, board, hours, meetings, assignments, progress };
}

const DETAIL_FIELDS = [
  ["Name", (r) => r.user?.name || ""],
  ["Email", (r) => r.user?.email || ""],
  ["Board", (r) => (r.board ? [r.board.name, r.board.fullName].filter(Boolean).join(" — ") : "")],
  ["Required total hours", (r) => r.profile.requiredTotalHours],
  ["Supervision ratio", (r) => r.profile.supervisionRatio],
  ["Supervision start date", (r) => r.profile.supervisionStartDate],
  ["Status", (r) => r.profile.status],
  ["Archived", (r) => r.profile.archivedAt || "No"],
];
const PRIVATE_NOTES = ["Supervisor notes (private)", (r) => r.profile.supervisorNotes];

const SECTIONS = [
  {
    title: "Fieldwork hours",
    header: ["Week starting", "Hours", "Note"],
    rows: (r) => r.hours.map((h) => [h.weekStartDate, h.hours, h.note]),
  },
  {
    title: "Supervision meetings",
    header: ["Date", "Duration (minutes)", "Format", "Notes"],
    rows: (r) => r.meetings.map((m) => [m.date, m.durationMinutes, m.format, m.notes]),
  },
  {
    title: "Assignments",
    header: [
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
    rows: (r) =>
      r.assignments.map((a) => [
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
  },
  {
    title: "Monthly progress",
    header: [
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
    rows: (r) =>
      r.progress.months.map((m) => [
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
  },
];

function writer() {
  const lines = [];
  return {
    section(title, header, rows) {
      if (lines.length) lines.push("");
      lines.push(row([title]));
      lines.push(row(header));
      for (const r of rows) lines.push(row(r));
    },
    // BOM so Excel reads UTF-8 (names, €); CRLF per RFC 4180.
    done: () => `﻿${lines.join("\r\n")}\r\n`,
  };
}

async function buildSuperviseeCsv(profile, { includePrivate = false } = {}) {
  const records = await loadRecords(profile);
  const out = writer();
  const details = [...DETAIL_FIELDS, ["Exported", () => new Date()]];
  if (includePrivate) details.push(PRIVATE_NOTES);
  out.section("Supervisee", ["Field", "Value"], details.map(([label, get]) => [label, get(records)]));
  for (const s of SECTIONS) out.section(s.title, s.header, s.rows(records));
  return { csv: out.done(), name: records.user?.name || "supervisee" };
}

/** All of a supervisor's supervisees (archived ones too), always with private notes. */
async function buildSupervisorCsv(profiles) {
  const all = await Promise.all(profiles.map(loadRecords));
  all.sort((a, b) => String(a.user?.name || "").localeCompare(String(b.user?.name || "")));
  const who = (r) => [r.user?.name || "", r.user?.email || ""];

  const out = writer();
  const details = [...DETAIL_FIELDS, PRIVATE_NOTES];
  out.section(
    "Supervisees",
    details.map(([label]) => label),
    all.map((r) => details.map(([, get]) => get(r))),
  );
  for (const s of SECTIONS) {
    out.section(
      s.title,
      ["Supervisee", "Email", ...s.header],
      all.flatMap((r) => s.rows(r).map((values) => [...who(r), ...values])),
    );
  }
  return { csv: out.done() };
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

module.exports = { buildSuperviseeCsv, buildSupervisorCsv, exportFileName, cell };
