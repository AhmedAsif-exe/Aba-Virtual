// Authoritative, server-side pricing.
//
// The client sends us only item IDs — never prices. Everything chargeable is
// priced here from a source the customer cannot edit: Sanity for resources,
// and a mirrored catalogue for games (which live in the frontend, not the CMS).
//
// PayFast settles in PKR, so the EUR catalogue total is converted here too.

const { createClient } = require("@sanity/client");

const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  apiVersion: "2025-09-04",
  useCdn: false,
});

// --- Games catalogue -------------------------------------------------------
// Games aren't Sanity documents; their prices are declared in the frontend
// (Pages/Games/GamesHome.jsx). Mirrored here so the server can price them
// independently. Keep both sides in step when prices change.
const GAMES_BUNDLE_ID = "domain1-bundle-levels-3-10";
const GAMES_BUNDLE_PRICE_EUR = 25.0;
const INDIVIDUAL_GAME_PRICE_EUR = 3.5;
// Games 1-2 are free; only 3-10 are sold individually (matches Routes/games.js).
const INDIVIDUAL_GAME_ID = /^domain1-game-([3-9]|10)$/;

function priceGameItem(id) {
  if (id === GAMES_BUNDLE_ID) {
    return {
      title: "Domain 1 Bundle (Levels 3-10)",
      priceEur: GAMES_BUNDLE_PRICE_EUR,
    };
  }
  const match = INDIVIDUAL_GAME_ID.exec(id);
  if (match) {
    return {
      title: `Domain 1 - Game ${match[1]}`,
      priceEur: INDIVIDUAL_GAME_PRICE_EUR,
    };
  }
  return null;
}

// --- FFC Bundle -------------------------------------------------------
// Not a Sanity document either — mirrors FrontEnd/src/Utils/staticResources.js.
// Keep the id and price in step with that file if either changes.
const FFC_BUNDLE_ID = "ffc-bundle";
// EUR fallback only — the charged price is FIXED_PKR_PRICES below.
const FFC_BUNDLE_PRICE_EUR = 56.0;
// The real Sanity resource + game IDs a paid FFC Bundle unlocks, on top of
// the bundle's own ID. Verified against the live dataset — keep in step if
// any of these resources/games are ever renamed or removed.
const FFC_BUNDLE_CONTENTS = [
  "0063aeaf-3355-42f2-9533-31482f8aa7f9", // FFC- Class Guide book
  "66a24624-06f8-4b54-9357-1f6a8f267545", // FFC- Feature Guide Book
  "c10906d4-bc72-482e-b5c1-d11e097f7bd6", // FFC- Function Guide Book
  "8f66126b-11a1-44b7-8f5c-5692c70d5caf", // FFC- Features Workbook
  "ffb1b868-2dc1-433e-af32-a4347ce8901c", // FFC- Function workbook
  "domain1-game-3",
  "domain1-game-4",
  "domain1-game-5",
  "domain1-game-6",
  "domain1-game-7",
  "domain1-game-8",
  "domain1-game-9",
  "domain1-game-10",
];

// --- Training Bundle --------------------------------------------------
// Also not a Sanity document — mirrors FrontEnd/src/Utils/staticResources.js.
const TRAINING_BUNDLE_ID = "training-bundle";
// EUR fallback only — the charged price is FIXED_PKR_PRICES below.
const TRAINING_BUNDLE_PRICE_EUR = 22.8;
// The real Sanity training IDs a paid Training Bundle unlocks. Verified
// against the live dataset.
const TRAINING_BUNDLE_CONTENTS = [
  "3bab9f72-b36a-4b22-a25f-92143533cc3b", // Training #1: Frequency
  "556722fa-61b3-40e0-a7ec-3e246e50c238", // Training #3: Rate Measurement
  "5a057717-3f83-4f04-96e4-a149fd3db9d8", // Training #2: Duration and Latency
  "bf63f6fb-c3ff-4787-aba7-fb3ed74d9a1a", // Training #4: Whole Interval
];

// --- Fixed PKR prices --------------------------------------------------
// These items are priced in PKR, not EUR: Pakistani visitors see exactly this
// figure, PayFast charges exactly this figure, and EUR/USD visitors see it
// converted at the live rate. Anything not listed stays EUR-priced (Sanity
// `price` / the constants above). The frontend reads this map from
// GET /paypal/currency, so this is the only place to change these prices.
const FIXED_PKR_PRICES = {
  "0063aeaf-3355-42f2-9533-31482f8aa7f9": 2500, // FFC- Class Guide book
  "66a24624-06f8-4b54-9357-1f6a8f267545": 2500, // FFC- Feature Guide Book
  "c10906d4-bc72-482e-b5c1-d11e097f7bd6": 2500, // FFC- Function Guide Book
  "8f66126b-11a1-44b7-8f5c-5692c70d5caf": 2500, // FFC- Features Workbook
  "ffb1b868-2dc1-433e-af32-a4347ce8901c": 2500, // FFC- Function workbook
  "3bab9f72-b36a-4b22-a25f-92143533cc3b": 2000, // Training #1: Frequency
  "5a057717-3f83-4f04-96e4-a149fd3db9d8": 2000, // Training #2: Duration and Latency
  "556722fa-61b3-40e0-a7ec-3e246e50c238": 2000, // Training #3: Rate Measurement
  "bf63f6fb-c3ff-4787-aba7-fb3ed74d9a1a": 2000, // Training #4: Whole Interval
  [FFC_BUNDLE_ID]: 17000,
  [TRAINING_BUNDLE_ID]: 7500,
};

// EUR-priced items are charged in whole rupees rounded to the nearest 50 —
// the same rounding the frontend displays (Utils/Context.jsx), so the PKR
// price shown is the PKR price charged.
const pkrFromEur = (eur, eurToPkr) => Math.round((eur * eurToPkr) / 50) * 50;

function priceStaticItem(id) {
  if (id === FFC_BUNDLE_ID) {
    return { title: "FFC Bundle", priceEur: FFC_BUNDLE_PRICE_EUR };
  }
  if (id === TRAINING_BUNDLE_ID) {
    return { title: "Training Bundle", priceEur: TRAINING_BUNDLE_PRICE_EUR };
  }
  return null;
}

// --- FX --------------------------------------------------------------------
// Same source and cache policy as the existing /paypal/currency endpoint.
let fxCache = { at: 0, rates: null };
const FX_TTL_MS = 60 * 60 * 1000;

async function getEurRates() {
  if (fxCache.rates && Date.now() - fxCache.at < FX_TTL_MS) return fxCache.rates;
  const res = await fetch("https://open.er-api.com/v6/latest/EUR");
  if (!res.ok) throw new Error("FX fetch failed");
  const data = await res.json();
  if (data.result !== "success" || !data.rates)
    throw new Error("FX bad payload");
  fxCache = { at: Date.now(), rates: data.rates };
  return data.rates;
}

async function getEurToPkrRate() {
  const rates = await getEurRates();
  const rate = Number(rates.PKR);
  if (!rate || rate <= 0) throw new Error("No EUR->PKR rate available");
  return rate;
}

const round2 = (n) => Math.round(n * 100) / 100;

// --- TEMPORARY: live-payment test overrides ---------------------------------
// Forces specific items to a fixed PKR amount so a real payment can be proven
// end to end for pocket change instead of full price. Catalogue prices and the
// euro totals shown to customers are untouched — only the PKR charged changes.
//
//   PRICING_TEST_PKR_OVERRIDES="<sanityId>:50,<otherId>:20"
//
// REMOVE THIS ENV VAR BEFORE SELLING FOR REAL, or those items stay near-free.
function parseTestOverrides() {
  const raw = process.env.PRICING_TEST_PKR_OVERRIDES;
  if (!raw) return null;
  const map = new Map();
  for (const pair of raw.split(",")) {
    const [id, amount] = pair.split(":").map((s) => (s || "").trim());
    const pkr = Number(amount);
    if (id && pkr > 0) map.set(id, pkr);
  }
  return map.size ? map : null;
}

// --- Cart resolution -------------------------------------------------------

/**
 * Price a cart from item IDs alone.
 *
 * The cart reducer (Utils/Context.jsx) rejects duplicate IDs, so every line is
 * quantity 1 — IDs are de-duplicated here to keep that true server-side.
 *
 * Throws if any ID is unknown or unpriced, so an unrecognised item can never be
 * silently charged as free.
 *
 * @param {string[]} itemIds
 * @returns {Promise<{items: Array, eurTotal: number, fxRate: number, pkrAmount: number}>}
 */
async function resolveCart(itemIds) {
  const ids = [...new Set((itemIds || []).filter(Boolean).map(String))];
  if (!ids.length) throw new Error("Cart is empty");

  const items = [];
  const sanityIds = [];

  for (const id of ids) {
    const game = priceGameItem(id);
    const staticItem = priceStaticItem(id);
    if (game) items.push({ id, title: game.title, priceEur: game.priceEur });
    else if (staticItem)
      items.push({ id, title: staticItem.title, priceEur: staticItem.priceEur });
    else sanityIds.push(id);
  }

  if (sanityIds.length) {
    const docs = await sanity.fetch(
      `*[_type == "resource" && _id in $ids]{_id, title, price}`,
      { ids: sanityIds },
    );
    const byId = new Map(docs.map((d) => [d._id, d]));

    for (const id of sanityIds) {
      const doc = byId.get(id);
      if (!doc) throw new Error(`Unknown item: ${id}`);
      if (typeof doc.price !== "number" || !(doc.price >= 0))
        throw new Error(`Item is not priced: ${id}`);
      items.push({ id, title: doc.title, priceEur: doc.price });
    }
  }

  const fxRate = await getEurToPkrRate();

  // Priced per line, exactly as the cart displays it. For fixed-PKR items,
  // priceEur is the EUR equivalent at today's rate (for reporting only).
  for (const item of items) {
    const fixed = FIXED_PKR_PRICES[item.id];
    if (fixed) {
      item.pricePkr = fixed;
      item.priceEur = round2(fixed / fxRate);
    } else {
      item.pricePkr = pkrFromEur(item.priceEur, fxRate);
    }
  }

  const eurTotal = round2(items.reduce((sum, i) => sum + i.priceEur, 0));
  const listPkr = items.reduce((sum, i) => sum + i.pricePkr, 0);

  const overrides = parseTestOverrides();
  let pkrAmount = listPkr;
  let testOverrideApplied = false;

  if (overrides) {
    pkrAmount = items.reduce((sum, i) => {
      const forced = overrides.get(i.id);
      if (forced) testOverrideApplied = true;
      return sum + (forced || i.pricePkr);
    }, 0);
    if (testOverrideApplied) {
      console.warn(
        `[PRICING] TEST OVERRIDE ACTIVE - charging PKR ${pkrAmount} instead of ${listPkr}. Unset PRICING_TEST_PKR_OVERRIDES before selling.`,
      );
    }
  }

  return { items, eurTotal, fxRate, pkrAmount, testOverrideApplied };
}

// Map from a bundle's own id to the real ids it unlocks, for granting
// entitlement on a successful purchase.
const BUNDLE_CONTENTS = {
  [FFC_BUNDLE_ID]: FFC_BUNDLE_CONTENTS,
  [TRAINING_BUNDLE_ID]: TRAINING_BUNDLE_CONTENTS,
};

module.exports = {
  resolveCart,
  getEurRates,
  getEurToPkrRate,
  FIXED_PKR_PRICES,
  priceGameItem,
  GAMES_BUNDLE_ID,
  BUNDLE_CONTENTS,
};
