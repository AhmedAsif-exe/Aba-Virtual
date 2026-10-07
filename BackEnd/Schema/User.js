const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  googleId: String,
  email: { type: String, unique: true },
  password: String,
  name: String,
  pfp: { type: String, default: null }, // URL to profile picture (e.g., from Google)
  role: {
    type: String,
    enum: ["Parent", "Trainer", "Caretaker"],
    default: null,
  },

  // Permission level for the supervision portal. Deliberately NOT `role`
  // above: that one is a self-declared descriptor the user sets themselves
  // from the account page, so folding portal access into it would let any
  // customer grant themselves a supervisee's — or a supervisor's — view by
  // picking a radio button. Nothing in the API accepts this field from a
  // request body; it is set by scripts/promoteSupervisor.js and by the
  // supervisor creating a supervisee account.
  portalRole: {
    type: String,
    enum: ["supervisee", "supervisor"],
    default: null,
    index: true,
  },

  // Set when the supervisor creates an account with a generated temporary
  // password; cleared by POST /auth/change-password. The portal refuses to
  // show anything else until it is cleared.
  mustChangePassword: { type: Boolean, default: false },

  // Paid supervisor access (Services/supervisionPlans.js). Only ever written
  // by a verified PayFast payment; complimentary accounts ignore it.
  supervisionPlan: {
    plan: { type: String, default: null },
    expiresAt: { type: Date, default: null },
  },

  paidItems: [
    {
      id: String,
      purchasedAt: { type: Date, default: Date.now },
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
