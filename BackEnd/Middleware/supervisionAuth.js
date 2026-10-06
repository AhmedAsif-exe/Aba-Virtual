const mongoose = require("mongoose");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");

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

function ensureSupervisor(req, res, next) {
  if (req.user.portalRole !== "supervisor") {
    return res.status(403).json({ message: "Not a supervisor account" });
  }
  return next();
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
  ensurePasswordChanged,
  resolveSuperviseeScope,
};
