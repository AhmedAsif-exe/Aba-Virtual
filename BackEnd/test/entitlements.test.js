const { test, describe } = require("node:test");
const assert = require("node:assert");

const { effectivePlan, can, canWrite, limit, summary } = require("../Services/entitlements");

const NOW = new Date("2026-11-01T12:00:00Z");
const ctx = { now: NOW };
const future = new Date("2026-12-01T00:00:00Z");
const past = new Date("2026-10-01T00:00:00Z");

const supervisor = (planKey, expiresAt = future, extra = {}) => ({
  email: "someone@example.com",
  supervisionPlan: { planKey, expiresAt, ...extra },
});

describe("features by plan (§3)", () => {
  test("Starter: core tools, no sharing or payment tracking, 3 supervisees", () => {
    const u = supervisor("starter");
    assert.strictEqual(can(u, "meetings", ctx), true);
    assert.strictEqual(can(u, "view_only_sharing", ctx), false);
    assert.strictEqual(can(u, "payment_tracking", ctx), false);
    assert.strictEqual(limit(u, "max_active_supervisees", ctx), 3);
  });

  test("Professional: sharing, payment tracking, unlimited supervisees, no clinic tools", () => {
    const u = supervisor("professional");
    assert.strictEqual(can(u, "view_only_sharing", ctx), true);
    assert.strictEqual(can(u, "payment_tracking", ctx), true);
    assert.strictEqual(can(u, "clinic_dashboard", ctx), false);
    assert.strictEqual(limit(u, "max_active_supervisees", ctx), Infinity);
  });

  test("no plan: nothing", () => {
    const u = { email: "x@example.com" };
    assert.strictEqual(can(u, "meetings", ctx), false);
    assert.strictEqual(canWrite(u, ctx), false);
    assert.strictEqual(limit(u, "max_active_supervisees", ctx), 0);
  });

  test("an unknown feature is never granted", () => {
    assert.strictEqual(can(supervisor("custom"), "anything_else", ctx), false);
  });
});

describe("expiry is read-only, not a downgrade (§4.4)", () => {
  test("an expired supervisor keeps their plan's features but cannot write", () => {
    const u = supervisor("professional", past);
    assert.strictEqual(canWrite(u, ctx), false);
    assert.strictEqual(can(u, "view_only_sharing", ctx), true);
    assert.strictEqual(effectivePlan(u, ctx).active, false);
  });

  test("an active pass can write", () => {
    assert.strictEqual(canWrite(supervisor("starter"), ctx), true);
  });
});

describe("legacy and complimentary accounts", () => {
  test("a pre-migration Monthly or Yearly pass reads as Professional", () => {
    const u = { email: "a@example.com", supervisionPlan: { plan: "supervision-yearly", expiresAt: future } };
    assert.strictEqual(effectivePlan(u, ctx).planKey, "professional");
    assert.strictEqual(can(u, "payment_tracking", ctx), true);
    assert.strictEqual(canWrite(u, ctx), true);
  });

  test("a complimentary account is active with no expiry", () => {
    const u = { email: "ffaizan.aba@gmail.com", supervisionPlan: { plan: null, expiresAt: null } };
    const plan = effectivePlan(u, ctx);
    assert.strictEqual(plan.active, true);
    assert.strictEqual(plan.planKey, "professional");
    assert.strictEqual(canWrite(u, ctx), true);
  });

  test("the complimentary flag works without the email list", () => {
    const u = supervisor(null, null, { complimentary: true });
    u.email = "other@example.com";
    assert.strictEqual(canWrite(u, ctx), true);
  });
});

describe("organisation plans", () => {
  test("members follow the organisation's plan, expiry and seat limit", () => {
    const u = supervisor("starter", past);
    const organisation = { planKey: "custom", expiresAt: future, seatLimit: 12 };
    assert.strictEqual(canWrite(u, { ...ctx, organisation }), true);
    assert.strictEqual(can(u, "move_supervisees", { ...ctx, organisation }), true);
    assert.strictEqual(limit(u, "seat_limit", { ...ctx, organisation }), 12);
  });
});

test("summary is JSON-safe (unlimited becomes null)", () => {
  const s = summary(supervisor("professional"), ctx);
  assert.strictEqual(s.maxActiveSupervisees, null);
  assert.strictEqual(s.features.payment_tracking, true);
  assert.strictEqual(JSON.parse(JSON.stringify(s)).canWrite, true);
  assert.strictEqual(summary(supervisor("starter"), ctx).maxActiveSupervisees, 3);
});
