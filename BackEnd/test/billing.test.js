const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");

const { DAY_MS, renew, change, applyPass, migrationCreditDays } = require("../Services/billing");
const { passFor, yearlySavings, parseCheckoutItemId, showClinicPlan } = require("../Config/plans");

const NOW = new Date("2026-11-01T12:00:00Z");
const inDays = (d) => new Date(NOW.getTime() + d * DAY_MS);
const daysFromNow = (date) => (date.getTime() - NOW.getTime()) / DAY_MS;

describe("buying and renewing (§4.1)", () => {
  test("a 30-day pass adds 30 days and a 365-day pass adds 365", () => {
    assert.strictEqual(daysFromNow(applyPass(null, passFor("starter", "monthly"), NOW).expiresAt), 30);
    assert.strictEqual(daysFromNow(applyPass(null, passFor("starter", "yearly"), NOW).expiresAt), 365);
  });

  test("renewing early stacks on the time left", () => {
    const current = { planKey: "professional", expiresAt: inDays(10), rateEurPerDay: 1 };
    const result = applyPass(current, passFor("professional", "monthly"), NOW);
    assert.strictEqual(result.kind, "renewal");
    assert.strictEqual(daysFromNow(result.expiresAt), 40);
  });

  test("renewing with the other period of the same plan is still a renewal", () => {
    const current = { planKey: "professional", expiresAt: inDays(10), rateEurPerDay: 1 };
    const result = applyPass(current, passFor("professional", "yearly"), NOW);
    assert.strictEqual(result.kind, "renewal");
    assert.strictEqual(daysFromNow(result.expiresAt), 375);
  });

  test("renewing after expiry starts from now, not from the old date", () => {
    const current = { planKey: "starter", expiresAt: inDays(-5), rateEurPerDay: 0.5 };
    assert.strictEqual(daysFromNow(renew(current, passFor("starter", "monthly"), NOW).expiresAt), 30);
  });

  test("stacked time keeps a blended per-day value", () => {
    // 10 days left worth €10, plus €300 for 365 days → €310 over 375 days.
    const current = { expiresAt: inDays(10), rateEurPerDay: 1 };
    const { rateEurPerDay } = renew(current, passFor("professional", "yearly"), NOW);
    assert.ok(Math.abs(rateEurPerDay - 310 / 375) < 1e-12);
  });
});

describe("changing plan (§4.3)", () => {
  test("Starter → Professional halfway through a monthly pass", () => {
    // 15 of 30 days left on €15 Starter = €7.50 left.
    const current = { planKey: "starter", expiresAt: inDays(15), rateEurPerDay: 15 / 30 };

    const monthly = applyPass(current, passFor("professional", "monthly"), NOW);
    assert.strictEqual(monthly.kind, "change");
    assert.strictEqual(monthly.creditedDays, 7); // floor(7.50 ÷ €1/day)
    assert.strictEqual(daysFromNow(monthly.expiresAt), 37);

    const yearly = applyPass(current, passFor("professional", "yearly"), NOW);
    assert.strictEqual(yearly.creditedDays, 9); // floor(7.50 ÷ (300/365)) = floor(9.125)
    assert.strictEqual(daysFromNow(yearly.expiresAt), 374);
  });

  test("credited days are floored, never rounded up", () => {
    // 10 days × €1 = €10 at €0.5/day = exactly 20 days, must not become 19.
    const current = { planKey: "professional", expiresAt: inDays(10), rateEurPerDay: 1 };
    const result = change(current, passFor("starter", "monthly"), NOW);
    assert.strictEqual(result.creditedDays, 20);
    assert.strictEqual(daysFromNow(result.expiresAt), 50);
  });

  test("changing from an expired plan carries nothing over", () => {
    const current = { planKey: "starter", expiresAt: inDays(-1), rateEurPerDay: 0.5 };
    const result = applyPass(current, passFor("professional", "monthly"), NOW);
    assert.strictEqual(result.kind, "new");
    assert.strictEqual(daysFromNow(result.expiresAt), 30);
  });

  test("the old price comes from the stored rate, not from current config", () => {
    // Bought at a hypothetical €20/30 days; config now says €15.
    const current = { planKey: "starter", expiresAt: inDays(30), rateEurPerDay: 20 / 30 };
    const result = change(current, passFor("professional", "monthly"), NOW);
    assert.strictEqual(result.creditedDays, 20); // €20 left at €1/day
  });
});

describe("migration credit (§5)", () => {
  test("€50 ÷ (€300 / 365) = 60.8 → 61 days", () => {
    assert.strictEqual(migrationCreditDays(350, 300, 365), 61);
  });

  test("no credit when nothing was overpaid", () => {
    assert.strictEqual(migrationCreditDays(30, 30, 30), 0);
  });
});

describe("plan config (§2)", () => {
  afterEach(() => {
    delete process.env.SUPERVISION_PLAN_PRICES;
    delete process.env.SHOW_CLINIC_PLAN;
  });

  test("savings are computed from config and read €30 / €60 / €160", () => {
    assert.deepStrictEqual(yearlySavings("starter"), { monthlyEquivalentEur: 12.5, savingEur: 30 });
    assert.deepStrictEqual(yearlySavings("professional"), { monthlyEquivalentEur: 25, savingEur: 60 });
    assert.deepStrictEqual(yearlySavings("clinic"), { monthlyEquivalentEur: 66.67, savingEur: 160 });
  });

  test("a price override changes the price and the saving without code changes", () => {
    process.env.SUPERVISION_PLAN_PRICES = JSON.stringify({ starter: { yearly: 140 } });
    assert.strictEqual(passFor("starter", "yearly").priceEur, 140);
    assert.strictEqual(yearlySavings("starter").savingEur, 40);
  });

  test("an invalid override is ignored", () => {
    process.env.SUPERVISION_PLAN_PRICES = JSON.stringify({ starter: { monthly: -1, yearly: "free" } });
    assert.strictEqual(passFor("starter", "monthly").priceEur, 15);
    assert.strictEqual(passFor("starter", "yearly").priceEur, 150);
  });

  test("checkout ids resolve only for plans sold at checkout", () => {
    assert.deepStrictEqual(parseCheckoutItemId("plan:professional:yearly"), {
      planKey: "professional",
      period: "yearly",
      priceEur: 300,
      days: 365,
    });
    assert.strictEqual(parseCheckoutItemId("plan:clinic:monthly"), null); // Phase 2
    assert.strictEqual(parseCheckoutItemId("plan:custom:monthly"), null);
    assert.strictEqual(parseCheckoutItemId("supervision-monthly"), null);
  });

  test("the Clinic plan is hidden unless SHOW_CLINIC_PLAN=true", () => {
    assert.strictEqual(showClinicPlan(), false);
    process.env.SHOW_CLINIC_PLAN = "true";
    assert.strictEqual(showClinicPlan(), true);
  });
});
