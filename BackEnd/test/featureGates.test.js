// §3 and decisions 5 and 7: view-only sharing and payment tracking need a
// plan that includes them. Data is kept when a plan doesn't, and shared
// viewers keep read access after the owner's pass ends.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const SupervisionPayment = require("../Schema/SupervisionPayment");
const SupervisionShare = require("../Schema/SupervisionShare");
const User = require("../Schema/User");

const app = buildApp({ "/supervision": supervisionRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

const recordPayment = (profile) =>
  SupervisionPayment.create({ superviseeId: profile._id, month: "2026-10", status: "paid" });

describe("payment tracking", () => {
  test("Starter can't read or mark payments", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    const { profile } = await makeSupervisee(supervisor);
    const base = `/supervision/supervisees/${profile._id}/payments`;

    const read = await request(app).get(base).set(as(supervisor));
    assert.strictEqual(read.status, 403);
    assert.strictEqual(read.body.upgradeRequired, "payment_tracking");
    assert.strictEqual(read.body.message, "This feature isn't included in your plan. Upgrade to use it.");

    const mark = await request(app).put(`${base}/2026-10`).set(as(supervisor)).send({ status: "paid" });
    assert.strictEqual(mark.status, 403);
  });

  test("Professional can mark a payment as paid", async () => {
    const supervisor = await makeSupervisor({ planKey: "professional" });
    const { profile } = await makeSupervisee(supervisor);
    const res = await request(app)
      .put(`/supervision/supervisees/${profile._id}/payments/2026-10`)
      .set(as(supervisor))
      .send({ status: "paid" });
    assert.strictEqual(res.status, 200);
  });

  test("a downgrade to Starter hides payments without deleting them, and an upgrade brings them back", async () => {
    const supervisor = await makeSupervisor({ planKey: "starter" });
    const { user, profile } = await makeSupervisee(supervisor);
    await recordPayment(profile);

    const roster = await request(app).get("/supervision/supervisees").set(as(supervisor));
    assert.deepStrictEqual(roster.body.supervisees[0].payment, { thisMonth: null, unpaidMonths: [] });
    const mine = await request(app).get("/supervision/me/payments").set(as(user));
    assert.strictEqual(mine.status, 200);
    assert.deepStrictEqual(mine.body.payments, []);
    assert.strictEqual(await SupervisionPayment.countDocuments(), 1);

    supervisor.supervisionPlan.planKey = "professional";
    await supervisor.save();
    const back = await request(app).get("/supervision/me/payments").set(as(user));
    assert.strictEqual(back.body.payments.length, 1);
  });
});

describe("view-only sharing", () => {
  test("Starter can't share; Professional can", async () => {
    const starter = await makeSupervisor({ planKey: "starter" });
    const blocked = await request(app).post("/supervision/shares").set(as(starter)).send({ email: "v@example.test" });
    assert.strictEqual(blocked.status, 403);
    assert.strictEqual(blocked.body.upgradeRequired, "view_only_sharing");

    const pro = await makeSupervisor({ planKey: "professional" });
    const shared = await request(app).post("/supervision/shares").set(as(pro)).send({ email: "v@example.test" });
    assert.strictEqual(shared.status, 201);
  });

  async function sharedSetup(ownerFields) {
    const owner = await makeSupervisor(ownerFields);
    await makeSupervisee(owner);
    const viewer = await User.create({ email: "viewer@example.test", name: "Viewer" });
    await SupervisionShare.create({ supervisorId: owner._id, email: viewer.email });
    return { owner, viewer };
  }

  test("viewers keep read access after the owner's pass ends", async () => {
    const { owner, viewer } = await sharedSetup({ planKey: "professional", expiresAt: daysFromNow(-3) });
    const list = await request(app).get(`/supervision/shared/${owner._id}/supervisees`).set(as(viewer));
    assert.strictEqual(list.status, 200);
    const mine = await request(app).get("/supervision/shared").set(as(viewer));
    assert.strictEqual(mine.body.supervisors[0].available, true);
  });

  test("viewers lose access while the owner's plan doesn't include sharing; the share is kept", async () => {
    const { owner, viewer } = await sharedSetup({ planKey: "starter" });
    const list = await request(app).get(`/supervision/shared/${owner._id}/supervisees`).set(as(viewer));
    assert.strictEqual(list.status, 403);
    const mine = await request(app).get("/supervision/shared").set(as(viewer));
    assert.strictEqual(mine.body.supervisors[0].available, false);
    assert.strictEqual(await SupervisionShare.countDocuments(), 1);
  });
});
