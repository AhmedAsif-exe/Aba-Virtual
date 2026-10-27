// What the browser is told about an account: the plan summary on /auth/me,
// the supervisee's logging state, and sign-up signing the user in.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const request = require("supertest");

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-client";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-secret";

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const authRouter = require("../Routes/auth");
const supervisionRouter = require("../Routes/supervision");
const Organisation = require("../Schema/Organisation");
const OrganisationMember = require("../Schema/OrganisationMember");

const app = buildApp({ "/auth": authRouter, "/supervision": supervisionRouter });
const as = (user) => ({ "x-test-user": String(user._id) });
const me = async (user) => (await request(app).get("/auth/me").set(as(user))).body.user;

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

describe("/auth/me plan summary", () => {
  test("an ended Starter pass: read-only, Starter features, limit 3", async () => {
    const plan = (await me(await makeSupervisor({ planKey: "starter", expiresAt: daysFromNow(-2) })))
      .supervisionPlan;
    assert.strictEqual(plan.planKey, "starter");
    assert.strictEqual(plan.active, false);
    assert.strictEqual(plan.canWrite, false);
    assert.strictEqual(plan.daysLeft, 0);
    assert.strictEqual(plan.maxActiveSupervisees, 3);
    assert.strictEqual(plan.features.view_only_sharing, false);
  });

  test("an active Professional pass: days left, unlimited, sharing", async () => {
    const plan = (await me(await makeSupervisor({ planKey: "professional", expiresAt: daysFromNow(9.5) })))
      .supervisionPlan;
    assert.strictEqual(plan.active, true);
    assert.strictEqual(plan.canWrite, true);
    assert.strictEqual(plan.daysLeft, 10);
    assert.strictEqual(plan.maxActiveSupervisees, null);
    assert.strictEqual(plan.features.payment_tracking, true);
  });

  test("an organisation member gets the organisation's plan", async () => {
    const user = await makeSupervisor({ planKey: null, expiresAt: null });
    const org = await Organisation.create({ name: "C", planKey: "custom", seatLimit: 6, expiresAt: daysFromNow(40) });
    await OrganisationMember.create({ organisationId: org._id, userId: user._id, role: "supervisor" });
    const plan = (await me(user)).supervisionPlan;
    assert.strictEqual(plan.planKey, "custom");
    assert.strictEqual(plan.source, "organisation");
    assert.strictEqual(plan.canWrite, true);
  });
});

describe("supervisee logging state on their dashboard", () => {
  const logging = async (user) => (await request(app).get("/supervision/me").set(as(user))).body.logging;

  test("open while the supervisor's pass is live", async () => {
    const { user } = await makeSupervisee(await makeSupervisor());
    assert.deepStrictEqual(await logging(user), { open: true, reason: null });
  });

  test("closed when the supervisor's plan has ended", async () => {
    const { user } = await makeSupervisee(await makeSupervisor({ expiresAt: daysFromNow(-1) }));
    assert.deepStrictEqual(await logging(user), { open: false, reason: "supervisor_plan_ended" });
  });

  test("closed when archived", async () => {
    const { user } = await makeSupervisee(await makeSupervisor(), { archivedAt: new Date() });
    assert.deepStrictEqual(await logging(user), { open: false, reason: "archived" });
  });

  test("the supervisor's view of the same dashboard doesn't carry it", async () => {
    const supervisor = await makeSupervisor();
    const { profile } = await makeSupervisee(supervisor);
    const body = (await request(app).get(`/supervision/supervisees/${profile._id}`).set(as(supervisor))).body;
    assert.strictEqual(body.logging, undefined);
  });
});

test("sign-up signs the new user in (no email verification exists)", async () => {
  const real = express();
  real.use(express.json());
  real.use(session({ secret: "test", resave: false, saveUninitialized: false }));
  require("../Config/passport")(passport);
  real.use(passport.initialize());
  real.use(passport.session());
  real.use("/auth", authRouter);

  const agent = request.agent(real);
  const res = await agent
    .post("/auth/register")
    .send({ name: "New Person", email: "new@example.test", password: "secret123" });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.user.email, "new@example.test");

  const who = await agent.get("/auth/me");
  assert.strictEqual(who.status, 200);
  assert.strictEqual(who.body.user.email, "new@example.test");

  const again = await agent
    .post("/auth/register")
    .send({ name: "Again", email: "new@example.test", password: "secret123" });
  assert.strictEqual(again.status, 400); // existing email: refused, as before
});
