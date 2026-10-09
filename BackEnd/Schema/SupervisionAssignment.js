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

const ASSIGNMENT_KINDS = ["assignment", "presentation"];

/**
 * A file the supervisor attached (a research article, a worksheet). Stored on
 * the server's disk outside the public /uploads folder and only ever served
 * through an authenticated route, so a file is as private as its assignment.
 */
const attachmentSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    // Random name on disk; never derived from what the uploader called it.
    storedName: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } },
);

const supervisionAssignmentSchema = new mongoose.Schema(
  {
    superviseeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SuperviseeProfile",
      required: true,
      index: true,
    },

    kind: { type: String, enum: ASSIGNMENT_KINDS, default: "assignment" },

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

    // Optional 1-10 score from the supervisor. `ratedAt` places it in a month
    // for the progress chart; kept in step by the pre-validate hook below.
    rating: { type: Number, min: 1, max: 10, default: null },
    ratedAt: { type: Date, default: null },

    attachments: { type: [attachmentSchema], default: [] },

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

  if (this.rating == null) this.ratedAt = null;
  else if (this.isModified("rating") || !this.ratedAt) this.ratedAt = new Date();
});

const SupervisionAssignment = mongoose.model(
  "SupervisionAssignment",
  supervisionAssignmentSchema,
);

module.exports = SupervisionAssignment;
module.exports.ASSIGNMENT_STATUSES = ASSIGNMENT_STATUSES;
module.exports.SUPERVISEE_STATUSES = SUPERVISEE_STATUSES;
module.exports.ASSIGNMENT_KINDS = ASSIGNMENT_KINDS;
