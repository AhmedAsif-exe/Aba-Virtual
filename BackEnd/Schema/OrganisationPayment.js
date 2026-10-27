const mongoose = require("mongoose");

/**
 * A payment recorded by hand for a Custom organisation (§7): an invoice or
 * a bank transfer, outside PayFast.
 */
const organisationPaymentSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
      index: true,
    },
    method: { type: String, enum: ["invoice", "bank_transfer"], required: true },
    reference: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["EUR", "PKR", "USD"], required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OrganisationPayment", organisationPaymentSchema);
