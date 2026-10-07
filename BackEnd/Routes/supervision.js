const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../Schema/User");
const SupervisionBoard = require("../Schema/SupervisionBoard");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");
const SupervisionAssignment = require("../Schema/SupervisionAssignment");
const { ASSIGNMENT_STATUSES, SUPERVISEE_STATUSES } = SupervisionAssignment;
const {
  normalizeWeekStart,
  buildSummary,
  buildMonthlyProgress,
} = require("../Services/supervision");
const {
  ensureAuth,
  ensureSupervisee,
  ensureSupervisor,
  resolveSuperviseeScope,
} = require("../Middleware/supervisionAuth");

const router = express.Router();

/* ------------------------------------------------------------------ *
 * Scope resolution
 *
 * Two families of route, one permission path. `/me/*` carries no id, so a
 * supervisee cannot even express a request for someone else's data;
 * `/supervisees/:id/*` honours an id but only through a query that filters
 * on the caller's own supervisorId. Both funnel into req.profile, and every
 * handler below reads its superviseeId from there and never from the body.
 * ------------------------------------------------------------------ */

function notFound(res) {
  // 404 rather than 403 throughout: a supervisor's trainee list is not
  // something another account should be able to confirm by probing ids.
  return res.status(404).json({ message: "Supervisee not found" });
}

async function scopeFromSession(req, res, next) {
  try {
    const profile = await resolveSuperviseeScope(req);
    if (!profile) return notFound(res);
    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

async function scopeFromParam(req, res, next) {
  try {
    const profile = await resolveSuperviseeScope(req, req.params.id);
    if (!profile) return notFound(res);
    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

const isSupervisor = (req) => req.user.portalRole === "supervisor";

/* ------------------------------------------------------------------ *
 * Validation helpers
 * ------------------------------------------------------------------ */

function parseNumber(value, { min = -Infinity, max = Infinity }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ------------------------------------------------------------------ *
 * Shared handlers — identical behaviour whichever family reached them
 * ------------------------------------------------------------------ */

async function loadRefs(profile) {
  const [user, board] = await Promise.all([
    User.findById(profile.userId).select("name email pfp").lean(),
    SupervisionBoard.findById(profile.boardId).lean(),
  ]);
  return { user, board };
}

async function serializeProfile(req, profile) {
  const refs = await loadRefs(profile);
  return isSupervisor(req)
    ? profile.toSupervisorJSON(refs)
    : profile.toSuperviseeJSON(refs);
}

async function getDashboard(req, res, next) {
  try {
    const [profile, summary] = await Promise.all([
      serializeProfile(req, req.profile),
      buildSummary(req.profile),
    ]);
    res.json({ profile, summary });
  } catch (err) {
    next(err);
  }
}

/** Month-by-month series for the progress charts, computed from the logs. */
async function getProgress(req, res, next) {
  try {
    res.json(await buildMonthlyProgress(req.profile));
  } catch (err) {
    next(err);
  }
}

async function listHours(req, res, next) {
  try {
    const entries = await WorkHoursEntry.find({ superviseeId: req.profile._id })
      .sort({ weekStartDate: -1 })
      .lean();
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

async function createHours(req, res, next) {
  try {
    const weekStartDate = normalizeWeekStart(req.body?.weekStartDate);
    if (!weekStartDate) {
      return res.status(400).json({ message: "A valid week date is required" });
    }

    const hours = parseNumber(req.body?.hours, { min: 0, max: 168 });
    if (hours === null) {
      return res.status(400).json({ message: "Hours must be between 0 and 168" });
    }

    const entry = await WorkHoursEntry.create({
      // From the resolved scope, never from the payload.
      superviseeId: req.profile._id,
      weekStartDate,
      hours,
      note: (req.body?.note || "").trim(),
      createdBy: req.user._id,
    });

    res.status(201).json({ entry });
  } catch (err) {
    // The unique (superviseeId, weekStartDate) index rejecting a duplicate is
    // an expected outcome of a double submit, not a server fault.
    if (err?.code === 11000) {
      return res.status(409).json({
        message: "That week is already logged. Edit the existing entry instead.",
      });
    }
    next(err);
  }
}

async function updateHours(req, res, next) {
  try {
    const entry = await WorkHoursEntry.findOne({
      _id: req.params.entryId,
      superviseeId: req.profile._id,
    });
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    if (req.body?.hours !== undefined) {
      const hours = parseNumber(req.body.hours, { min: 0, max: 168 });
      if (hours === null) {
        return res.status(400).json({ message: "Hours must be between 0 and 168" });
      }
      entry.hours = hours;
    }

    if (req.body?.weekStartDate !== undefined) {
      const weekStartDate = normalizeWeekStart(req.body.weekStartDate);
      if (!weekStartDate) return res.status(400).json({ message: "Invalid week date" });
      entry.weekStartDate = weekStartDate;
    }

    if (req.body?.note !== undefined) entry.note = String(req.body.note).trim();

    entry.updatedBy = req.user._id;
    await entry.save();
    res.json({ entry });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "That week is already logged." });
    }
    next(err);
  }
}

async function deleteHours(req, res, next) {
  try {
    const result = await WorkHoursEntry.deleteOne({
      _id: req.params.entryId,
      superviseeId: req.profile._id,
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Entry deleted" });
  } catch (err) {
    next(err);
  }
}

async function listMeetings(req, res, next) {
  try {
    const order = req.query.sort === "asc" ? 1 : -1;
    const meetings = await SupervisionMeeting.find({ superviseeId: req.profile._id })
      .sort({ date: order })
      .lean();
    res.json({ meetings });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Supervisor-only handlers
 * ------------------------------------------------------------------ */

async function createMeeting(req, res, next) {
  try {
    const date = parseDate(req.body?.date);
    if (!date) return res.status(400).json({ message: "A valid meeting date is required" });

    const durationMinutes = parseNumber(req.body?.durationMinutes, { min: 1, max: 1440 });
    if (durationMinutes === null) {
      return res.status(400).json({ message: "Duration must be between 1 and 1440 minutes" });
    }

    const format = req.body?.format;
    if (!["individual", "group"].includes(format)) {
      return res.status(400).json({ message: "Format must be individual or group" });
    }

    const meeting = await SupervisionMeeting.create({
      superviseeId: req.profile._id,
      date,
      durationMinutes,
      format,
      notes: req.body?.notes || "",
      createdBy: req.user._id,
    });

    res.status(201).json({ meeting });
  } catch (err) {
    next(err);
  }
}

async function updateMeeting(req, res, next) {
  try {
    const meeting = await SupervisionMeeting.findOne({
      _id: req.params.meetingId,
      superviseeId: req.profile._id,
    });
    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (req.body?.date !== undefined) {
      const date = parseDate(req.body.date);
      if (!date) return res.status(400).json({ message: "Invalid meeting date" });
      meeting.date = date;
    }

    if (req.body?.durationMinutes !== undefined) {
      const durationMinutes = parseNumber(req.body.durationMinutes, { min: 1, max: 1440 });
      if (durationMinutes === null) {
        return res.status(400).json({ message: "Duration must be between 1 and 1440 minutes" });
      }
      meeting.durationMinutes = durationMinutes;
    }

    if (req.body?.format !== undefined) {
      if (!["individual", "group"].includes(req.body.format)) {
        return res.status(400).json({ message: "Format must be individual or group" });
      }
      meeting.format = req.body.format;
    }

    if (req.body?.notes !== undefined) meeting.notes = String(req.body.notes);

    await meeting.save();
    res.json({ meeting });
  } catch (err) {
    next(err);
  }
}

async function deleteMeeting(req, res, next) {
  try {
    const result = await SupervisionMeeting.deleteOne({
      _id: req.params.meetingId,
      superviseeId: req.profile._id,
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Meeting not found" });
    res.json({ message: "Meeting deleted" });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Assignments — optional. Every field may be left blank; only a wholly
 * empty assignment is refused, since it would show as a row of dashes.
 * ------------------------------------------------------------------ */

const ASSIGNMENT_LIMITS = { title: 200, description: 5000, response: 5000, feedback: 5000 };

/** "" clears the link; anything else must be http(s), so it can't be a
 *  javascript: URL rendered as a clickable link on the other person's screen. */
function parseLink(value) {
  const link = String(value ?? "").trim();
  if (!link) return "";
  try {
    const url = new URL(link);
    return ["http:", "https:"].includes(url.protocol) ? link : null;
  } catch {
    return null;
  }
}

/** Copies the supervisor-editable fields from the body onto `assignment`.
 *  Returns an error message, or null when everything present was valid. */
function applyAssignmentFields(assignment, body = {}) {
  for (const key of ["title", "description", "feedback"]) {
    if (body[key] === undefined) continue;
    const text = key === "title" ? String(body[key]).trim() : String(body[key]);
    if (text.length > ASSIGNMENT_LIMITS[key]) {
      return `${key[0].toUpperCase()}${key.slice(1)} is too long`;
    }
    assignment[key] = text;
  }

  if (body.dueDate !== undefined) {
    if (!body.dueDate) {
      assignment.dueDate = null;
    } else {
      const due = parseDate(body.dueDate);
      if (!due) return "Invalid due date";
      assignment.dueDate = due;
    }
  }

  if (body.link !== undefined) {
    const link = parseLink(body.link);
    if (link === null) return "The link must start with http:// or https://";
    assignment.link = link;
  }

  if (body.status !== undefined) {
    if (!ASSIGNMENT_STATUSES.includes(body.status)) return "Invalid status";
    assignment.status = body.status;
  }

  return null;
}

const isBlankAssignment = (a) => !a.title && !a.description.trim() && !a.link;

async function findAssignment(req, res) {
  // Checked here so a malformed id is a 404, not a CastError 500.
  if (!mongoose.isValidObjectId(req.params.assignmentId)) {
    res.status(404).json({ message: "Assignment not found" });
    return null;
  }
  const assignment = await SupervisionAssignment.findOne({
    _id: req.params.assignmentId,
    superviseeId: req.profile._id,
  });
  if (!assignment) res.status(404).json({ message: "Assignment not found" });
  return assignment;
}

async function listAssignments(req, res, next) {
  try {
    const assignments = await SupervisionAssignment.find({ superviseeId: req.profile._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
}

async function createAssignment(req, res, next) {
  try {
    const assignment = new SupervisionAssignment({
      superviseeId: req.profile._id,
      createdBy: req.user._id,
    });
    const error = applyAssignmentFields(assignment, req.body);
    if (error) return res.status(400).json({ message: error });
    if (isBlankAssignment(assignment)) {
      return res.status(400).json({ message: "Add a title, a description or a link" });
    }

    await assignment.save();
    res.status(201).json({ assignment });
  } catch (err) {
    next(err);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const assignment = await findAssignment(req, res);
    if (!assignment) return;

    const error = applyAssignmentFields(assignment, req.body);
    if (error) return res.status(400).json({ message: error });
    if (isBlankAssignment(assignment)) {
      return res.status(400).json({ message: "Add a title, a description or a link" });
    }

    await assignment.save();
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.assignmentId)) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    const result = await SupervisionAssignment.deleteOne({
      _id: req.params.assignmentId,
      superviseeId: req.profile._id,
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Assignment not found" });
    res.json({ message: "Assignment deleted" });
  } catch (err) {
    next(err);
  }
}

/**
 * The supervisee's half: progress and a response, nothing else. Title, due
 * date and feedback are the supervisor's, so they are ignored if sent, and
 * "completed" is her sign-off — a supervisee can't award it to themselves,
 * nor reopen work she has already signed off.
 */
async function respondToAssignment(req, res, next) {
  try {
    const assignment = await findAssignment(req, res);
    if (!assignment) return;

    if (req.body?.status !== undefined) {
      if (!SUPERVISEE_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      if (assignment.status === "completed") {
        return res
          .status(400)
          .json({ message: "Your supervisor has marked this complete" });
      }
      assignment.status = req.body.status;
    }

    if (req.body?.response !== undefined) {
      const response = String(req.body.response);
      if (response.length > ASSIGNMENT_LIMITS.response) {
        return res.status(400).json({ message: "Response is too long" });
      }
      assignment.response = response;
    }

    await assignment.save();
    res.json({ assignment });
  } catch (err) {
    next(err);
  }
}

/**
 * A temporary password for an account the supervisor creates. Random from
 * crypto, not Math.random, and drawn from an alphabet with no 0/O/1/l so it
 * survives being read down the phone.
 */
function generateTempPassword() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(12), (b) => alphabet[b % alphabet.length]).join("");
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------------------ *
 * Supervisee routes — no id in the path, scope comes from the session
 * ------------------------------------------------------------------ */

router.get("/me", ensureAuth, ensureSupervisee, scopeFromSession, getDashboard);
router.get("/me/progress", ensureAuth, ensureSupervisee, scopeFromSession, getProgress);
router.get("/me/hours", ensureAuth, ensureSupervisee, scopeFromSession, listHours);
router.post("/me/hours", ensureAuth, ensureSupervisee, scopeFromSession, createHours);
router.patch("/me/hours/:entryId", ensureAuth, ensureSupervisee, scopeFromSession, updateHours);
router.delete("/me/hours/:entryId", ensureAuth, ensureSupervisee, scopeFromSession, deleteHours);

// Read-only: supervision hours are the supervisor's record of contact time.
router.get("/me/meetings", ensureAuth, ensureSupervisee, scopeFromSession, listMeetings);

// Assignments: read, plus progress and a response — never the brief itself.
router.get("/me/assignments", ensureAuth, ensureSupervisee, scopeFromSession, listAssignments);
router.patch(
  "/me/assignments/:assignmentId",
  ensureAuth,
  ensureSupervisee,
  scopeFromSession,
  respondToAssignment,
);

/* ------------------------------------------------------------------ *
 * Supervisor routes
 * ------------------------------------------------------------------ */

/** The supervisor's roster, each row carrying the totals for the list view. */
router.get("/supervisees", ensureAuth, ensureSupervisor, async (req, res, next) => {
  try {
    const profiles = await SuperviseeProfile.find({ supervisorId: req.user._id }).sort({
      createdAt: -1,
    });

    const rows = await Promise.all(
      profiles.map(async (profile) => {
        const [refs, summary] = await Promise.all([loadRefs(profile), buildSummary(profile)]);
        return { ...profile.toSupervisorJSON(refs), summary };
      }),
    );

    res.json({ supervisees: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * Create a supervisee. There is no self-registration: this route is the only
 * place a portalRole of "supervisee" is ever granted.
 *
 * An email already on the site (a training customer, say) is linked rather
 * than rejected — they keep their password and their purchases and simply
 * gain the portal. Only a genuinely new account gets a generated password.
 */
router.post("/supervisees", ensureAuth, ensureSupervisor, async (req, res, next) => {
  try {
    const name = (req.body?.name || "").trim();
    const email = (req.body?.email || "").trim().toLowerCase();

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email is required" });
    }

    const board = await SupervisionBoard.findById(req.body?.boardId);
    if (!board) return res.status(400).json({ message: "Select a certifying board" });

    const requiredTotalHours = parseNumber(req.body?.requiredTotalHours, { min: 0, max: 100000 });
    if (requiredTotalHours === null) {
      return res.status(400).json({ message: "Required total hours must be a positive number" });
    }

    const supervisionStartDate = parseDate(req.body?.supervisionStartDate);
    if (!supervisionStartDate) {
      return res.status(400).json({ message: "A valid supervision start date is required" });
    }

    // Case-insensitive so an account registered as "Foo@Bar.com" is linked
    // rather than duplicated into a second login that the unique index on a
    // lowercased email would happily let through.
    let user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
    let tempPassword = null;

    if (user) {
      if (user.portalRole === "supervisor") {
        return res.status(400).json({ message: "That account is a supervisor account" });
      }
      const existing = await SuperviseeProfile.findOne({ userId: user._id });
      if (existing) {
        return res.status(409).json({ message: "That person is already a supervisee" });
      }
      user.portalRole = "supervisee";
      await user.save();
    } else {
      tempPassword = generateTempPassword();
      user = await User.create({
        name,
        email,
        password: await bcrypt.hash(tempPassword, 10),
        portalRole: "supervisee",
        mustChangePassword: true,
      });
    }

    const profile = await SuperviseeProfile.create({
      userId: user._id,
      // The creating supervisor, from the session — never a field anyone sends.
      supervisorId: req.user._id,
      boardId: board._id,
      requiredTotalHours,
      supervisionRatio: (req.body?.supervisionRatio || board.defaultRatio || "").trim(),
      supervisionStartDate,
      contactPhone: (req.body?.contactPhone || "").trim(),
      supervisorNotes: req.body?.supervisorNotes || "",
    });

    res.status(201).json({
      supervisee: profile.toSupervisorJSON({ user, board }),
      // Shown once, at creation. Only the hash is stored, so if she loses it
      // the way back is a reset, not a lookup.
      tempPassword,
      linkedExistingAccount: !tempPassword,
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "That person is already a supervisee" });
    }
    next(err);
  }
});

router.get("/supervisees/:id", ensureAuth, ensureSupervisor, scopeFromParam, getDashboard);
router.get(
  "/supervisees/:id/progress",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  getProgress,
);

router.patch(
  "/supervisees/:id",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  async (req, res, next) => {
    try {
      const profile = req.profile;

      if (req.body?.boardId !== undefined) {
        const board = await SupervisionBoard.findById(req.body.boardId);
        if (!board) return res.status(400).json({ message: "Unknown board" });
        profile.boardId = board._id;
      }

      if (req.body?.requiredTotalHours !== undefined) {
        const hours = parseNumber(req.body.requiredTotalHours, { min: 0, max: 100000 });
        if (hours === null) {
          return res
            .status(400)
            .json({ message: "Required total hours must be a positive number" });
        }
        profile.requiredTotalHours = hours;
      }

      if (req.body?.supervisionStartDate !== undefined) {
        const date = parseDate(req.body.supervisionStartDate);
        if (!date) return res.status(400).json({ message: "Invalid start date" });
        profile.supervisionStartDate = date;
      }

      if (req.body?.status !== undefined) {
        if (!["active", "paused", "completed"].includes(req.body.status)) {
          return res.status(400).json({ message: "Invalid status" });
        }
        profile.status = req.body.status;
      }

      if (req.body?.supervisionRatio !== undefined) {
        profile.supervisionRatio = String(req.body.supervisionRatio).trim();
      }
      if (req.body?.contactPhone !== undefined) {
        profile.contactPhone = String(req.body.contactPhone).trim();
      }
      if (req.body?.supervisorNotes !== undefined) {
        profile.supervisorNotes = String(req.body.supervisorNotes);
      }

      await profile.save();
      const refs = await loadRefs(profile);
      res.json({ supervisee: profile.toSupervisorJSON(refs) });
    } catch (err) {
      next(err);
    }
  },
);

/** Issues a fresh temporary password when a supervisee is locked out. */
router.post(
  "/supervisees/:id/reset-password",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.profile.userId);
      if (!user) return notFound(res);

      const tempPassword = generateTempPassword();
      user.password = await bcrypt.hash(tempPassword, 10);
      user.mustChangePassword = true;
      await user.save();

      res.json({ tempPassword });
    } catch (err) {
      next(err);
    }
  },
);

// Work hours: the supervisee self-reports, the supervisor corrects. Shared
// handlers, so a correction is validated exactly like a self-report and the
// unique-week rule holds for both.
router.get("/supervisees/:id/hours", ensureAuth, ensureSupervisor, scopeFromParam, listHours);
router.post("/supervisees/:id/hours", ensureAuth, ensureSupervisor, scopeFromParam, createHours);
router.patch(
  "/supervisees/:id/hours/:entryId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  updateHours,
);
router.delete(
  "/supervisees/:id/hours/:entryId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  deleteHours,
);

// Meetings are supervisor-authored throughout.
router.get("/supervisees/:id/meetings", ensureAuth, ensureSupervisor, scopeFromParam, listMeetings);
router.post(
  "/supervisees/:id/meetings",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  createMeeting,
);
router.patch(
  "/supervisees/:id/meetings/:meetingId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  updateMeeting,
);
router.delete(
  "/supervisees/:id/meetings/:meetingId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  deleteMeeting,
);

// Assignments are supervisor-authored; the supervisee only responds (above).
router.get(
  "/supervisees/:id/assignments",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  listAssignments,
);
router.post(
  "/supervisees/:id/assignments",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  createAssignment,
);
router.patch(
  "/supervisees/:id/assignments/:assignmentId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  updateAssignment,
);
router.delete(
  "/supervisees/:id/assignments/:assignmentId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  deleteAssignment,
);

module.exports = router;
