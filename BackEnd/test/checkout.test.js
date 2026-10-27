// Plan checkout end to end against the real routes: the public plan list,
// the quote shown before payment, PayFast initiate (EUR → PKR, snapshot),
// and the callback (verified, applied exactly once). PayFast and the FX
// API are stubbed; nothing leaves the machine.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const request = require("supertest");

process.env.PAYFAST_ENV = "sandbox";
process.env.PAYFAST_SANDBOX_MERCHANT_ID = "TEST-MERCHANT";
process.env.PAYFAST_SANDBOX_SECURED_KEY = "test-secret";
process.env.SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || "test";
process.env.SANITY_DATASET = process.env.SANITY_DATASET || "test";

const EUR_TO_PKR = 325;
global.fetch = async () => ({
  ok: true,
  json: async () => ({ result: "success", rates: { PKR: EUR_TO_PKR } }),
});
const payfast = require("../Services/payfast");
payfast.getAccessToken = async () => ({ token: "test-token" });

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const payfastRouter = require("../Routes/payfast");
const Order = require("../Schema/Order");
const User = require("../Schema/User");

const app = buildApp({ "/supervision": supervisionRouter, "/payfast": payfastRouter });
const as = (user) => ({ "x-test-user": String(user._id) });
const DAY_MS = 24 * 60 * 60 * 1000;
const daysUntil = (date) => (new Date(date).getTime() - Date.now()) / DAY_MS;

const hashFor = (basketId, errCode = "000") =>
  crypto
    .createHash("sha256")
    .update(`${basketId}|test-secret|TEST-MERCHANT|${errCode}`)
    .digest("hex");

const callback = (basketId, errCode = "000") =>
  request(app)
    .post("/payfast/callback")
    .send({ basket_id: basketId, err_code: errCode, validation_hash: hashFor(basketId, errCode) });

const initiate = (user, itemIds) =>
  request(app).post("/payfast/initiate").set(as(user)).send({ itemIds, displayCurrency: "EUR" });

before(db.connect);
after(db.disconnect);
beforeEach(async () => {
  await db.clear();
  delete process.env.SHOW_CLINIC_PLAN;
  delete process.env.SUPERVISION_PLAN_PRICES;
});

describe("GET /supervision/plans", () => {
  test("cards in spec order with savings from config; Clinic hidden while the flag is off", async () => {
    const res = await request(app).get("/supervision/plans");
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body.plans.map((p) => p.key), ["supervisee", "starter", "professional", "custom"]);
    const byKey = Object.fromEntries(res.body.plans.map((p) => [p.key, p]));
    assert.strictEqual(byKey.starter.yearly.savingEur, 30);
    assert.strictEqual(byKey.professional.yearly.savingEur, 60);
    assert.strictEqual(byKey.professional.featured, true);
    assert.strictEqual(byKey.starter.maxActiveSupervisees, 3);
    assert.strictEqual(byKey.custom.checkout, "manual");
  });

  test("SHOW_CLINIC_PLAN=true shows Clinic with its €160 saving", async () => {
    process.env.SHOW_CLINIC_PLAN = "true";
    const res = await request(app).get("/supervision/plans");
    const clinic = res.body.plans.find((p) => p.key === "clinic");
    assert.strictEqual(res.body.plans.indexOf(clinic), 3);
    assert.strictEqual(clinic.yearly.savingEur, 160);
    assert.strictEqual(clinic.yearly.monthlyEquivalentEur, 66.67);
  });
});

describe("quote before payment (§4.3)", () => {
  test("Starter → Professional halfway through a monthly pass shows the new end date", async () => {
    const user = await makeSupervisor({ planKey: "starter", expiresAt: daysFromNow(15), rateEurPerDay: 0.5 });
    const res = await request(app)
      .get("/supervision/plans/quote?plan=professional&period=monthly")
      .set(as(user));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.kind, "change");
    assert.strictEqual(res.body.creditedDays, 7);
    assert.ok(Math.abs(daysUntil(res.body.expiresAt) - 37) < 0.01);
    assert.strictEqual(res.body.itemId, "plan:professional:monthly");
  });

  test("the conversion uses the stored rate the customer paid, not today's price", async () => {
    // 20.5 days left bought at €0.80/day = €16.40 → at €1/day = 16 days.
    const user = await makeSupervisor({ planKey: "starter", expiresAt: daysFromNow(20.5), rateEurPerDay: 0.8 });
    const res = await request(app)
      .get("/supervision/plans/quote?plan=professional&period=monthly")
      .set(as(user));
    assert.strictEqual(res.body.creditedDays, 16);
  });

  test("a migrated €350 Yearly customer converts at the €300 rate (decision 2)", async () => {
    const user = await makeSupervisor({ planKey: null, expiresAt: daysFromNow(73.5) });
    user.supervisionPlan.plan = "supervision-yearly";
    await user.save();
    // 73.5 days × 300/365 = €60.41 → at €0.50/day (Starter monthly) = 120 days.
    // (At €350/365 it would be 141.)
    const res = await request(app).get("/supervision/plans/quote?plan=starter&period=monthly").set(as(user));
    assert.strictEqual(res.body.kind, "change");
    assert.strictEqual(res.body.creditedDays, 120);
  });

  test("downgrade to Starter is blocked above 3 active supervisees, with the spec's message", async () => {
    const user = await makeSupervisor({ planKey: "professional" });
    for (let i = 0; i < 4; i++) await makeSupervisee(user);
    await makeSupervisee(user, { archivedAt: new Date() }); // archived ones don't count

    const res = await request(app).get("/supervision/plans/quote?plan=starter&period=monthly").set(as(user));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(
      res.body.message,
      "Starter includes up to 3 supervisees. You have 4 active. Archive 1 to switch to Starter.",
    );
    const atCheckout = await initiate(user, ["plan:starter:monthly"]);
    assert.strictEqual(atCheckout.status, 400);
  });

  test("downgrade to Starter is allowed with 3 or fewer", async () => {
    const user = await makeSupervisor({ planKey: "professional" });
    for (let i = 0; i < 3; i++) await makeSupervisee(user);
    const res = await request(app).get("/supervision/plans/quote?plan=starter&period=monthly").set(as(user));
    assert.strictEqual(res.status, 200);
  });

  test("a supervisee can't buy a plan", async () => {
    const supervisor = await makeSupervisor();
    const { user } = await makeSupervisee(supervisor);
    const res = await request(app).get("/supervision/plans/quote?plan=starter&period=monthly").set(as(user));
    assert.strictEqual(res.status, 400);
  });

  test("a complimentary account is told there's nothing to buy", async () => {
    const user = await makeSupervisor({ planKey: null, expiresAt: null, email: "ffaizan.aba@gmail.com" });
    const res = await request(app).get("/supervision/plans/quote?plan=starter&period=monthly").set(as(user));
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.message, "This account already has free access to the portal, so there's nothing to buy.");
  });

  test("Clinic and Custom can't be bought at checkout in Phase 1", async () => {
    const user = await User.create({ email: "buyer@example.test" });
    for (const plan of ["clinic", "custom"]) {
      const res = await request(app).get(`/supervision/plans/quote?plan=${plan}&period=monthly`).set(as(user));
      assert.strictEqual(res.status, 400);
    }
  });
});

describe("PayFast initiate", () => {
  test("charges the PKR equivalent of the EUR price and snapshots the pass", async () => {
    const user = await User.create({ email: "new@example.test" });
    const res = await initiate(user, ["plan:professional:yearly"]);
    assert.strictEqual(res.status, 200);
    // €300 × 325 = Rs 97,500 (existing rule: nearest Rs 50).
    assert.strictEqual(res.body.amountPkr, 97500);

    const order = await Order.findOne({ basketId: res.body.basketId }).lean();
    assert.strictEqual(order.amounts.eurTotal, 300);
    assert.deepStrictEqual(
      { ...order.plan, quotedExpiresAt: undefined },
      { planKey: "professional", period: "yearly", priceEur: 300, periodDays: 365, kind: "new", quotedExpiresAt: undefined },
    );
  });

  test("a plan is bought on its own", async () => {
    const user = await User.create({ email: "mixed@example.test" });
    const res = await initiate(user, ["plan:starter:monthly", "ffc-bundle"]);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(
      res.body.error,
      "A supervision plan has to be bought on its own. Please check out other items separately.",
    );
  });
});

describe("PayFast callback", () => {
  async function paidOrder(user, itemId = "plan:professional:monthly") {
    const res = await initiate(user, [itemId]);
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    return res.body.basketId;
  }

  test("a 30-day pass adds 30 days and makes the buyer a supervisor", async () => {
    const user = await User.create({ email: "first@example.test" });
    const basketId = await paidOrder(user);
    assert.strictEqual((await callback(basketId)).status, 200);

    const after = await User.findById(user._id).lean();
    assert.strictEqual(after.portalRole, "supervisor");
    assert.strictEqual(after.supervisionPlan.planKey, "professional");
    assert.ok(Math.abs(daysUntil(after.supervisionPlan.expiresAt) - 30) < 0.01);
    const order = await Order.findOne({ basketId }).lean();
    assert.strictEqual(order.status, "paid");
    assert.deepStrictEqual(order.plan.appliedExpiresAt, after.supervisionPlan.expiresAt);
  });

  test("the same payment reported twice adds the days once", async () => {
    const user = await User.create({ email: "twice@example.test" });
    const basketId = await paidOrder(user);
    await callback(basketId);
    const second = await callback(basketId);
    assert.strictEqual(second.text, "Already processed");
    const after = await User.findById(user._id).lean();
    assert.ok(Math.abs(daysUntil(after.supervisionPlan.expiresAt) - 30) < 0.01);
  });

  test("both legs arriving at the same moment still add the days once", async () => {
    const user = await User.create({ email: "race@example.test" });
    const basketId = await paidOrder(user);
    await Promise.all([callback(basketId), callback(basketId), callback(basketId)]);
    const after = await User.findById(user._id).lean();
    assert.ok(Math.abs(daysUntil(after.supervisionPlan.expiresAt) - 30) < 0.01);
  });

  test("early renewal through checkout stacks on the time left", async () => {
    const user = await makeSupervisor({ planKey: "professional", expiresAt: daysFromNow(10), rateEurPerDay: 1 });
    await callback(await paidOrder(user));
    const after = await User.findById(user._id).lean();
    assert.ok(Math.abs(daysUntil(after.supervisionPlan.expiresAt) - 40) < 0.01);
  });

  test("the price on the order counts, not a price changed after checkout", async () => {
    const user = await User.create({ email: "price@example.test" });
    const basketId = await paidOrder(user, "plan:starter:monthly");
    process.env.SUPERVISION_PLAN_PRICES = JSON.stringify({ starter: { monthly: 20 } });
    await callback(basketId);
    const after = await User.findById(user._id).lean();
    assert.strictEqual(after.supervisionPlan.rateEurPerDay, 15 / 30);
  });

  test("a failed payment adds nothing", async () => {
    const user = await User.create({ email: "failed@example.test" });
    const basketId = await paidOrder(user);
    await callback(basketId, "999");
    const after = await User.findById(user._id).lean();
    assert.strictEqual(after.supervisionPlan.expiresAt, null);
    assert.strictEqual((await Order.findOne({ basketId }).lean()).status, "failed");
  });

  test("a forged callback is rejected", async () => {
    const user = await User.create({ email: "forged@example.test" });
    const basketId = await paidOrder(user);
    const res = await request(app)
      .post("/payfast/callback")
      .send({ basket_id: basketId, err_code: "000", validation_hash: "0".repeat(64) });
    assert.strictEqual(res.status, 401);
    assert.strictEqual((await Order.findOne({ basketId }).lean()).status, "pending");
  });

  test("an order started on the old page (legacy Yearly id) still completes as Professional", async () => {
    const user = await User.create({ email: "legacy@example.test" });
    await Order.create({
      basketId: "ABA-LEGACY-1",
      userId: user._id,
      items: [{ id: "supervision-yearly", title: "Supervision Portal — Yearly", priceEur: 350, pricePkr: 113750 }],
      amounts: { eurTotal: 350, pkrAmount: 113750, fxRate: EUR_TO_PKR },
      status: "pending",
    });
    await callback("ABA-LEGACY-1");
    const after = await User.findById(user._id).lean();
    assert.strictEqual(after.supervisionPlan.planKey, "professional");
    assert.ok(Math.abs(daysUntil(after.supervisionPlan.expiresAt) - 365) < 0.01);
  });
});
