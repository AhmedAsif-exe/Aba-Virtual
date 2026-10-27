// Moves supervisors from the old Monthly €30 / Yearly €350 plans onto the
// new plan keys (spec §5). Safe to run again: every write is conditional
// on the flag it sets, so nothing is done twice.
//
//   node scripts/migratePlans.js --dry-run                 # print only
//   node scripts/migratePlans.js                           # migrate, no emails
//   node scripts/migratePlans.js --send-emails             # migrate + Yearly emails
//
// --dry-run never writes and never sends, whatever else is passed.
// Uses MONGODB_URI from BackEnd/.env — check the "Database:" line it prints
// before confirming anything.

const mongoose = require("mongoose");
const User = require("../Schema/User");
const Order = require("../Schema/Order");
const { addDays, migrationCreditDays } = require("../Services/billing");
const { passFor } = require("../Config/plans");
const { COMPLIMENTARY_SUPERVISORS } = require("../Services/supervisionPlans");
const { formatEmailDate } = require("../Services/dates");
const mailer = require("../Services/mailer");

const OLD_YEARLY_EUR = 350;

/** What should happen to one user. Pure, so the dry run and the run agree. */
function planFor(user, now) {
  const stored = user.supervisionPlan || {};
  const email = String(user.email || "").toLowerCase();
  const expiresAt = stored.expiresAt ? new Date(stored.expiresAt) : null;
  const active = Boolean(expiresAt && expiresAt > now);

  // Free accounts that never expire stay exactly as they are (brief §5).
  if (COMPLIMENTARY_SUPERVISORS.includes(email)) {
    return { category: "free-unchanged", unchanged: true };
  }
  if (stored.plan === "supervision-yearly") {
    const yearly = passFor("professional", "yearly");
    const set = { planKey: "professional", rateEurPerDay: yearly.priceEur / yearly.days };
    if (!active) return { category: "yearly-expired", set };
    const creditDays = migrationCreditDays(OLD_YEARLY_EUR, yearly.priceEur, yearly.days);
    return {
      category: "yearly-active",
      set,
      credit: { days: creditDays, oldPriceEur: OLD_YEARLY_EUR, newPriceEur: yearly.priceEur },
    };
  }
  if (stored.plan === "supervision-monthly") {
    const monthly = passFor("professional", "monthly");
    return {
      category: active ? "monthly-active" : "monthly-expired",
      set: { planKey: "professional", rateEurPerDay: monthly.priceEur / monthly.days },
    };
  }
  // A supervisor with no plan on record: Professional, ended (read-only).
  return { category: "supervisor-no-plan", set: { planKey: "professional" } };
}

/**
 * @param {{dryRun?: boolean, sendEmails?: boolean, now?: Date, log?: Function,
 *          sendEmail?: Function}} options
 * @returns {Promise<{counts: object, rows: object[], review: object[]}>}
 */
async function migrate({
  dryRun = true,
  sendEmails = false,
  now = new Date(),
  log = console.log,
  sendEmail = mailer.sendMigrationCreditEmail,
} = {}) {
  const willSend = sendEmails && !dryRun;
  const users = await User.find({
    $or: [
      { portalRole: "supervisor" },
      { "supervisionPlan.plan": { $in: ["supervision-monthly", "supervision-yearly"] } },
    ],
  });

  const counts = {};
  const rows = [];
  const review = [];

  for (const user of users) {
    const stored = user.supervisionPlan || {};
    const target = planFor(user, now);
    const before = { planKey: stored.planKey || null, expiresAt: stored.expiresAt || null };

    if (target.unchanged) {
      counts[target.category] = (counts[target.category] || 0) + 1;
      rows.push({
        email: user.email,
        category: target.category,
        oldPlan: stored.plan || null,
        oldExpiry: before.expiresAt,
        newPlan: "(unchanged)",
        newExpiry: before.expiresAt,
        creditDays: 0,
        emailStatus: "-",
      });
      continue;
    }

    const alreadyDone = Boolean(stored.planKey) && (!target.credit || stored.migrationCreditApplied);

    // Stacked yearly passes: one 61-day credit may under-credit. Flag them.
    if (target.category === "yearly-active") {
      const yearlyOrders = await Order.countDocuments({
        userId: user._id,
        status: "paid",
        "items.id": "supervision-yearly",
      });
      if (yearlyOrders > 1) review.push({ email: user.email, paidYearlyOrders: yearlyOrders });
    }

    const creditDue = Boolean(target.credit) && !stored.migrationCreditApplied;
    const afterExpiry = creditDue ? addDays(stored.expiresAt, target.credit.days) : before.expiresAt;
    const emailDue =
      Boolean(target.credit) && !stored.migrationEmailSentAt && (creditDue || stored.migrationCreditApplied);

    const category = alreadyDone && !emailDue ? "already-migrated" : target.category;
    counts[category] = (counts[category] || 0) + 1;
    rows.push({
      email: user.email,
      category,
      oldPlan: stored.plan || null,
      oldExpiry: before.expiresAt,
      newPlan: target.set.planKey,
      newExpiry: afterExpiry,
      creditDays: creditDue ? target.credit.days : 0,
      emailStatus: emailDue ? (willSend ? "send" : "due (not sending)") : "-",
    });

    if (dryRun) continue;

    // Plan key, rate and flags: only while not yet migrated.
    const set = Object.fromEntries(
      Object.entries(target.set).map(([key, value]) => [`supervisionPlan.${key}`, value]),
    );
    await User.updateOne({ _id: user._id, "supervisionPlan.planKey": null }, { $set: set });

    // The credit: exactly once, guarded by its own flag in the same write.
    if (creditDue) {
      await User.updateOne(
        { _id: user._id, "supervisionPlan.migrationCreditApplied": { $ne: true } },
        {
          $set: {
            "supervisionPlan.expiresAt": afterExpiry,
            "supervisionPlan.migrationCreditApplied": true,
          },
        },
      );
    }

    if (emailDue && willSend) {
      const fresh = await User.findById(user._id).lean();
      const sent = await sendEmail({
        user: fresh,
        oldPriceEur: target.credit.oldPriceEur,
        newPriceEur: target.credit.newPriceEur,
        creditDays: target.credit.days,
        newEndDate: formatEmailDate(fresh.supervisionPlan.expiresAt, fresh.timezone),
      });
      if (sent) {
        await User.updateOne(
          { _id: user._id, "supervisionPlan.migrationEmailSentAt": null },
          { $set: { "supervisionPlan.migrationEmailSentAt": new Date() } },
        );
      }
    }
  }

  log(dryRun ? "\nDRY RUN — nothing written, no emails sent.\n" : "\nMigration applied.\n");
  log("Counts:");
  for (const [category, n] of Object.entries(counts).sort()) log(`  ${category.padEnd(20)} ${n}`);
  log("\nPer user (before → after):");
  for (const r of rows) {
    log(
      `  ${String(r.email).padEnd(34)} ${r.category.padEnd(18)} ${String(r.oldPlan).padEnd(20)} ` +
        `${iso(r.oldExpiry)} → ${r.newPlan} ${iso(r.newExpiry)}  +${r.creditDays}d  email: ${r.emailStatus}`,
    );
  }
  if (review.length) {
    log("\nCheck by hand (more than one paid Yearly order, one 61-day credit given):");
    for (const r of review) log(`  ${r.email}: ${r.paidYearlyOrders} yearly orders`);
  }
  return { counts, rows, review };
}

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace("T", " ") : "none            ");

if (require.main === module) {
  require("dotenv").config();
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry-run");
  const sendEmails = args.has("--send-emails");
  (async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set");
    console.log(`Database: ${uri.replace(/\/\/[^@]*@/, "//***@")}`);
    console.log(`Mode: ${dryRun ? "dry run" : "WRITE"}${sendEmails && !dryRun ? " + send emails" : ""}`);
    await mongoose.connect(uri);
    await migrate({ dryRun, sendEmails });
    await mongoose.disconnect();
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { migrate, planFor };
