// Members of a Custom organisation get its plan and expiry on every route
// guard, not only in the entitlements unit tests.
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const Organisation = require("../Schema/Organisation");
const OrganisationMember = require("../Schema/OrganisationMember");

const app = buildApp({ "/supervision": supervisionRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

async function memberOf(expiresAt, supervisorFields) {
  const supervisor = await makeSupervisor(supervisorFields);
  const organisation = await Organisation.create({ name: "Clinic", planKey: "custom", seatLimit: 8, expiresAt });
  await OrganisationMember.create({ organisationId: organisation._id, userId: supervisor._id, role: "supervisor" });
  return supervisor;
}

const logHours = async (supervisor) => {
  const { profile } = await makeSupervisee(supervisor);
  return request(app)
    .post(`/supervision/supervisees/${profile._id}/hours`)
    .set(as(supervisor))
    .send({ weekStartDate: "2026-10-05", hours: 10 });
};

test("a member with no pass of their own can write while the organisation's pass is live", async () => {
  const supervisor = await memberOf(daysFromNow(60), { planKey: null, expiresAt: null });
  assert.strictEqual((await logHours(supervisor)).status, 201);
});

test("members go read-only when the organisation's pass ends", async () => {
  const supervisor = await memberOf(daysFromNow(-1), { planKey: null, expiresAt: null });
  assert.strictEqual((await logHours(supervisor)).status, 402);
});

test("a Starter member gets the Custom plan's features and no supervisee limit", async () => {
  const supervisor = await memberOf(daysFromNow(60), { planKey: "starter" });
  for (let i = 0; i < 3; i++) await makeSupervisee(supervisor);
  const share = await request(app).post("/supervision/shares").set(as(supervisor)).send({ email: "v@example.test" });
  assert.strictEqual(share.status, 201);
  assert.strictEqual((await logHours(supervisor)).status, 201); // a 4th supervisee exists now, fine
});

test("supervisees of a member follow the organisation's pass", async () => {
  const supervisor = await memberOf(daysFromNow(-1), { planKey: null, expiresAt: null });
  const { user } = await makeSupervisee(supervisor);
  const log = await request(app)
    .post("/supervision/me/hours")
    .set(as(user))
    .send({ weekStartDate: "2026-10-05", hours: 10 });
  assert.strictEqual(log.status, 402);
});
