// CSV export (decision 14): hours, meetings with notes, assignments with
// ratings, monthly progress. Supervisor (also while read-only) and the
// supervisee for their own records.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");
const SupervisionAssignment = require("../Schema/SupervisionAssignment");
const { cell } = require("../Services/exportCsv");

const app = buildApp({ "/supervision": supervisionRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

async function seed({ supervisorFields, profileFields } = {}) {
  const supervisor = await makeSupervisor(supervisorFields);
  const { user, profile } = await makeSupervisee(supervisor, {
    supervisorNotes: "PRIVATE: discuss pacing",
    ...profileFields,
  });
  await WorkHoursEntry.create({
    superviseeId: profile._id,
    weekStartDate: new Date("2026-10-05"),
    hours: 12.5,
    note: "Clinic, then home visits",
    createdBy: user._id,
  });
  await SupervisionMeeting.create({
    superviseeId: profile._id,
    date: new Date("2026-10-08"),
    durationMinutes: 60,
    format: "individual",
    notes: 'Reviewed "task analysis", next: DTT',
    createdBy: supervisor._id,
  });
  await SupervisionAssignment.create({
    superviseeId: profile._id,
    kind: "presentation",
    title: "Present a case",
    status: "completed",
    completedAt: new Date("2026-10-20"),
    rating: 8,
    ratedAt: new Date("2026-10-21"),
    createdBy: supervisor._id,
  });
  return { supervisor, user, profile };
}

const download = (path, user) => request(app).get(path).set(as(user)).buffer(true).parse((res, cb) => {
  let text = "";
  res.setEncoding("utf8");
  res.on("data", (chunk) => (text += chunk));
  res.on("end", () => cb(null, text));
});

describe("supervisor export", () => {
  test("works while read-only, with every section and the private notes", async () => {
    const { supervisor, profile } = await seed({ supervisorFields: { expiresAt: daysFromNow(-10) } });
    const res = await download(`/supervision/supervisees/${profile._id}/export.csv`, supervisor);

    assert.strictEqual(res.status, 200);
    assert.match(res.headers["content-type"], /text\/csv/);
    assert.match(res.headers["content-disposition"], /attachment; filename="supervision-supervisee-\d{4}-\d{2}-\d{2}\.csv"/);
    const csv = res.body;
    assert.ok(csv.startsWith("﻿"));
    for (const heading of ["Supervisee", "Fieldwork hours", "Supervision meetings", "Assignments", "Monthly progress"]) {
      assert.ok(csv.includes(`\r\n${heading}\r\n`) || csv.startsWith(`﻿${heading}\r\n`), heading);
    }
    assert.ok(csv.includes("2026-10-05,12.5,\"Clinic, then home visits\""));
    assert.ok(csv.includes('2026-10-08,60,individual,"Reviewed ""task analysis"", next: DTT"'));
    assert.ok(csv.includes("presentation,Present a case,,,Completed,2026-10-20,8,"));
    assert.ok(csv.includes("2026-10,12.5,1,1,0,8,12.5,1,1,8"));
    assert.ok(csv.includes("PRIVATE: discuss pacing"));
  });

  test("another supervisor can't export someone else's supervisee", async () => {
    const { profile } = await seed();
    const other = await makeSupervisor();
    assert.strictEqual((await request(app).get(`/supervision/supervisees/${profile._id}/export.csv`).set(as(other))).status, 404);
  });
});

describe("supervisee export", () => {
  test("their own records, without the supervisor's private notes, even archived and with the plan ended", async () => {
    const { user } = await seed({
      supervisorFields: { expiresAt: daysFromNow(-10) },
      profileFields: { archivedAt: new Date() },
    });
    const res = await download("/supervision/me/export.csv", user);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes("Reviewed")); // meeting notes, as on their dashboard
    assert.ok(!res.body.includes("PRIVATE"));
    assert.ok(!res.body.includes("Supervisor notes"));
  });
});

test("cells are quoted and can't run as spreadsheet formulas", () => {
  assert.strictEqual(cell("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
  assert.strictEqual(cell("+1 call"), "'+1 call");
  assert.strictEqual(cell("-"), "'-");
  assert.strictEqual(cell("a,b"), '"a,b"');
  assert.strictEqual(cell("line\nbreak"), '"line\nbreak"');
  assert.strictEqual(cell(-3), "-3"); // numbers stay numbers
  assert.strictEqual(cell(null), "");
});
