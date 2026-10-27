// Pass maths for the supervision portal (§4.1, §4.3, §5). Pure functions:
// no database, no clock — `now` is always passed in, so every rule is
// unit-tested (test/billing.test.js).
//
// A pass's remaining value is tracked as one blended rate, rateEurPerDay:
// remaining days × rate is what the unused time was paid for, however many
// passes were stacked to get there.

const DAY_MS = 24 * 60 * 60 * 1000;

// Floating-point guard for floor/ceil: 7.5 must not floor from 7.4999999.
const EPSILON = 1e-9;

/** Whole and fractional days left on a pass; 0 once it has ended. */
function remainingDays(expiresAt, now) {
  if (!expiresAt) return 0;
  return Math.max(0, (new Date(expiresAt).getTime() - now.getTime()) / DAY_MS);
}

const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

/**
 * Same plan again (§4.1): new_expiry = max(now, current_expiry) + period_days.
 * The rate becomes the weighted average of the time left and the new pass.
 */
function renew({ expiresAt, rateEurPerDay }, pass, now) {
  const remaining = remainingDays(expiresAt, now);
  const from = remaining > 0 ? new Date(expiresAt) : now;
  const leftValue = remaining * (rateEurPerDay || 0);
  return {
    expiresAt: addDays(from, pass.days),
    rateEurPerDay: (leftValue + pass.priceEur) / (remaining + pass.days),
    creditedDays: 0,
  };
}

/**
 * Different plan while a pass is active (§4.3):
 *   remaining_value = remaining_days × (old_price ÷ old_period_days)
 *   credited_days   = floor(remaining_value ÷ (new_price ÷ new_period_days))
 *   new_expiry      = now + credited_days + purchased_period_days
 * The old per-day price is the blended rate, never read from current config.
 */
function change({ expiresAt, rateEurPerDay }, pass, now) {
  const remainingValue = remainingDays(expiresAt, now) * (rateEurPerDay || 0);
  const creditedDays = Math.floor((remainingValue * pass.days) / pass.priceEur + EPSILON);
  return {
    expiresAt: addDays(now, creditedDays + pass.days),
    rateEurPerDay: pass.priceEur / pass.days,
    creditedDays,
  };
}

/**
 * Which rule a purchase follows, and its result.
 *   same planKey            → "renewal" (stacks, §4.1)
 *   other planKey, time left → "change"  (converts, §4.3)
 *   nothing to carry over    → "new"
 */
function applyPass(current, pass, now) {
  const active = remainingDays(current?.expiresAt, now) > 0;
  if (current?.planKey === pass.planKey) {
    return { kind: "renewal", ...renew(current, pass, now) };
  }
  if (current?.planKey && active) {
    return { kind: "change", ...change(current, pass, now) };
  }
  return { kind: "new", ...renew({ expiresAt: null, rateEurPerDay: 0 }, pass, now) };
}

/**
 * One-time credit for a price cut (§5): the difference, in days at the new
 * rate, rounded up as the spec states (€50 ÷ (€300 / 365) = 60.8 → 61).
 */
function migrationCreditDays(paidEur, newPriceEur, periodDays) {
  const difference = paidEur - newPriceEur;
  if (difference <= 0) return 0;
  return Math.ceil((difference * periodDays) / newPriceEur - EPSILON);
}

module.exports = {
  DAY_MS,
  remainingDays,
  addDays,
  renew,
  change,
  applyPass,
  migrationCreditDays,
};
