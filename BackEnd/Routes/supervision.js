const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const User = require("../Schema/User");
const SupervisionBoard = require("../Schema/SupervisionBoard");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const WorkHoursEntry = require("../Schema/WorkHoursEntry");
const SupervisionMeeting = require("../Schema/SupervisionMeeting");
const SupervisionAssignment = require("../Schema/SupervisionAssignment");
const { ASSIGNMENT_STATUSES, SUPERVISEE_STATUSES, ASSIGNMENT_KINDS } = SupervisionAssignment;
const SupervisionPayment = require("../Schema/SupervisionPayment");
const SupervisionShare = require("../Schema/SupervisionShare");
const { planStatus } = require("../Services/supervisionPlans");
const {
  sendPaymentReminder,
  sendShareInvite,
  sendSuperviseeInvite,
} = require("../Services/mailer");
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
  // A read-only viewer may be a supervisor in their own right, so their role
  // must not unlock the private notes on someone else's supervisee.
  return !req.readOnlyViewer && isSupervisor(req)
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

  if (body.kind !== undefined) {
    if (!ASSIGNMENT_KINDS.includes(body.kind)) return "Invalid type";
    assignment.kind = body.kind;
  }

  // Optional 1-10 score; "" or null clears it.
  if (body.rating !== undefined) {
    if (body.rating === null || body.rating === "") {
      assignment.rating = null;
    } else {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
        return "Rating must be a whole number from 1 to 10";
      }
      assignment.rating = rating;
    }
  }

  return null;
}

/** What leaves the server: everything except where files sit on disk. */
function assignmentJSON(assignment) {
  const a = typeof assignment.toObject === "function" ? assignment.toObject() : assignment;
  return {
    ...a,
    attachments: (a.attachments || []).map(({ storedName, ...rest }) => rest),
  };
}

const isBlankAssignment = (a) =>
  !a.title && !a.description.trim() && !a.link && !a.attachments?.length;

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
    res.json({ assignments: assignments.map(assignmentJSON) });
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
    res.status(201).json({ assignment: assignmentJSON(assignment) });
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
    res.json({ assignment: assignmentJSON(assignment) });
  } catch (err) {
    next(err);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.assignmentId)) {
      return res.status(404).json({ message: "Assignment not found" });
    }
    const assignment = await SupervisionAssignment.findOneAndDelete({
      _id: req.params.assignmentId,
      superviseeId: req.profile._id,
    });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    // Its files go with it; a file nothing points at can never be served.
    assignment.attachments.forEach((file) => removeStoredFile(file.storedName));
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
    res.json({ assignment: assignmentJSON(assignment) });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Assignment attachments — articles, worksheets, images
 *
 * Kept in private-uploads/, NOT uploads/: server.js serves uploads/ to
 * anyone with the URL, while these go out only through the routes below,
 * after the same scope check as the assignment they belong to.
 * ------------------------------------------------------------------ */

const ATTACHMENT_DIR = path.join(__dirname, "..", "private-uploads", "assignments");
fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });

const MAX_ATTACHMENT_MB = 25;
const MAX_ATTACHMENTS_PER_ASSIGNMENT = 20;
// Documents and pictures only. No HTML/SVG/scripts: anything a browser
// would run must never be served back from our own domain.
const ATTACHMENT_TYPES = new Set([
  ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt", ".rtf", ".odt",
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic",
]);
// Opened in the browser tab rather than downloaded.
const INLINE_TYPES = new Set([".pdf", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".txt"]);

const storedPath = (storedName) => path.join(ATTACHMENT_DIR, path.basename(storedName));

function removeStoredFile(storedName) {
  fs.unlink(storedPath(storedName), (err) => {
    if (err && err.code !== "ENOENT") console.error("[ATTACHMENT] delete failed:", err.message);
  });
}

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: ATTACHMENT_DIR,
    filename: (req, file, cb) =>
      cb(null, `${crypto.randomBytes(16).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_ATTACHMENT_MB * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = ATTACHMENT_TYPES.has(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error("UNSUPPORTED_TYPE"), ok);
  },
}).array("files", 10);

/** Multer's errors become readable 400s instead of a 500. */
function receiveAttachments(req, res, next) {
  attachmentUpload(req, res, (err) => {
    if (!err) return next();
    (req.files || []).forEach((f) => removeStoredFile(f.filename));
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: `Each file must be under ${MAX_ATTACHMENT_MB} MB` });
    }
    if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Upload up to 10 files at a time" });
    }
    if (err.message === "UNSUPPORTED_TYPE") {
      return res.status(400).json({
        message: "Only PDF, Word, PowerPoint, Excel, text and image files can be attached",
      });
    }
    return next(err);
  });
}

async function addAttachments(req, res, next) {
  const uploaded = req.files || [];
  try {
    if (!uploaded.length) return res.status(400).json({ message: "Choose a file to attach" });

    const assignment = await findAssignment(req, res);
    if (!assignment) {
      uploaded.forEach((f) => removeStoredFile(f.filename));
      return;
    }
    if (assignment.attachments.length + uploaded.length > MAX_ATTACHMENTS_PER_ASSIGNMENT) {
      uploaded.forEach((f) => removeStoredFile(f.filename));
      return res.status(400).json({
        message: `An assignment can hold up to ${MAX_ATTACHMENTS_PER_ASSIGNMENT} files`,
      });
    }

    for (const file of uploaded) {
      assignment.attachments.push({
        // Browsers send UTF-8 names that multer reads as latin1.
        originalName: Buffer.from(file.originalname, "latin1").toString("utf8").slice(0, 200),
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        uploadedBy: req.user._id,
      });
    }
    await assignment.save();
    res.status(201).json({ assignment: assignmentJSON(assignment) });
  } catch (err) {
    uploaded.forEach((f) => removeStoredFile(f.filename));
    next(err);
  }
}

function findAttachment(assignment, attachmentId) {
  if (!mongoose.isValidObjectId(attachmentId)) return null;
  return assignment.attachments.id(attachmentId) || null;
}

async function downloadAttachment(req, res, next) {
  try {
    const assignment = await findAssignment(req, res);
    if (!assignment) return;
    const file = findAttachment(assignment, req.params.attachmentId);
    if (!file) return res.status(404).json({ message: "File not found" });

    const fullPath = storedPath(file.storedName);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ message: "File not found" });

    const ext = path.extname(file.storedName).toLowerCase();
    const disposition = INLINE_TYPES.has(ext) ? "inline" : "attachment";
    res.set({
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    res.sendFile(fullPath);
  } catch (err) {
    next(err);
  }
}

async function deleteAttachment(req, res, next) {
  try {
    const assignment = await findAssignment(req, res);
    if (!assignment) return;
    const file = findAttachment(assignment, req.params.attachmentId);
    if (!file) return res.status(404).json({ message: "File not found" });

    const { storedName } = file;
    file.deleteOne();
    await assignment.save();
    removeStoredFile(storedName);
    res.json({ assignment: assignmentJSON(assignment) });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Supervisee payments — the supervisor's paid / unpaid record per month
 * ------------------------------------------------------------------ */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const monthLabel = (key) => `${MONTH_NAMES[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const currentMonthKey = () => new Date().toISOString().slice(0, 7);

/** A real month, and not absurdly far ahead (a typo, not a prepayment). */
function parseMonth(value) {
  const month = String(value || "");
  if (!MONTH_RE.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  const now = new Date();
  const ahead = (y - now.getUTCFullYear()) * 12 + (m - 1 - now.getUTCMonth());
  return ahead > 12 ? null : month;
}

async function listPayments(req, res, next) {
  try {
    const payments = await SupervisionPayment.find({ superviseeId: req.profile._id })
      .sort({ month: -1 })
      .lean();
    res.json({ payments, currentMonth: currentMonthKey() });
  } catch (err) {
    next(err);
  }
}

/** Emails the supervisee about one unpaid month; records when it went. */
async function remindAboutPayment(req, payment) {
  const supervisee = await User.findById(req.profile.userId).select("name email").lean();
  if (!supervisee?.email) return false;
  const sent = await sendPaymentReminder({
    supervisee,
    supervisor: { name: req.user.name, email: req.user.email },
    monthLabel: monthLabel(payment.month),
    amount: payment.amount,
  });
  if (sent) {
    payment.reminderSentAt = new Date();
    await payment.save();
  }
  return sent;
}

/**
 * Set one month to paid or unpaid. Turning a month red emails the supervisee
 * a reminder straight away (unless `notify: false`); re-saving a month that
 * was already unpaid does not, so editing the amount doesn't spam them.
 */
async function setPayment(req, res, next) {
  try {
    const month = parseMonth(req.params.month);
    if (!month) return res.status(400).json({ message: "Invalid month" });

    const { status } = req.body || {};
    if (!["paid", "unpaid"].includes(status)) {
      return res.status(400).json({ message: "Status must be paid or unpaid" });
    }

    let payment = await SupervisionPayment.findOne({ superviseeId: req.profile._id, month });
    const wasUnpaid = payment?.status === "unpaid";
    if (!payment) payment = new SupervisionPayment({ superviseeId: req.profile._id, month });

    payment.status = status;
    if (req.body.amount !== undefined) payment.amount = String(req.body.amount).slice(0, 50);
    if (req.body.note !== undefined) payment.note = String(req.body.note).slice(0, 500);
    payment.updatedBy = req.user._id;
    await payment.save();

    let emailSent = null;
    if (status === "unpaid" && !wasUnpaid && req.body.notify !== false) {
      emailSent = await remindAboutPayment(req, payment);
    }
    res.json({ payment, emailSent });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "Please try again" });
    next(err);
  }
}

async function sendPaymentReminderNow(req, res, next) {
  try {
    const month = parseMonth(req.params.month);
    if (!month) return res.status(400).json({ message: "Invalid month" });
    const payment = await SupervisionPayment.findOne({ superviseeId: req.profile._id, month });
    if (!payment || payment.status !== "unpaid") {
      return res.status(400).json({ message: "Only an unpaid month can be reminded" });
    }
    const emailSent = await remindAboutPayment(req, payment);
    if (!emailSent) return res.status(502).json({ message: "The reminder email could not be sent" });
    res.json({ payment, emailSent });
  } catch (err) {
    next(err);
  }
}

async function clearPayment(req, res, next) {
  try {
    const month = parseMonth(req.params.month);
    if (!month) return res.status(400).json({ message: "Invalid month" });
    await SupervisionPayment.deleteOne({ superviseeId: req.profile._id, month });
    res.json({ message: "Cleared" });
  } catch (err) {
    next(err);
  }
}

/* ------------------------------------------------------------------ *
 * Read-only sharing — e.g. the supervisor's own supervisor
 *
 * A share is (supervisorId, email). Anyone signed in with that email gets
 * GET access to every one of that supervisor's supervisees, through the
 * /shared/:supervisorId/... routes below and nothing else: there are no
 * write routes under /shared, so "read-only" is structural, not a flag.
 * ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SHARES = 20;

async function listShares(req, res, next) {
  try {
    const shares = await SupervisionShare.find({ supervisorId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ shares });
  } catch (err) {
    next(err);
  }
}

async function createShare(req, res, next) {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email" });
    if (email === String(req.user.email || "").toLowerCase()) {
      return res.status(400).json({ message: "That's your own email" });
    }
    if ((await SupervisionShare.countDocuments({ supervisorId: req.user._id })) >= MAX_SHARES) {
      return res.status(400).json({ message: `You can share with up to ${MAX_SHARES} people` });
    }

    const share = await SupervisionShare.create({ supervisorId: req.user._id, email });
    const emailSent = await sendShareInvite({
      email,
      supervisor: { name: req.user.name, email: req.user.email },
    });
    res.status(201).json({ share, emailSent });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "Already shared with that email" });
    }
    next(err);
  }
}

async function deleteShare(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.shareId)) {
      return res.status(404).json({ message: "Not found" });
    }
    const result = await SupervisionShare.deleteOne({
      _id: req.params.shareId,
      supervisorId: req.user._id,
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Access removed" });
  } catch (err) {
    next(err);
  }
}

/** Supervisors who have shared with the signed-in email. */
async function listSharedWithMe(req, res, next) {
  try {
    const shares = await SupervisionShare.find({
      email: String(req.user.email || "").toLowerCase(),
    }).lean();
    const supervisors = await User.find({ _id: { $in: shares.map((s) => s.supervisorId) } })
      .select("name email pfp supervisionPlan")
      .lean();
    res.json({
      supervisors: supervisors.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        pfp: u.pfp,
        // A lapsed plan locks viewers out too, the same as the supervisor.
        available: planStatus(u).active,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Gate for every /shared/:supervisorId route: the caller's email must hold a
 * share from that supervisor, and the supervisor's plan must be live. Sets
 * `req.readOnlyViewer` so shared handlers never treat the viewer as the
 * supervisor (private notes stay private).
 */
async function ensureViewer(req, res, next) {
  try {
    const { supervisorId } = req.params;
    const deny = () => res.status(404).json({ message: "Nothing has been shared with you here" });
    if (!mongoose.isValidObjectId(supervisorId)) return deny();

    const share = await SupervisionShare.exists({
      supervisorId,
      email: String(req.user.email || "").toLowerCase(),
    });
    if (!share) return deny();

    const supervisor = await User.findById(supervisorId).select(
      "name email supervisionPlan portalRole",
    );
    if (!supervisor || supervisor.portalRole !== "supervisor") return deny();
    if (!planStatus(supervisor).active) {
      return res.status(402).json({ message: "This shared portal isn't available right now" });
    }

    req.readOnlyViewer = true;
    req.sharedSupervisor = supervisor;
    next();
  } catch (err) {
    next(err);
  }
}

/** Like scopeFromParam, but scoped to the sharing supervisor, not the caller. */
async function scopeFromShare(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const profile = await SuperviseeProfile.findOne({
      _id: req.params.id,
      supervisorId: req.sharedSupervisor._id,
    });
    if (!profile) return notFound(res);
    req.profile = profile;
    next();
  } catch (err) {
    next(err);
  }
}

/** The shared roster: same totals as the supervisor's list, no private notes. */
async function listSharedSupervisees(req, res, next) {
  try {
    const profiles = await SuperviseeProfile.find({
      supervisorId: req.sharedSupervisor._id,
    }).sort({ createdAt: -1 });
    const rows = await Promise.all(
      profiles.map(async (profile) => {
        const [refs, summary] = await Promise.all([loadRefs(profile), buildSummary(profile)]);
        return { ...profile.toSuperviseeJSON(refs), summary };
      }),
    );
    res.json({
      supervisor: { _id: req.sharedSupervisor._id, name: req.sharedSupervisor.name },
      supervisees: rows,
    });
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

    // This month's payment and any unpaid months, for the green/red marker.
    const month = currentMonthKey();
    const payments = await SupervisionPayment.find({
      superviseeId: { $in: profiles.map((p) => p._id) },
      $or: [{ month }, { status: "unpaid" }],
    })
      .select("superviseeId month status")
      .lean();

    const rows = await Promise.all(
      profiles.map(async (profile) => {
        const [refs, summary] = await Promise.all([loadRefs(profile), buildSummary(profile)]);
        const mine = payments.filter((p) => String(p.superviseeId) === String(profile._id));
        return {
          ...profile.toSupervisorJSON(refs),
          summary,
          payment: {
            thisMonth: mine.find((p) => p.month === month)?.status || null,
            unpaidMonths: mine.filter((p) => p.status === "unpaid").map((p) => p.month).sort(),
          },
        };
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

    // Welcome email with their login details. The account already exists by
    // now, so a failed send is reported, not fatal: the temporary password
    // is still shown on the supervisor's screen as the fallback.
    const inviteEmailSent = await sendSuperviseeInvite({
      supervisee: { name: user.name || name, email: user.email },
      supervisor: { name: req.user.name, email: req.user.email },
      tempPassword,
    });

    res.status(201).json({
      supervisee: profile.toSupervisorJSON({ user, board }),
      // Shown once, at creation. Only the hash is stored, so if she loses it
      // the way back is a reset, not a lookup.
      tempPassword,
      linkedExistingAccount: !tempPassword,
      inviteEmailSent,
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

// Attachments: the supervisor uploads and removes; anyone who can see the
// assignment can open its files.
router.post(
  "/supervisees/:id/assignments/:assignmentId/attachments",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  receiveAttachments,
  addAttachments,
);
router.get(
  "/supervisees/:id/assignments/:assignmentId/attachments/:attachmentId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  downloadAttachment,
);
router.delete(
  "/supervisees/:id/assignments/:assignmentId/attachments/:attachmentId",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  deleteAttachment,
);
router.get(
  "/me/assignments/:assignmentId/attachments/:attachmentId",
  ensureAuth,
  ensureSupervisee,
  scopeFromSession,
  downloadAttachment,
);

// Payments: the supervisor records, the supervisee reads their own.
router.get("/me/payments", ensureAuth, ensureSupervisee, scopeFromSession, listPayments);
router.get("/supervisees/:id/payments", ensureAuth, ensureSupervisor, scopeFromParam, listPayments);
router.put(
  "/supervisees/:id/payments/:month",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  setPayment,
);
router.post(
  "/supervisees/:id/payments/:month/remind",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  sendPaymentReminderNow,
);
router.delete(
  "/supervisees/:id/payments/:month",
  ensureAuth,
  ensureSupervisor,
  scopeFromParam,
  clearPayment,
);

// Sharing: the supervisor manages who can view...
router.get("/shares", ensureAuth, ensureSupervisor, listShares);
router.post("/shares", ensureAuth, ensureSupervisor, createShare);
router.delete("/shares/:shareId", ensureAuth, ensureSupervisor, deleteShare);

// ...and a viewer reads. GET only, by design; payments are not shared.
router.get("/shared", ensureAuth, listSharedWithMe);
router.get("/shared/:supervisorId/supervisees", ensureAuth, ensureViewer, listSharedSupervisees);
const viewerScope = [ensureAuth, ensureViewer, scopeFromShare];
router.get("/shared/:supervisorId/supervisees/:id", ...viewerScope, getDashboard);
router.get("/shared/:supervisorId/supervisees/:id/progress", ...viewerScope, getProgress);
router.get("/shared/:supervisorId/supervisees/:id/hours", ...viewerScope, listHours);
router.get("/shared/:supervisorId/supervisees/:id/meetings", ...viewerScope, listMeetings);
router.get("/shared/:supervisorId/supervisees/:id/assignments", ...viewerScope, listAssignments);
router.get(
  "/shared/:supervisorId/supervisees/:id/assignments/:assignmentId/attachments/:attachmentId",
  ...viewerScope,
  downloadAttachment,
);

module.exports = router;
