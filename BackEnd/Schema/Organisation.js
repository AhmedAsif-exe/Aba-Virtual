const mongoose = require("mongoose");

/**
 * A team on one pass: Clinic (Phase 2) or Custom (set up by a site admin).
 * Members share its plan and expiry (Services/entitlements.js).
 */
const organisationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    planKey: { type: String, enum: ["clinic", "custom"], required: true },
    // Supervisor logins allowed: 5 for Clinic, set per customer for Custom.
    seatLimit: { type: Number, required: true, min: 1 },
    // UTC; the whole organisation goes read-only at this moment.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Organisation", organisationSchema);
