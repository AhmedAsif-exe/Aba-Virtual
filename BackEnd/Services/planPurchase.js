// Buying a supervision pass: what it will do (quote, shown before payment)
// and doing it (apply, after a verified payment). The maths is in
// Services/billing.js; this file knows about users and orders.

const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const { applyPass } = require("./billing");
const { effectivePlan } = require("./entitlements");
const { LIMITS, PERIOD_DAYS, passFor, parseCheckoutItemId } = require("../Config/plans");

// Pre-migration plan ids. What they were worth per day (decision 2: yearly
// counts at €300 because the migration credits the €50 difference).
const LEGACY_PASSES = {
  "supervision-monthly": { planKey: "professional", period: "monthly", rateEurPerDay: 30 / 30 },
  "supervision-yearly": { planKey: "professional", period: "yearly", rateEurPerDay: 300 / 365 },
};

const isLegacyPlanId = (id) => Object.prototype.hasOwnProperty.call(LEGACY_PASSES, id);

/** The pass a checkout item stands for, or null if it isn't a plan. */
function passForItem(item) {
  const pass = parseCheckoutItemId(item.id);
  if (pass) return pass;
  const legacy = LEGACY_PASSES[item.id];
  if (legacy) {
    return {
      planKey: legacy.planKey,
      period: legacy.period,
      priceEur: item.priceEur,
      days: PERIOD_DAYS[legacy.period],
    };
  }
  return null;
}

/** The user's current pass in the shape billing.applyPass takes. */
function currentPass(user, now) {
  const plan = effectivePlan(user, { now });
  const stored = user.supervisionPlan || {};
  let rateEurPerDay = stored.rateEurPerDay;
  if (rateEurPerDay == null) {
    // Bought before rates were stored: the legacy table, or else today's
    // monthly rate for the plan as the closest known value.
    rateEurPerDay =
      LEGACY_PASSES[stored.plan]?.rateEurPerDay ??
      (plan.planKey && passFor(plan.planKey, "monthly")
        ? passFor(plan.planKey, "monthly").priceEur / PERIOD_DAYS.monthly
        : 0);
  }
  return { planKey: plan.planKey, expiresAt: plan.expiresAt, rateEurPerDay };
}

/** §4.3 wording, with the limit taken from config. */
const downgradeMessage = (max, active) =>
  `Starter includes up to ${max} supervisees. You have ${active} active. Archive ${active - max} to switch to Starter.`;

/**
 * What buying `pass` would do for `user`, without changing anything.
 * @returns {Promise<{ok: true, kind, creditedDays, expiresAt, pass} |
 *                   {ok: false, status: number, message: string}>}
 */
async function quote(user, pass, now = new Date()) {
  if (user.portalRole === "supervisee") {
    return {
      ok: false,
      status: 400,
      message:
        "This is a supervisee account. Supervision plans are for supervisors — please use a different account.",
    };
  }
  const plan = effectivePlan(user, { now });
  if (plan.complimentary) {
    return { ok: false, status: 400, message: "This account already has free access to the portal." };
  }

  // A plan with a supervisee limit can't be bought while over it (§4.3).
  const max = LIMITS[pass.planKey]?.max_active_supervisees;
  if (Number.isFinite(max) && user.portalRole === "supervisor") {
    const active = await SuperviseeProfile.countDocuments({ supervisorId: user._id, archivedAt: null });
    if (active > max) return { ok: false, status: 400, message: downgradeMessage(max, active) };
  }

  const result = applyPass(currentPass(user, now), pass, now);
  return {
    ok: true,
    pass,
    kind: result.kind,
    creditedDays: result.creditedDays,
    expiresAt: result.expiresAt,
  };
}

/**
 * Apply a paid pass to `user` (not saved here). The order's snapshot is the
 * price that counts, never today's config.
 */
function apply(user, pass, now = new Date()) {
  const result = applyPass(currentPass(user, now), pass, now);
  user.supervisionPlan = {
    ...(user.supervisionPlan?.toObject ? user.supervisionPlan.toObject() : user.supervisionPlan),
    planKey: pass.planKey,
    expiresAt: result.expiresAt,
    rateEurPerDay: result.rateEurPerDay,
  };
  if (!user.portalRole) user.portalRole = "supervisor";
  return result;
}

module.exports = { quote, apply, passForItem, isLegacyPlanId, currentPass, downgradeMessage };
