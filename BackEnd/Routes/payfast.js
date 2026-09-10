const express = require("express");
const router = express.Router();

const User = require("../Schema/User");
const Order = require("../Schema/Order");
const { resolveCart, BUNDLE_CONTENTS } = require("../Services/pricing");
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

// PayFast wants 92-3XXXXXXXXX. Accept what users actually type.
function normaliseMobile(input) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("0092")) local = local.slice(4);
  else if (local.startsWith("92")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  // Pakistani mobiles are 3XXXXXXXXX (10 digits) once normalised.
  if (!/^3\d{9}$/.test(local)) return null;
  return `92-${local}`;
}

/**
 * POST /payfast/initiate
 * Body: { itemIds: string[], mobile: string, displayCurrency?, displayAmount? }
 *
 * Prices are resolved server-side from the catalogue — the client sends only
 * IDs, never amounts.
 */
router.post("/initiate", ensureAuth, async (req, res) => {
  try {
    const { itemIds, mobile, displayCurrency, displayAmount } = req.body || {};

    const customerMobile = normaliseMobile(mobile);
    if (!customerMobile) {
      return res.status(400).json({
        error: "A valid Pakistani mobile number is required (e.g. 03001234567)",
      });
    }

    const ids = Array.isArray(itemIds) ? itemIds : [];
    if (!ids.length) return res.status(400).json({ error: "Cart is empty" });

    const priced = await resolveCart(ids);

    // Don't let someone re-buy what they already own.
    const owned = new Set((req.user.paidItems || []).map((i) => i.id));
    const duplicates = priced.items.filter((i) => owned.has(i.id));
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
      customer: { email: req.user.email, mobile: customerMobile },
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
      customerMobile,
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
    const order = await Order.findOne({ basketId });
    if (!order) return fail("Unknown order", 404);

    // Idempotency: the IPN and the redirect describe the same payment.
    if (order.status !== "pending") {
      if (isRedirect) {
        return res.redirect(
          `${frontendBase()}/${order.status === "paid" ? "success" : "error"}`,
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

    // Verified success — grant the goods.
    const user = await User.findById(order.userId);
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
    const granted = [...idsToGrant]
      .filter((id) => !owned.has(id))
      .map((id) => ({ id, purchasedAt: new Date() }));

    if (granted.length) {
      user.paidItems.push(...granted);
      await user.save();
    }

    order.status = "paid";
    order.paidAt = new Date();
    await order.save();

    console.log(
      `[PAYFAST] ${basketId} PAID user=${user.email} txn=${transactionId} granted=${granted.length}`,
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
