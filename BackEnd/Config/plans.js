// Supervision portal plans: prices, pass lengths and what each plan includes.
//
// The single source of truth. The pricing page reads it through
// GET /supervision/plans, checkout prices from it, and the entitlements
// module (Services/entitlements.js) reads FEATURES — nothing else may
// hard-code a price or a plan name check.
//
// Prices can change without a deploy: set SUPERVISION_PLAN_PRICES to JSON
// such as {"starter":{"monthly":15,"yearly":150}} and restart the backend.
// Anything missing or invalid falls back to the defaults below.

const PERIOD_DAYS = { monthly: 30, yearly: 365 };

const DEFAULT_PRICES_EUR = {
  starter: { monthly: 15, yearly: 150 },
  professional: { monthly: 30, yearly: 300 },
  clinic: { monthly: 80, yearly: 800 },
};

// Display order on the pricing page (§8.1).
const PLAN_ORDER = ["supervisee", "starter", "professional", "clinic", "custom"];

const PLAN_NAMES = {
  supervisee: "Supervisee",
  starter: "Starter",
  professional: "Professional",
  clinic: "Clinic",
  custom: "Custom",
};

// What each supervisor plan includes (§3). Expiry is not a feature: a lapsed
// pass keeps these for reading and loses every write (Services/entitlements.js).
const FEATURES = {
  starter: {
    review_hours: true,
    meetings: true,
    progress: true,
    assignments: true,
    boards: true,
    view_only_sharing: false,
    payment_tracking: false,
    multi_supervisor: false,
    clinic_dashboard: false,
    move_supervisees: false,
  },
  professional: {
    review_hours: true,
    meetings: true,
    progress: true,
    assignments: true,
    boards: true,
    view_only_sharing: true,
    payment_tracking: true,
    multi_supervisor: false,
    clinic_dashboard: false,
    move_supervisees: false,
  },
  clinic: {
    review_hours: true,
    meetings: true,
    progress: true,
    assignments: true,
    boards: true,
    view_only_sharing: true,
    payment_tracking: true,
    multi_supervisor: true,
    clinic_dashboard: true,
    move_supervisees: true,
  },
  custom: {
    review_hours: true,
    meetings: true,
    progress: true,
    assignments: true,
    boards: true,
    view_only_sharing: true,
    payment_tracking: true,
    multi_supervisor: true,
    clinic_dashboard: true,
    move_supervisees: true,
  },
};

const LIMITS = {
  starter: { max_active_supervisees: 3, seat_limit: 1 },
  professional: { max_active_supervisees: Infinity, seat_limit: 1 },
  clinic: { max_active_supervisees: Infinity, seat_limit: 5 },
  // A Custom organisation's seat limit is set per organisation.
  custom: { max_active_supervisees: Infinity, seat_limit: null },
};

// Plans a customer can buy at checkout in Phase 1. Clinic checkout creates
// an organisation and arrives in Phase 2; Custom is invoiced by hand.
const PURCHASABLE = ["starter", "professional"];

const isPositive = (n) => typeof n === "number" && Number.isFinite(n) && n > 0;

function readPriceOverrides() {
  const raw = process.env.SUPERVISION_PLAN_PRICES;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    console.error("[PLANS] SUPERVISION_PLAN_PRICES is not valid JSON; using default prices");
    return {};
  }
}

/** Current EUR prices, defaults overlaid with any valid env override. */
function pricesEur() {
  const overrides = readPriceOverrides();
  const prices = {};
  for (const [planKey, defaults] of Object.entries(DEFAULT_PRICES_EUR)) {
    prices[planKey] = { ...defaults };
    for (const period of Object.keys(PERIOD_DAYS)) {
      const value = overrides[planKey]?.[period];
      if (value === undefined) continue;
      if (isPositive(value)) prices[planKey][period] = value;
      else console.error(`[PLANS] ignoring invalid price for ${planKey}.${period}: ${value}`);
    }
  }
  return prices;
}

/** One pass: { planKey, period, priceEur, days }, or null if it isn't sold. */
function passFor(planKey, period) {
  const price = pricesEur()[planKey]?.[period];
  if (!price || !PERIOD_DAYS[period]) return null;
  return { planKey, period, priceEur: price, days: PERIOD_DAYS[period] };
}

const round2 = (n) => Math.round(n * 100) / 100;

/** Yearly maths shown on the page: saving = monthly × 12 − yearly. */
function yearlySavings(planKey) {
  const p = pricesEur()[planKey];
  if (!p) return null;
  return {
    monthlyEquivalentEur: round2(p.yearly / 12),
    savingEur: round2(p.monthly * 12 - p.yearly),
  };
}

const showClinicPlan = () => process.env.SHOW_CLINIC_PLAN === "true";

const checkoutItemId = (planKey, period) => `plan:${planKey}:${period}`;

/** "plan:starter:yearly" → the pass, or null for anything else. */
function parseCheckoutItemId(id) {
  const match = /^plan:([a-z]+):(monthly|yearly)$/.exec(String(id));
  if (!match || !PURCHASABLE.includes(match[1])) return null;
  return passFor(match[1], match[2]);
}

module.exports = {
  PERIOD_DAYS,
  PLAN_ORDER,
  PLAN_NAMES,
  FEATURES,
  LIMITS,
  PURCHASABLE,
  pricesEur,
  passFor,
  yearlySavings,
  showClinicPlan,
  checkoutItemId,
  parseCheckoutItemId,
};
