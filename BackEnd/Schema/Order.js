const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * A payment attempt.
 *
 * Until now the only record of a purchase was `paidItems` on the User, written
 * straight from a client-supplied cart. PayFast needs more than that: its
 * result arrives on a request that carries no session cookie, so the basket ID
 * is the only thing tying a payment back to a user and a set of items. Prices
 * are snapshotted here at creation so a later catalogue edit can't rewrite what
 * someone was charged.
 */
const orderSchema = new mongoose.Schema(
  {
    // Sent to PayFast as `basket_id`, and echoed back on the result.
    basketId: { type: String, required: true, unique: true, index: true },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: [
      {
        _id: false,
        id: { type: String, required: true },
        title: String,
        priceEur: Number,
        pricePkr: Number,
      },
    ],

    amounts: {
      // Catalogue total, the currency everything is priced in.
      eurTotal: { type: Number, required: true },
      // What PayFast actually charges.
      pkrAmount: { type: Number, required: true },
      fxRate: { type: Number, required: true },
      // What the customer was shown, so support can reconcile a dispute
      // against the figure on screen rather than the figure on the card.
      displayCurrency: { type: String, default: "EUR" },
      displayAmount: Number,
    },

    // PayFast requires a mobile number; the cart never collected one before.
    customer: {
      email: String,
      mobile: String,
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },

    payfast: {
      transactionId: { type: String, index: true, sparse: true },
      statusCode: String,
      statusMsg: String,
      // Full gateway payload, kept verbatim for dispute resolution.
      raw: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    paidAt: Date,
  },
  { timestamps: true },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

/**
 * Basket IDs are visible to the customer and travel through the gateway, so
 * they must not be guessable — a predictable one would let someone poll or
 * tamper with another person's order. Time prefix keeps them sortable.
 */
orderSchema.statics.newBasketId = function newBasketId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ABA-${stamp}-${random}`;
};

module.exports = mongoose.model("Order", orderSchema);
