// What a supervisor's plan lets them do. The only place plan keys are
// interpreted: routes and middleware ask can() / canWrite() / limit(), and
// the answers come from FEATURES and LIMITS in Config/plans.js.
//
// Two separate questions, on purpose:
//   can(user, feature)  — does the plan include it? (unaffected by expiry)
//   canWrite(user)      — is the pass live? (expired = read-only, §4.4)
// Reads check can() only, so a lapsed supervisor still sees everything their
// plan included; writes need both.
//
// Pure: callers pass the organisation (Phase 2 / Custom) and `now`.

const { FEATURES, LIMITS } = require("../Config/plans");
const { COMPLIMENTARY_SUPERVISORS } = require("./supervisionPlans");

// Pre-migration plan ids (scripts/migratePlans.js moves everyone off them).
// Until then they read as Professional, which is what they were.
const LEGACY_PLAN_KEYS = {
  "supervision-monthly": "professional",
  "supervision-yearly": "professional",
};

const isComplimentary = (user) =>
  Boolean(user?.supervisionPlan?.complimentary) ||
  COMPLIMENTARY_SUPERVISORS.includes(String(user?.email || "").toLowerCase());

/**
 * The plan that applies to `user`: their organisation's when they belong to
 * one, otherwise their own pass.
 * @returns {{planKey: string|null, expiresAt: Date|null, active: boolean,
 *            complimentary: boolean, source: "user"|"organisation"|null,
 *            seatLimit: number|null}}
 */
function effectivePlan(user, { organisation = null, now = new Date() } = {}) {
  const own = ownPlan(user, now);
  if (!organisation) return own;

  // A member's own pass is kept separately (§6.3): while the organisation's
  // pass is live it applies; once it has ended, a live pass of their own
  // still does; otherwise they're read-only on the organisation's plan (§6.6).
  const expiresAt = organisation.expiresAt ? new Date(organisation.expiresAt) : null;
  const orgPlan = {
    planKey: organisation.planKey,
    expiresAt,
    active: Boolean(expiresAt && expiresAt > now),
    complimentary: false,
    source: "organisation",
    seatLimit: organisation.seatLimit ?? null,
  };
  if (orgPlan.active || !own.active) return orgPlan;
  return own;
}

/** The user's own pass, ignoring any organisation. */
function ownPlan(user, now) {
  const stored = user?.supervisionPlan || {};
  const planKey = stored.planKey || LEGACY_PLAN_KEYS[stored.plan] || null;

  if (isComplimentary(user)) {
    return {
      planKey: planKey || "professional",
      expiresAt: null,
      active: true,
      complimentary: true,
      source: "user",
      seatLimit: null,
    };
  }

  const expiresAt = stored.expiresAt ? new Date(stored.expiresAt) : null;
  return {
    planKey,
    expiresAt,
    active: Boolean(planKey && expiresAt && expiresAt > now),
    complimentary: false,
    source: planKey ? "user" : null,
    seatLimit: null,
  };
}

/** Does the plan include `feature`? Expiry does not change the answer. */
function can(user, feature, ctx) {
  const { planKey } = effectivePlan(user, ctx);
  return FEATURES[planKey]?.[feature] === true;
}

/** May the supervisor change anything? False once the pass has ended. */
function canWrite(user, ctx) {
  const plan = effectivePlan(user, ctx);
  return Boolean(plan.planKey && plan.active);
}

/** A numeric limit (`max_active_supervisees`, `seat_limit`); 0 with no plan. */
function limit(user, name, ctx) {
  const plan = effectivePlan(user, ctx);
  if (name === "seat_limit" && plan.seatLimit != null) return plan.seatLimit;
  return LIMITS[plan.planKey]?.[name] ?? 0;
}

/** Everything the browser needs to show or hide controls, in one object. */
function summary(user, ctx) {
  const plan = effectivePlan(user, ctx);
  const features = Object.fromEntries(
    Object.keys(FEATURES.custom).map((feature) => [feature, can(user, feature, ctx)]),
  );
  const maxActive = limit(user, "max_active_supervisees", ctx);
  return {
    planKey: plan.planKey,
    active: plan.active,
    complimentary: plan.complimentary,
    expiresAt: plan.expiresAt,
    canWrite: canWrite(user, ctx),
    features,
    // JSON has no Infinity; null means unlimited.
    maxActiveSupervisees: Number.isFinite(maxActive) ? maxActive : null,
  };
}

module.exports = { effectivePlan, can, canWrite, limit, summary, isComplimentary };
