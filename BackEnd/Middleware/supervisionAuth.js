const mongoose = require("mongoose");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const User = require("../Schema/User");
const { can, canWrite, limit, effectivePlan } = require("../Services/entitlements");
const { PLAN_NAMES } = require("../Config/plans");

/**
 * Access control for the supervision portal.
 *
 * The rule the whole portal rests on: the set of records a request may touch
 * is derived from the session, never from the URL or the body. Supervisee
 * routes carry no id at all — there is nothing to tamper with — and
 * supervisor routes resolve an id only through a query that already filters
 * on the caller's own supervisorId, the same shape the orders endpoint uses
 * (Routes/payfast.js).
 */

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not authenticated" });
}

/**
 * A supervisee with a temporary password gets no portal data until they have
 * chosen their own, so a leaked generated password has nothing to read.
 */
function ensurePasswordChanged(req, res, next) {
  if (req.user.mustChangePassword) {
    return res
      .status(403)
      .json({ message: "Set a new password before using the portal", mustChangePassword: true });
  }
  return next();
}

function ensureSupervisee(req, res, next) {
  if (req.user.portalRole !== "supervisee") {
    return res.status(403).json({ message: "Not a supervisee account" });
  }
  return ensurePasswordChanged(req, res, next);
}

/**
 * Role only. A lapsed plan no longer locks the supervisor out: they keep
 * reading everything (§4.4), and requireActivePass stops the writes.
 */
function ensureSupervisor(req, res, next) {
  if (req.user.portalRole !== "supervisor") {
    return res.status(403).json({ message: "Not a supervisor account" });
  }
  return next();
}

/**
 * Every supervisor write goes through this, after ensureSupervisor. An ended
 * pass makes the account read-only; nothing is deleted. 402 rather than 403
 * so the frontend can tell "renew" apart from "not allowed".
 */
function requireActivePass(req, res, next) {
  if (!canWrite(req.user)) {
    return res
      .status(402)
      .json({ message: "Your supervision plan has ended. Renew to continue.", planExpired: true });
  }
  return next();
}

// Approved wording (2026-10-27); the page adds an upgrade button.
const NOT_IN_PLAN = "This feature isn't included in your plan. Upgrade to use it.";

/**
 * A feature the supervisor's plan must include (Config/plans.js FEATURES).
 * Unaffected by expiry: a lapsed plan keeps its features for reading.
 */
function requireFeature(feature) {
  return function featureGate(req, res, next) {
    if (!can(req.user, feature)) {
      return res.status(403).json({ message: NOT_IN_PLAN, upgradeRequired: feature });
    }
    return next();
  };
}

/** §4.5 wording, with the plan name and number taken from config. */
const limitMessage = (planKey, max) =>
  `${PLAN_NAMES[planKey]} includes up to ${max} supervisees. Upgrade to Professional for unlimited supervisees.`;

/**
 * Adding or restoring a supervisee needs a free slot: active (unarchived)
 * supervisees must be under the plan's limit (§4.5). Enforced here, not by
 * hiding the button.
 */
async function requireSlot(req, res, next) {
  try {
    const max = limit(req.user, "max_active_supervisees");
    if (Number.isFinite(max)) {
      const active = await SuperviseeProfile.countDocuments({
        supervisorId: req.user._id,
        archivedAt: null,
      });
      if (active >= max) {
        const { planKey } = effectivePlan(req.user);
        return res.status(403).json({
          message: limitMessage(planKey, max),
          upgradeRequired: "max_active_supervisees",
        });
      }
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

const SUPERVISOR_PLAN_ENDED =
  "Your supervisor's plan has ended. You can view your records. Logging opens again when they renew.";

/**
 * Supervisee hour logging, after scopeFromSession: paused while their
 * supervisor's pass has ended (§4.4). Reading stays open.
 */
async function requireSupervisorActive(req, res, next) {
  try {
    const supervisor = await User.findById(req.profile.supervisorId).select(
      "email supervisionPlan",
    );
    if (!supervisor || !canWrite(supervisor)) {
      return res.status(402).json({ message: SUPERVISOR_PLAN_ENDED, supervisorPlanEnded: true });
    }
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * The single place a request's supervisee scope is decided.
 *
 * Returns the profile the caller is allowed to act on, or null — which every
 * caller reports as 404 rather than 403, so profile ids stay non-enumerable.
 *
 * `superviseeId` is ignored outright for a supervisee: their scope is their
 * own account and nothing else can be expressed. For a supervisor the id is
 * honoured, but only ever alongside `supervisorId: req.user._id` in the same
 * query, so another supervisor's trainee simply does not exist.
 *
 * Every write in Routes/supervision.js takes its superviseeId from the
 * profile this returns, never from the request body — the same discipline
 * Services/pricing.js applies to prices.
 */
async function resolveSuperviseeScope(req, superviseeId) {
  if (req.user.portalRole === "supervisee") {
    return SuperviseeProfile.findOne({ userId: req.user._id });
  }

  if (req.user.portalRole === "supervisor") {
    // A malformed id would otherwise throw a CastError out of the route and
    // surface as a 500, telling a prober the difference between "bad id" and
    // "not yours". Both are a plain 404.
    if (!mongoose.isValidObjectId(superviseeId)) return null;
    return SuperviseeProfile.findOne({
      _id: superviseeId,
      supervisorId: req.user._id,
    });
  }

  return null;
}

module.exports = {
  ensureAuth,
  ensureSupervisee,
  ensureSupervisor,
  requireActivePass,
  requireSupervisorActive,
  requireFeature,
  requireSlot,
  limitMessage,
  NOT_IN_PLAN,
  SUPERVISOR_PLAN_ENDED,
  ensurePasswordChanged,
  resolveSuperviseeScope,
};
