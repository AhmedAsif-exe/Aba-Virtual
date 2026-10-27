const express = require("express");
const router = express.Router();

const User = require("../Schema/User");
const Order = require("../Schema/Order");
const { resolveCart, BUNDLE_CONTENTS } = require("../Services/pricing");
const { passForItem, quote, apply: applyPlan } = require("../Services/planPurchase");
const {
  payfastConfig,
  getAccessToken,
  buildCheckoutFields,
  verifyValidationHash,
  SUCCESS_CODE,
} = require("../Services/payfast");

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not authenticated" });
}

// PayFast calls back to us directly, so these must be publicly reachable in
// production. On localhost the browser redirect still works; the server-to-
// server IPN cannot reach a private host and simply won't arrive.
function backendBase() {
  return (process.env.BACKEND_PUBLIC_URL || "http://localhost:5000").replace(
    /\/+$/,
    "",
  );
}
function frontendBase() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

/**
 * POST /payfast/initiate
 * Body: { itemIds: string[], displayCurrency?, displayAmount? }
 *
 * Prices are resolved server-side from the catalogue — the client sends only
 * IDs, never amounts.
 */
router.post("/initiate", ensureAuth, async (req, res) => {
  try {
    const { itemIds, displayCurrency, displayAmount } = req.body || {};

    const ids = Array.isArray(itemIds) ? itemIds : [];
    if (!ids.length) return res.status(400).json({ error: "Cart is empty" });

    const priced = await resolveCart(ids, { pkrPricing: displayCurrency === "PKR" });

    // A plan is bought on its own, and only after quote() has checked who's
    // buying (a supervisee would pay and get nothing) and the Starter limit.
    // The quote is snapshotted on the order; the callback recomputes it at
    // payment time from the same snapshot price.
    let planSnapshot = null;
    const planItems = priced.items.filter((i) => passForItem(i));
    if (planItems.length) {
      if (priced.items.length > 1) {
        return res.status(400).json({ error: "A supervision plan is bought on its own." });
      }
      const pass = passForItem(planItems[0]);
      const quoted = await quote(req.user, pass);
      if (!quoted.ok) return res.status(quoted.status).json({ error: quoted.message });
      planSnapshot = {
        planKey: pass.planKey,
        period: pass.period,
        priceEur: pass.priceEur,
        periodDays: pass.days,
        kind: quoted.kind,
        quotedExpiresAt: quoted.expiresAt,
      };
    }

    // Don't let someone re-buy what they already own. Plans are exempt:
    // buying one again is a renewal, and it adds time rather than duplicating.
    const owned = new Set((req.user.paidItems || []).map((i) => i.id));
    const duplicates = priced.items.filter((i) => !passForItem(i) && owned.has(i.id));
    if (duplicates.length) {
      return res.status(400).json({
        error: `Already purchased: ${duplicates.map((d) => d.title).join(", ")}`,
      });
    }

    const config = payfastConfig();
    const basketId = Order.newBasketId();

    const order = await Order.create({
      basketId,
      userId: req.user._id,
      items: priced.items,
      amounts: {
        eurTotal: priced.eurTotal,
        pkrAmount: priced.pkrAmount,
        fxRate: priced.fxRate,
        displayCurrency: displayCurrency || "EUR",
        displayAmount: displayAmount ?? priced.eurTotal,
      },
      customer: { email: req.user.email },
      plan: planSnapshot,
      status: "pending",
    });

    const { token } = await getAccessToken(config, {
      amount: priced.pkrAmount,
      basketId,
      currency: "PKR",
    });

    const callback = `${backendBase()}/payfast/callback`;
    const fields = buildCheckoutFields({
      config,
      token,
      basketId,
      amount: priced.pkrAmount,
      currency: "PKR",
      description: `Aba Virtual order ${basketId}`,
      customerEmail: req.user.email,
      // Browser-facing return legs carry redirect=Y; the IPN leg does not.
      successUrl: `${callback}?redirect=Y`,
      failureUrl: `${callback}?redirect=Y`,
      checkoutUrl: callback,
    });

    console.log(
      `[PAYFAST] initiated ${basketId} user=${req.user.email} PKR ${priced.pkrAmount} (EUR ${priced.eurTotal} @ ${priced.fxRate})`,
    );

    res.json({
      postUrl: `${config.baseUrl}/PostTransaction`,
      fields,
      basketId,
      amountPkr: priced.pkrAmount,
      orderId: order._id,
    });
  } catch (err) {
    console.error("[PAYFAST] initiate failed:", err.message);
    res.status(500).json({ error: "Could not start checkout" });
  }
});

/**
 * Add a paid pass to the buyer's account. Priced from the order's snapshot,
 * never today's config. The write is conditional on the expiry it was
 * computed from, so two different orders paid at once for the same account
 * can't overwrite each other — the second retries on fresh data.
 */
async function applyPlanOrder(order) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const user = await User.findById(order.userId);
    if (!user) throw new Error(`Order ${order.basketId} has no user`);
    const before = user.supervisionPlan?.expiresAt || null;

    for (const item of order.items) {
      const pass = passForItem(item);
      if (!pass) continue;
      const snap = order.plan;
      const paid = snap
        ? { planKey: snap.planKey, period: snap.period, priceEur: snap.priceEur, days: snap.periodDays }
        : pass; // an order started before snapshots existed: its item price
      applyPlan(user, paid);
    }

    const { supervisionPlan, portalRole } = user.toObject();
    const result = await User.updateOne(
      { _id: user._id, "supervisionPlan.expiresAt": before },
      { $set: { supervisionPlan, portalRole } },
    );
    if (result.modifiedCount === 1) return user;
  }
  throw new Error(`Order ${order.basketId}: the account kept changing; plan not applied`);
}

/**
 * PayFast callback — hit twice for one payment: once server-to-server (IPN)
 * and once via the customer's browser (redirect=Y). Both are verified; the
 * first to arrive does the work and the second is a no-op.
 *
 * There is no session on these requests, so the basket ID is what identifies
 * the order and its owner.
 */
async function handleCallback(req, res) {
  const payload = { ...req.query, ...req.body };
  const basketId = payload.basket_id || payload.BASKET_ID;
  const errCode = String(payload.err_code ?? payload.ERR_CODE ?? "");
  const errMsg = payload.err_msg || payload.ERR_MSG || "";
  const transactionId = payload.transaction_id || payload.TRANSACTION_ID || "";
  const validationHash = payload.validation_hash || payload.VALIDATION_HASH;
  const isRedirect = String(payload.redirect || "") === "Y";

  const fail = (reason, httpCode = 400) => {
    console.warn(`[PAYFAST] callback rejected (${reason}) basket=${basketId}`);
    if (isRedirect) return res.redirect(`${frontendBase()}/error`);
    return res.status(httpCode).send(reason);
  };

  if (!basketId) return fail("Missing basket_id");

  // Authenticity check FIRST — nothing below may act on unverified input.
  if (!verifyValidationHash({ validationHash, basketId, errCode })) {
    return fail("Invalid validation_hash", 401);
  }

  try {
    // Idempotency: the IPN and the redirect describe the same payment, and
    // can arrive at the same moment. Claiming the order in one atomic step
    // means exactly one of them applies it; the other finds it taken. An
    // order left "processing" by a crash is fixed by hand, never re-applied.
    const order = await Order.findOneAndUpdate(
      { basketId, status: "pending" },
      { $set: { status: "processing" } },
      { new: true },
    );
    if (!order) {
      const existing = await Order.findOne({ basketId }).select("status").lean();
      if (!existing) return fail("Unknown order", 404);
      if (isRedirect) {
        return res.redirect(
          `${frontendBase()}/${existing.status === "failed" ? "error" : "success"}`,
        );
      }
      return res.status(200).send("Already processed");
    }

    order.payfast = {
      transactionId,
      statusCode: errCode,
      statusMsg: errMsg,
      raw: payload,
    };

    if (errCode !== SUCCESS_CODE) {
      order.status = "failed";
      await order.save();
      console.log(`[PAYFAST] ${basketId} FAILED code=${errCode} ${errMsg}`);
      return isRedirect
        ? res.redirect(`${frontendBase()}/error`)
        : res.status(200).send("OK");
    }

    // Verified success — grant the goods. Plans are time on the account, not
    // an owned item (paidItems would also fall to the one-year cleanup cron
    // in Routes/gateway.js), and are always bought on their own.
    const isPlanOrder = order.items.some((item) => passForItem(item));
    let user;
    let granted = [];
    if (isPlanOrder) {
      user = await applyPlanOrder(order);
      if (order.plan) order.plan.appliedExpiresAt = user.supervisionPlan.expiresAt;
    } else {
      user = await User.findById(order.userId);
      if (!user) return fail("Order has no user", 404);

      const owned = new Set((user.paidItems || []).map((i) => i.id));
      // A bundle's own id goes into paidItems like any other item, but it
      // should also unlock everything it bundles — otherwise the buyer paid
      // for the bundle and can't actually open anything inside it.
      const idsToGrant = new Set();
      for (const item of order.items) {
        idsToGrant.add(item.id);
        for (const bundledId of BUNDLE_CONTENTS[item.id] || []) idsToGrant.add(bundledId);
      }
      granted = [...idsToGrant]
        .filter((id) => !owned.has(id))
        .map((id) => ({ id, purchasedAt: new Date() }));

      if (granted.length) {
        user.paidItems.push(...granted);
        await user.save();
      }
    }

    order.status = "paid";
    order.paidAt = new Date();
    await order.save();

    console.log(
      `[PAYFAST] ${basketId} PAID user=${user.email} txn=${transactionId} granted=${granted.length}${
        isPlanOrder
          ? ` plan=${user.supervisionPlan.planKey} until=${user.supervisionPlan.expiresAt.toISOString()}`
          : ""
      }`,
    );

    return isRedirect
      ? res.redirect(`${frontendBase()}/success?basket=${basketId}`)
      : res.status(200).send("OK");
  } catch (err) {
    console.error("[PAYFAST] callback error:", err);
    return isRedirect
      ? res.redirect(`${frontendBase()}/error`)
      : res.status(500).send("Error");
  }
}

// PayFast uses POST for the IPN; the browser leg can arrive either way.
router.post("/callback", handleCallback);
router.get("/callback", handleCallback);

/** Lets the success page show what was actually bought. */
router.get("/order/:basketId", ensureAuth, async (req, res) => {
  const order = await Order.findOne({
    basketId: req.params.basketId,
    userId: req.user._id,
  }).lean();
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({
    basketId: order.basketId,
    status: order.status,
    items: order.items,
    amounts: order.amounts,
    paidAt: order.paidAt,
  });
});

module.exports = router;
