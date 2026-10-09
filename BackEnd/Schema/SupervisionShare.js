const mongoose = require("mongoose");

/**
 * Read-only access to a supervisor's whole portal, granted by email — for
 * example to the supervisor's own supervisor.
 *
 * Keyed on the email address rather than a user id so access can be granted
 * before the person has an account: whoever signs in with that address (by
 * password or Google) gets the view. Removing the row removes the access.
 */
const supervisionShareSchema = new mongoose.Schema(
  {
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
  },
  { timestamps: true },
);

supervisionShareSchema.index({ supervisorId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model("SupervisionShare", supervisionShareSchema);
