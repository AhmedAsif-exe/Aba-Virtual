const mongoose = require("mongoose");

/**
 * One row per reminder email sent about one pass (§4.2).
 *
 * The row is written before the email goes out, and the unique index means
 * a second run of the job can't send it again. It's keyed on the pass's
 * expiresAt, so a renewal (a new expiresAt) leaves no stale reminder behind.
 */
const planReminderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, required: true },
    kind: { type: String, enum: ["7d", "1d", "expired"], required: true },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

planReminderSchema.index({ userId: 1, expiresAt: 1, kind: 1 }, { unique: true });

module.exports = mongoose.model("PlanReminder", planReminderSchema);
