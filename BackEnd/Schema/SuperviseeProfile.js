const mongoose = require("mongoose");

/**
 * The supervision-specific half of a supervisee's identity.
 *
 * Kept out of the User document on purpose. Nearly every User is an
 * e-commerce customer who will never be supervised, and `GET /auth/me`
 * serialises the whole User — folding supervision fields in there would put
 * one trainee's compliance figures one careless spread operator away from
 * every other account.
 *
 * The board and the required-hours figure are supervisor-owned: boards set
 * different requirements and the supervisor enters them per person, so the
 * supervisee sees them read-only (enforced in Routes/supervision.js, which
 * never accepts them on the /me routes).
 */
const superviseeProfileSchema = new mongoose.Schema(
  {
    // The login this profile belongs to. Unique: one profile per account.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Who supervises them. Load-bearing for access control: a supervisor may
    // only ever reach profiles carrying their own id, so adding a second
    // supervisor later needs no change to the permission rules.
    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupervisionBoard",
      required: true,
    },

    // Entered manually per supervisee: requirements vary by board and by
    // when the trainee started, so this is never derived from the board.
    requiredTotalHours: { type: Number, required: true, min: 0 },

    // Display-only, e.g. "1:10" — one supervision hour per ten worked. Stored
    // as the string the supervisor typed and never parsed: the boards' rules
    // differ enough that a computed compliance figure would be more dangerous
    // than none, and she tracks the ratio herself.
    supervisionRatio: { type: String, default: "", trim: true },

    supervisionStartDate: { type: Date, required: true },

    // Name and email live on User; only the extra contact detail is here.
    contactPhone: { type: String, default: "", trim: true },

    status: {
      type: String,
      enum: ["active", "paused", "completed"],
      default: "active",
      index: true,
    },

    // Supervisor's private notes. Never leaves the server for a supervisee —
    // see toSuperviseeJSON, which whitelists rather than deletes, so a field
    // added here later stays private until someone deliberately exposes it.
    supervisorNotes: { type: String, default: "" },
  },
  { timestamps: true },
);

superviseeProfileSchema.index({ supervisorId: 1, status: 1 });

/**
 * `user` and `board` are passed in rather than read off the document so the
 * caller controls whether they were populated; a serializer that silently
 * omits half its output when someone forgets `.populate()` is a bug waiting
 * to ship.
 */
function baseJSON(profile, { user, board }) {
  return {
    _id: profile._id,
    name: user?.name || "",
    email: user?.email || "",
    pfp: user?.pfp || null,
    board: board ? { _id: board._id, name: board.name, fullName: board.fullName } : null,
    requiredTotalHours: profile.requiredTotalHours,
    supervisionRatio: profile.supervisionRatio,
    supervisionStartDate: profile.supervisionStartDate,
    contactPhone: profile.contactPhone,
    status: profile.status,
  };
}

superviseeProfileSchema.methods.toSuperviseeJSON = function toSuperviseeJSON(refs) {
  return baseJSON(this, refs);
};

superviseeProfileSchema.methods.toSupervisorJSON = function toSupervisorJSON(refs) {
  return {
    ...baseJSON(this, refs),
    userId: this.userId,
    supervisorNotes: this.supervisorNotes,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("SuperviseeProfile", superviseeProfileSchema);
