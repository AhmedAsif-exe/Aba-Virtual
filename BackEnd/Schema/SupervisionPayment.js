const mongoose = require("mongoose");

/**
 * Whether a supervisee has paid their supervisor's fee for one month. The
 * supervisor's own bookkeeping: money changes hands outside the site, and she
 * records it here so both sides can see where things stand.
 *
 * A month with no row is simply "not recorded" — neither paid nor owed — so
 * a supervisor who never uses this sees nothing change.
 */
const supervisionPaymentSchema = new mongoose.Schema(
  {
    superviseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperviseeProfile",
      required: true,
      index: true,
    },

    // "YYYY-MM", the same month keys the progress chart uses.
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },

    status: { type: String, enum: ["paid", "unpaid"], required: true },

    // Free text, so "Rs 15,000" or "€50" both work; optional.
    amount: { type: String, default: "", trim: true, maxlength: 50 },
    note: { type: String, default: "", trim: true, maxlength: 500 },

    // Last time a reminder email went out for this month.
    reminderSentAt: { type: Date, default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// One record per supervisee per month; setting a month again updates it.
supervisionPaymentSchema.index({ superviseeId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("SupervisionPayment", supervisionPaymentSchema);
