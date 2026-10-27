// §5 migration, against an in-memory database: every current state, the
// one-time 61-day credit, the one-time email, and the dry run.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");

const db = require("./helpers/db");
const User = require("../Schema/User");
const Order = require("../Schema/Order");
const { migrate } = require("../scripts/migratePlans");
const { migrationCreditEmail } = require("../Services/mailer");
const { can } = require("../Services/entitlements");

const NOW = new Date("2026-11-01T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const at = (days) => new Date(NOW.getTime() + days * DAY_MS);
const quiet = () => {};

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

const legacy = (email, plan, expiresAt, extra = {}) =>
  User.create({ email, name: email.split("@")[0], portalRole: "supervisor", supervisionPlan: { plan, expiresAt }, ...extra });

async function seed() {
  return {
    monthly: await legacy("monthly@example.test", "supervision-monthly", at(12)),
    yearly: await legacy("yearly@example.test", "supervision-yearly", at(200), { timezone: "Asia/Karachi" }),
    yearlyExpired: await legacy("yearly-old@example.test", "supervision-yearly", at(-5)),
    monthlyExpired: await legacy("monthly-old@example.test", "supervision-monthly", at(-40)),
    faiza: await legacy("ffaizan.aba@gmail.com", null, null),
    supervisee: await User.create({ email: "trainee@example.test", portalRole: "supervisee" }),
    customer: await User.create({ email: "shopper@example.test" }),
    newStarter: await User.create({
      email: "starter@example.test",
      portalRole: "supervisor",
      supervisionPlan: { planKey: "starter", expiresAt: at(20), rateEurPerDay: 0.5 },
    }),
  };
}

const reload = async (user) => User.findById(user._id).lean();
const sentTo = [];
const fakeSend = async (details) => {
  sentTo.push(details);
  return true;
};

describe("mapping (§5)", () => {
  test("every current state lands where the spec says", async () => {
    const u = await seed();
    await migrate({ dryRun: false, now: NOW, log: quiet, sendEmail: fakeSend });

    const monthly = await reload(u.monthly);
    assert.strictEqual(monthly.supervisionPlan.planKey, "professional");
    assert.deepStrictEqual(monthly.supervisionPlan.expiresAt, at(12)); // same expiry

    const yearly = await reload(u.yearly);
    assert.strictEqual(yearly.supervisionPlan.planKey, "professional");
    assert.deepStrictEqual(yearly.supervisionPlan.expiresAt, at(261)); // +61 days
    assert.strictEqual(yearly.supervisionPlan.migrationCreditApplied, true);
    assert.strictEqual(yearly.supervisionPlan.rateEurPerDay, 300 / 365);

    const yearlyExpired = await reload(u.yearlyExpired);
    assert.strictEqual(yearlyExpired.supervisionPlan.planKey, "professional");
    assert.deepStrictEqual(yearlyExpired.supervisionPlan.expiresAt, at(-5)); // no credit, still ended

    assert.strictEqual((await reload(u.monthlyExpired)).supervisionPlan.planKey, "professional");

    const faiza = await reload(u.faiza);
    assert.strictEqual(faiza.supervisionPlan.complimentary, true);

    assert.strictEqual((await reload(u.supervisee)).supervisionPlan.planKey, null);
    assert.strictEqual((await reload(u.customer)).supervisionPlan.planKey, null);
    assert.strictEqual((await reload(u.newStarter)).supervisionPlan.planKey, "starter"); // untouched
  });

  test("no migrated supervisor loses unlimited supervisees, sharing or payment tracking", async () => {
    const u = await seed();
    await migrate({ dryRun: false, now: NOW, log: quiet, sendEmail: fakeSend });
    for (const key of ["monthly", "yearly", "yearlyExpired", "monthlyExpired", "faiza"]) {
      const user = await reload(u[key]);
      assert.strictEqual(can(user, "view_only_sharing"), true, key);
      assert.strictEqual(can(user, "payment_tracking"), true, key);
    }
  });
});

describe("runs twice, applies once", () => {
  test("+61 days exactly once, even if the script runs twice", async () => {
    const u = await seed();
    await migrate({ dryRun: false, now: NOW, log: quiet, sendEmail: fakeSend });
    await migrate({ dryRun: false, now: NOW, log: quiet, sendEmail: fakeSend });
    assert.deepStrictEqual((await reload(u.yearly)).supervisionPlan.expiresAt, at(261));
  });

  test("the Yearly email goes once, only with --send-emails, with the new end date", async () => {
    sentTo.length = 0;
    const u = await seed();
    await migrate({ dryRun: false, sendEmails: false, now: NOW, log: quiet, sendEmail: fakeSend });
    assert.strictEqual(sentTo.length, 0);

    await migrate({ dryRun: false, sendEmails: true, now: NOW, log: quiet, sendEmail: fakeSend });
    await migrate({ dryRun: false, sendEmails: true, now: NOW, log: quiet, sendEmail: fakeSend });
    assert.strictEqual(sentTo.length, 1);
    assert.strictEqual(sentTo[0].user.email, "yearly@example.test");
    assert.strictEqual(sentTo[0].creditDays, 61);
    // 200 + 61 days after 1 Nov 2026 12:00 UTC, shown in the user's zone.
    assert.strictEqual(sentTo[0].newEndDate, "20 July 2027, 17:00 (Asia/Karachi)");
    assert.ok((await reload(u.yearly)).supervisionPlan.migrationEmailSentAt);
  });

  test("a failed send is retried on the next run, without adding days again", async () => {
    const u = await seed();
    await migrate({ dryRun: false, sendEmails: true, now: NOW, log: quiet, sendEmail: async () => false });
    assert.strictEqual((await reload(u.yearly)).supervisionPlan.migrationEmailSentAt, null);

    sentTo.length = 0;
    await migrate({ dryRun: false, sendEmails: true, now: NOW, log: quiet, sendEmail: fakeSend });
    assert.strictEqual(sentTo.length, 1);
    assert.deepStrictEqual((await reload(u.yearly)).supervisionPlan.expiresAt, at(261));
  });
});

describe("dry run", () => {
  test("writes nothing and sends nothing, even with --send-emails, and reports counts and rows", async () => {
    sentTo.length = 0;
    const u = await seed();
    const lines = [];
    const result = await migrate({
      dryRun: true,
      sendEmails: true,
      now: NOW,
      log: (line) => lines.push(line),
      sendEmail: fakeSend,
    });

    assert.strictEqual(sentTo.length, 0);
    assert.strictEqual((await reload(u.yearly)).supervisionPlan.planKey, null);
    assert.deepStrictEqual((await reload(u.yearly)).supervisionPlan.expiresAt, at(200));

    assert.strictEqual(result.counts["yearly-active"], 1);
    assert.strictEqual(result.counts["monthly-active"], 1);
    assert.strictEqual(result.counts.complimentary, 1);
    assert.strictEqual(result.counts["already-migrated"], 1); // the new Starter buyer
    const yearlyRow = result.rows.find((r) => r.email === "yearly@example.test");
    assert.strictEqual(yearlyRow.creditDays, 61);
    assert.strictEqual(yearlyRow.emailStatus, "due (not sending)");
    assert.ok(lines.some((l) => l.includes("DRY RUN")));
  });

  test("flags customers with more than one paid Yearly order for a manual check", async () => {
    const u = await seed();
    for (const basketId of ["ABA-Y-1", "ABA-Y-2"]) {
      await Order.create({
        basketId,
        userId: u.yearly._id,
        items: [{ id: "supervision-yearly", priceEur: 350 }],
        amounts: { eurTotal: 350, pkrAmount: 113750, fxRate: 325 },
        status: "paid",
      });
    }
    const result = await migrate({ dryRun: true, now: NOW, log: quiet });
    assert.deepStrictEqual(result.review, [{ email: "yearly@example.test", paidYearlyOrders: 2 }]);
  });
});

test("the email uses the spec's sentence word for word", () => {
  const mail = migrationCreditEmail({
    user: { email: "y@example.test", name: "Sam" },
    oldPriceEur: 350,
    newPriceEur: 300,
    creditDays: 61,
    newEndDate: "20 July 2027, 17:00 (Asia/Karachi)",
  });
  assert.ok(
    mail.html.includes(
      "We've lowered the yearly Professional price to €300. As you paid €350, we've added 61 days to your access. Your new end date is 20 July 2027, 17:00 (Asia/Karachi).",
    ),
  );
});
