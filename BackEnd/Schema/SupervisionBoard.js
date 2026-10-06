const mongoose = require("mongoose");

/**
 * A certifying board a supervisee works toward (BACB, IBAO, QABA, ...).
 *
 * Deliberately a collection rather than an enum on SuperviseeProfile: the
 * supervisor adds boards herself from the admin panel as she takes on
 * trainees under new certifications, and an enum would mean a code change
 * and a deploy every time.
 *
 * Boards are retired by clearing `active`, never deleted, because profiles
 * point at them and an hour log that loses its board is worthless for the
 * certification it was gathered for.
 */
const supervisionBoardSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },

    // "Behavior Analyst Certification Board" — shown as help text next to the
    // abbreviation, which is all anyone actually says out loud.
    fullName: { type: String, trim: true, default: "" },

    // Prefills only. The real figures live on the profile because they vary
    // per supervisee even within one board (see SuperviseeProfile).
    defaultRequiredHours: { type: Number, default: null, min: 0 },
    defaultRatio: { type: String, default: "", trim: true },

    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

supervisionBoardSchema.index({ sortOrder: 1, name: 1 });

module.exports = mongoose.model("SupervisionBoard", supervisionBoardSchema);
