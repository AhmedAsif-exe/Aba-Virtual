const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const db = require("./helpers/db");
const User = require("../Schema/User");
const Order = require("../Schema/Order");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const PlanReminder = require("../Schema/PlanReminder");
const Organisation = require("../Schema/Organisation");
const OrganisationMember = require("../Schema/OrganisationMember");

before(async () => {
  await db.connect();
  await Promise.all([PlanReminder.init(), OrganisationMember.init()]);
});
after(db.disconnect);
beforeEach(db.clear);

test("new plan fields save, with safe defaults", async () => {
  const user = await User.create({ email: "a@example.test", supervisionPlan: { planKey: "starter" } });
  const saved = await User.findById(user._id).lean();
  assert.strictEqual(saved.supervisionPlan.planKey, "starter");
  assert.strictEqual(saved.supervisionPlan.migrationCreditApplied, false);
  assert.strictEqual(saved.supervisionPlan.complimentary, false);
  assert.strictEqual(saved.siteAdmin, false);
  assert.strictEqual(saved.timezone, null);
});

test("an unknown plan key is rejected", async () => {
  await assert.rejects(User.create({ email: "b@example.test", supervisionPlan: { planKey: "gold" } }));
});

test("existing users without the new fields still load", async () => {
  await mongoose.connection.collection("users").insertOne({
    email: "old@example.test",
    supervisionPlan: { plan: "supervision-monthly", expiresAt: new Date() },
  });
  const user = await User.findOne({ email: "old@example.test" });
  assert.strictEqual(user.supervisionPlan.planKey, null);
  assert.strictEqual(user.supervisionPlan.plan, "supervision-monthly");
});

test("supervisees start unarchived", async () => {
  const profile = new SuperviseeProfile({});
  assert.strictEqual(profile.archivedAt, null);
});

test("an order can hold a plan snapshot and be claimed as processing", async () => {
  const order = await Order.create({
    basketId: "ABA-TEST-1",
    userId: new mongoose.Types.ObjectId(),
    amounts: { eurTotal: 30, pkrAmount: 9750, fxRate: 325 },
    plan: { planKey: "professional", period: "monthly", priceEur: 30, periodDays: 30, kind: "new" },
    status: "processing",
  });
  assert.strictEqual(order.plan.priceEur, 30);
  assert.strictEqual(order.status, "processing");
});

test("the same reminder for the same pass can only be recorded once", async () => {
  const row = { userId: new mongoose.Types.ObjectId(), expiresAt: new Date("2026-12-01"), kind: "7d" };
  await PlanReminder.create(row);
  await assert.rejects(PlanReminder.create(row), /duplicate key/);
  await PlanReminder.create({ ...row, expiresAt: new Date("2027-01-01") }); // after a renewal
});

test("a user belongs to at most one organisation", async () => {
  const org = await Organisation.create({ name: "Clinic A", planKey: "custom", seatLimit: 8 });
  const userId = new mongoose.Types.ObjectId();
  await OrganisationMember.create({ organisationId: org._id, userId, role: "admin" });
  await assert.rejects(
    OrganisationMember.create({ organisationId: org._id, userId, role: "supervisor" }),
    /duplicate key/,
  );
});
