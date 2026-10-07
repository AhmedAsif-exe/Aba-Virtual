const mongoose = require("mongoose");

/**
 * A piece of work the supervisor sets a supervisee. Optional throughout:
 * not every supervisor uses assignments, and those who do set them in very
 * different shapes (a reading, a case write-up, a link to a form), so no
 * single field is required. The route refuses only a wholly blank one.
 *
 * Supervisor-authored, except `status` (up to "submitted") and `response`,
 * which the supervisee updates as they work through it.
 */
const ASSIGNMENT_STATUSES = ["not_started", "in_progress", "submitted", "completed"];

// What a supervisee may set. "completed" is the supervisor's sign-off.
const SUPERVISEE_STATUSES = ["not_started", "in_progress", "submitted"];

const supervisionAssignmentSchema = new mongoose.Schema(
  {
    superviseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperviseeProfile",
      required: true,
      index: true,
    },

    title: { type: String, default: "", trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 5000 },

    // Stored at UTC midnight, like every other date in the portal.
    dueDate: { type: Date, default: null },

    // A reading, a shared doc, a form. http(s) only — checked in the route.
    link: { type: String, default: "", trim: true, maxlength: 2000 },

    status: { type: String, enum: ASSIGNMENT_STATUSES, default: "not_started" },

    // When it was marked completed, for the monthly progress chart. Set and
    // cleared by the status change itself (pre-validate hook below).
    completedAt: { type: Date, default: null },

    // The supervisee's side: what they did, or a link to it.
    response: { type: String, default: "", maxlength: 5000 },

    // The supervisor's side, once she has looked at it.
    feedback: { type: String, default: "", maxlength: 5000 },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

supervisionAssignmentSchema.index({ superviseeId: 1, createdAt: -1 });

// Kept in step with `status` here, not in each route, so no write path can
// leave a completed assignment undated or a reopened one still dated.
// On validate rather than save: every save validates first, and it runs the
// same way whether or not the document is new.
supervisionAssignmentSchema.pre("validate", function syncCompletedAt() {
  if (this.status === "completed") {
    if (!this.completedAt) this.completedAt = new Date();
  } else {
    this.completedAt = null;
  }
});

const SupervisionAssignment = mongoose.model(
  "SupervisionAssignment",
  supervisionAssignmentSchema,
);

module.exports = SupervisionAssignment;
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
module.exports.SUPERVISEE_STATUSES = SUPERVISEE_STATUSES;
