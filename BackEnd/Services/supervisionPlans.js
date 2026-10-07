// Paid access to the supervision portal, for supervisors.
//
// PayFast takes one-off payments only, so a "plan" is a block of time, not a
// subscription: each payment adds 30 or 365 days to the account's expiry.
// Renewing early stacks on top of what is left, so nobody loses days by
// paying before the end. Supervisees never pay — the plan is checked on the
// supervisor's routes only — and nothing is deleted when a plan lapses; the
// portal simply locks until the next payment.

const SUPERVISION_PLANS = {
  "supervision-monthly": { title: "Supervision Portal — Monthly", priceEur: 30, days: 30 },
  "supervision-yearly": { title: "Supervision Portal — Yearly", priceEur: 350, days: 365 },
};

// Free, permanently, whatever their plan says. Compared case-insensitively.
const COMPLIMENTARY_SUPERVISORS = ["ffaizan.aba@gmail.com"];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isPlanId = (id) => Object.prototype.hasOwnProperty.call(SUPERVISION_PLANS, id);

const isComplimentary = (user) =>
  COMPLIMENTARY_SUPERVISORS.includes(String(user?.email || "").toLowerCase());

/** What the frontend and the route guard need to know, in one shape. */
function planStatus(user, now = new Date()) {
  if (isComplimentary(user)) {
    return { active: true, complimentary: true, plan: null, expiresAt: null, daysLeft: null };
  }
  const expiresAt = user?.supervisionPlan?.expiresAt
    ? new Date(user.supervisionPlan.expiresAt)
    : null;
  const active = Boolean(expiresAt && expiresAt > now);
  return {
    active,
    complimentary: false,
    plan: user?.supervisionPlan?.plan || null,
    expiresAt,
    daysLeft: active ? Math.ceil((expiresAt - now) / MS_PER_DAY) : 0,
  };
}

/**
 * Add a paid period to `user` (not saved here — the caller saves once).
 * Starts from the current expiry when there is time left, else from now.
 * Grants the supervisor role to an account that has no portal role yet; a
 * supervisee is refused at checkout, so it never reaches this point.
 */
function extendPlan(user, planId, now = new Date()) {
  const plan = SUPERVISION_PLANS[planId];
  if (!plan) return;
  const current = user.supervisionPlan?.expiresAt ? new Date(user.supervisionPlan.expiresAt) : null;
  const from = current && current > now ? current : now;
  user.supervisionPlan = {
    plan: planId,
    expiresAt: new Date(from.getTime() + plan.days * MS_PER_DAY),
  };
  if (!user.portalRole) user.portalRole = "supervisor";
}

module.exports = {
  SUPERVISION_PLANS,
  COMPLIMENTARY_SUPERVISORS,
  isPlanId,
  isComplimentary,
  planStatus,
  extendPlan,
};
