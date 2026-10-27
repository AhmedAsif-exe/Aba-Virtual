// §4.5: Starter allows 3 active (unarchived) supervisees, enforced on invite
// and on restore. Archiving frees a slot and keeps every record.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { makeSupervisor, makeSupervisee, makeBoard } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const WorkHoursEntry = require("../Schema/WorkHoursEntry");

const app = buildApp({ "/supervision": supervisionRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

const STARTER_LIMIT =
  "Starter includes up to 3 supervisees. Upgrade to Professional for unlimited supervisees.";

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

let inviteCount = 0;
async function invite(supervisor) {
  const board = await makeBoard();
  return request(app)
    .post("/supervision/supervisees")
    .set(as(supervisor))
    .send({
      name: "New Supervisee",
      email: `invite${++inviteCount}@example.test`,
      boardId: String(board._id),
      requiredTotalHours: 1500,
      supervisionStartDate: "2026-10-01",
    });
}

const archive = (supervisor, profile) =>
  request(app).post(`/supervision/supervisees/${profile._id}/archive`).set(as(supervisor));
const restore = (supervisor, profile) =>
  request(app).post(`/supervision/supervisees/${profile._id}/restore`).set(as(supervisor));

describe("Starter limit", () => {
  test("the 4th invite is blocked with the spec's message", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    for (let i = 0; i < 3; i++) assert.strictEqual((await invite(supervisor)).status, 201);

    const fourth = await invite(supervisor);
    assert.strictEqual(fourth.status, 403);
    assert.strictEqual(fourth.body.message, STARTER_LIMIT);
    assert.strictEqual(fourth.body.upgradeRequired, "max_active_supervisees");
    assert.strictEqual(await SuperviseeProfile.countDocuments(), 3);
  });

  test("Professional has no limit", async () => {
    const supervisor = await makeSupervisor({ planKey: "professional" });
    for (let i = 0; i < 3; i++) await makeSupervisee(supervisor);
    assert.strictEqual((await invite(supervisor)).status, 201);
  });

  test("archived supervisees don't count, and paused ones do", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    await makeSupervisee(supervisor, { status: "paused" });
    await makeSupervisee(supervisor);
    await makeSupervisee(supervisor, { archivedAt: new Date() });
    assert.strictEqual((await invite(supervisor)).status, 201); // 2 active → 3
    assert.strictEqual((await invite(supervisor)).status, 403);
  });
});

describe("archive and restore", () => {
  test("archiving frees a slot and keeps every record", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    const profiles = [];
    for (let i = 0; i < 3; i++) profiles.push((await makeSupervisee(supervisor)).profile);
    await WorkHoursEntry.create({
      superviseeId: profiles[0]._id,
      weekStartDate: new Date("2026-10-05"),
      hours: 12,
      createdBy: supervisor._id,
    });
    assert.strictEqual((await invite(supervisor)).status, 403);

    const res = await archive(supervisor, profiles[0]);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.supervisee.archivedAt);
    assert.strictEqual(await WorkHoursEntry.countDocuments({ superviseeId: profiles[0]._id }), 1);

    assert.strictEqual((await invite(supervisor)).status, 201);
  });

  test("restore works when a slot is free and is blocked when not", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    const { profile: archived } = await makeSupervisee(supervisor, { archivedAt: new Date() });
    await makeSupervisee(supervisor);
    await makeSupervisee(supervisor);

    // 2 active: a slot is free.
    const ok = await restore(supervisor, archived);
    assert.strictEqual(ok.status, 200);
    assert.strictEqual(ok.body.supervisee.archivedAt, null);

    // 3 active: archive one, fill the slot, then restore is blocked.
    await archive(supervisor, archived);
    await makeSupervisee(supervisor);
    const blocked = await restore(supervisor, archived);
    assert.strictEqual(blocked.status, 403);
    assert.strictEqual(blocked.body.message, STARTER_LIMIT);
    assert.ok((await SuperviseeProfile.findById(archived._id)).archivedAt);
  });

  test("restoring someone already active changes nothing and takes no slot", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    const profiles = [];
    for (let i = 0; i < 3; i++) profiles.push((await makeSupervisee(supervisor)).profile);
    const res = await restore(supervisor, profiles[0]);
    assert.strictEqual(res.status, 200);
  });

  test("a supervisor can't archive someone else's supervisee", async () => {
    const owner = await makeSupervisor();
    const other = await makeSupervisor();
    const { profile } = await makeSupervisee(owner);
    assert.strictEqual((await archive(other, profile)).status, 404);
  });

  test("an archived supervisee can view but not log hours", async () => {
    const supervisor = await makeSupervisor();
    const { user } = await makeSupervisee(supervisor, { archivedAt: new Date() });
    assert.strictEqual((await request(app).get("/supervision/me/hours").set(as(user))).status, 200);
    const log = await request(app)
      .post("/supervision/me/hours")
      .set(as(user))
      .send({ weekStartDate: "2026-10-05", hours: 10 });
    assert.strictEqual(log.status, 403);
    assert.strictEqual(
      log.body.message,
      "Your supervisor has archived your record. You can still view your records. Contact your supervisor if this is a mistake.",
    );
  });
});
