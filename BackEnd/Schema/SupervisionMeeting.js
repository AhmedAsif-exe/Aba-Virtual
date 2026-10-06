const mongoose = require("mongoose");

/**
 * One supervision session the supervisor delivered. Supervisor-authored:
 * these hours are her record of contact time, so the supervisee reads them
 * but never writes them.
 */
const supervisionMeetingSchema = new mongoose.Schema(
  {
    superviseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperviseeProfile",
      required: true,
      index: true,
    },

    date: { type: Date, required: true },

    // Minutes rather than hours: "30 min" and "1 hour" both land exactly, and
    // summing integers avoids the rounding drift a float hour count picks up
    // over a couple of hundred half-hour sessions.
    durationMinutes: { type: Number, required: true, min: 1, max: 1440 },

    format: {
      type: String,
      enum: ["individual", "group"],
      required: true,
    },

    notes: { type: String, default: "" },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// Drives the date-sorted table on the dashboard.
supervisionMeetingSchema.index({ superviseeId: 1, date: -1 });

module.exports = mongoose.model("SupervisionMeeting", supervisionMeetingSchema);
