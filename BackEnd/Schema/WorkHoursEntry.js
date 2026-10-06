const mongoose = require("mongoose");

/**
 * One week of hours a supervisee worked. Self-reported by the supervisee;
 * the supervisor can correct any entry from her admin view.
 *
 * These are the trainee's *fieldwork* hours, not time spent with the
 * supervisor — that is SupervisionMeeting, and the two totals are reported
 * separately because the boards count them separately.
 */
const workHoursEntrySchema = new mongoose.Schema(
  {
    superviseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperviseeProfile",
      required: true,
      index: true,
    },

    // Normalised to Monday 00:00 UTC on write (see Services/supervision.js)
    // so the unique index below can actually do its job.
    weekStartDate: { type: Date, required: true },

    // 168 is the number of hours in a week; anything above it is a typo, and
    // a typo in this field inflates a figure a certifying board will read.
    hours: { type: Number, required: true, min: 0, max: 168 },

    note: { type: String, default: "", trim: true },

    // Distinguishes a self-reported week from a supervisor correction. Keeps
    // an audit trail if a board ever asks how the total was arrived at.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// One entry per supervisee per week. A double-submitted form would otherwise
// silently double that week's contribution to the running total, and nothing
// downstream would ever flag it. Editing a week is an update, not a new row.
workHoursEntrySchema.index({ superviseeId: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model("WorkHoursEntry", workHoursEntrySchema);
