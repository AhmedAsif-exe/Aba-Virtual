// §7: the internal admin screen's API. Site admins only; Custom
// organisations with any seat limit and expiry, paid by invoice.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const { spawnSync } = require("child_process");
const path = require("path");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor } = require("./helpers/fixtures");
const adminRouter = require("../Routes/admin");
const authRouter = require("../Routes/auth");
const User = require("../Schema/User");
const OrganisationMember = require("../Schema/OrganisationMember");
const { canWrite } = require("../Services/entitlements");
const { planContextFor } = require("../Services/planContext");

const app = buildApp({ "/admin": adminRouter, "/auth": authRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

before(async () => {
  await db.connect();
  await OrganisationMember.init();
});
after(db.disconnect);
beforeEach(db.clear);

const makeAdmin = () => User.create({ email: "staff@example.test", name: "Staff", siteAdmin: true });

async function createOrg(admin, body = {}) {
  const res = await request(app)
    .post("/admin/organisations")
    .set(as(admin))
    .send({ name: "Big Clinic", seatLimit: 12, expiresAt: daysFromNow(90).toISOString(), ...body });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  return res.body.organisation;
}

describe("access", () => {
  test("only site admins get in; signed-out users get 401", async () => {
    const supervisor = await makeSupervisor();
    assert.strictEqual((await request(app).get("/admin/organisations").set(as(supervisor))).status, 403);
    assert.strictEqual((await request(app).get("/admin/organisations")).status, 401);
    assert.strictEqual((await request(app).get("/admin/organisations").set(as(await makeAdmin()))).status, 200);
  });

  test("nobody can make themselves a site admin through the profile route", async () => {
    const user = await User.create({ email: "sneaky@example.test" });
    await request(app).patch("/auth/profile").set(as(user)).send({ siteAdmin: true, role: "Parent" });
    assert.strictEqual((await User.findById(user._id).lean()).siteAdmin, false);
  });
});

describe("Custom organisations (§7)", () => {
  test("create with any seat limit and any expiry", async () => {
    const admin = await makeAdmin();
    const org = await createOrg(admin, { seatLimit: 40, expiresAt: "2028-03-31T00:00:00.000Z" });
    assert.strictEqual(org.planKey, "custom");
    assert.strictEqual(org.seatLimit, 40);
    assert.strictEqual(org.expiresAt, "2028-03-31T00:00:00.000Z");
  });

  test("mark paid by invoice or bank transfer, in EUR, PKR or USD", async () => {
    const admin = await makeAdmin();
    const org = await createOrg(admin);
    const res = await request(app)
      .post(`/admin/organisations/${org._id}/payments`)
      .set(as(admin))
      .send({ method: "invoice", reference: "INV-2026-014", amount: 1800, currency: "USD" });
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(
      res.body.organisation.payments.map(({ method, reference, amount, currency }) => ({ method, reference, amount, currency })),
      [{ method: "invoice", reference: "INV-2026-014", amount: 1800, currency: "USD" }],
    );
    const bad = await request(app)
      .post(`/admin/organisations/${org._id}/payments`)
      .set(as(admin))
      .send({ method: "invoice", reference: "X", amount: 5, currency: "GBP" });
    assert.strictEqual(bad.status, 400);
  });

  test("extend the expiry: days are added to the time left", async () => {
    const admin = await makeAdmin();
    const org = await createOrg(admin, { expiresAt: daysFromNow(10).toISOString() });
    const res = await request(app).patch(`/admin/organisations/${org._id}`).set(as(admin)).send({ extendDays: 30 });
    const daysLeft = (new Date(res.body.organisation.expiresAt) - Date.now()) / 86400000;
    assert.ok(Math.abs(daysLeft - 40) < 0.01);
  });

  test("attached supervisors get the organisation's plan, up to the seat limit", async () => {
    const admin = await makeAdmin();
    const org = await createOrg(admin, { seatLimit: 1 });
    const first = await User.create({ email: "one@example.test" });
    const second = await User.create({ email: "two@example.test" });

    const attach = (email, role = "supervisor") =>
      request(app).post(`/admin/organisations/${org._id}/members`).set(as(admin)).send({ email, role });

    assert.strictEqual((await attach("ONE@example.test")).status, 201);
    const one = await User.findById(first._id);
    assert.strictEqual(one.portalRole, "supervisor");
    assert.strictEqual(canWrite(one, await planContextFor(one._id)), true);

    const full = await attach("two@example.test");
    assert.strictEqual(full.status, 400);
    // A manager-only admin takes no seat.
    assert.strictEqual((await attach("two@example.test", "admin")).status, 201);
    assert.strictEqual((await User.findById(second._id)).portalRole, null);
  });

  test("joining or leaving an organisation never changes the person's own plan", async () => {
    const admin = await makeAdmin();
    const org = await createOrg(admin);
    const supervisor = await makeSupervisor({ planKey: "starter", expiresAt: daysFromNow(20), rateEurPerDay: 0.5 });
    const ownBefore = (await User.findById(supervisor._id).lean()).supervisionPlan;

    await request(app).post(`/admin/organisations/${org._id}/members`).set(as(admin))
      .send({ email: supervisor.email, role: "supervisor" });
    assert.deepStrictEqual((await User.findById(supervisor._id).lean()).supervisionPlan, ownBefore);

    await request(app).delete(`/admin/organisations/${org._id}/members/${supervisor._id}`).set(as(admin));
    assert.deepStrictEqual((await User.findById(supervisor._id).lean()).supervisionPlan, ownBefore);
  });

  test("an account can't be in two organisations, and supervisees can't be attached", async () => {
    const admin = await makeAdmin();
    const a = await createOrg(admin, { name: "A" });
    const b = await createOrg(admin, { name: "B" });
    await User.create({ email: "shared@example.test" });
    await User.create({ email: "trainee@example.test", portalRole: "supervisee" });
    const attach = (org, email) =>
      request(app).post(`/admin/organisations/${org._id}/members`).set(as(admin)).send({ email, role: "supervisor" });

    assert.strictEqual((await attach(a, "shared@example.test")).status, 201);
    assert.strictEqual((await attach(b, "shared@example.test")).status, 409);
    assert.strictEqual((await attach(a, "trainee@example.test")).status, 400);
    assert.strictEqual((await attach(a, "nobody@example.test")).status, 404);
  });
});

test("promoteAdmin.js grants and removes site admin by email argument", async () => {
  await User.create({ email: "faiza@example.test" });
  const run = (...args) =>
    spawnSync(process.execPath, [path.join(__dirname, "../scripts/promoteAdmin.js"), ...args], {
      // MONGODB_URI set here wins over .env (dotenv never overwrites).
      env: { ...process.env, MONGODB_URI: db.uri() + "test" },
      encoding: "utf8",
    });

  const grant = run("FAIZA@example.test");
  assert.match(grant.stdout, /is now a site admin/);
  assert.strictEqual((await User.findOne({ email: "faiza@example.test" }).lean()).siteAdmin, true);

  const remove = run("faiza@example.test", "--remove");
  assert.match(remove.stdout, /is no longer a site admin/);
  assert.strictEqual((await User.findOne({ email: "faiza@example.test" }).lean()).siteAdmin, false);

  assert.notStrictEqual(run().status, 0);
});
