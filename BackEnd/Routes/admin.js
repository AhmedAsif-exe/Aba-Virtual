// Internal ABA Virtual admin: Custom plan organisations (spec §7).
//
// Site admins only (User.siteAdmin, set by scripts/promoteAdmin.js). Custom
// plans have no checkout: an admin creates the organisation, attaches its
// people, records the invoice or bank transfer, and sets or extends expiry.

const express = require("express");
const mongoose = require("mongoose");

const User = require("../Schema/User");
const Organisation = require("../Schema/Organisation");
const OrganisationMember = require("../Schema/OrganisationMember");
const OrganisationPayment = require("../Schema/OrganisationPayment");
const { ensureAuth } = require("../Middleware/supervisionAuth");
const { addDays } = require("../Services/billing");

const router = express.Router();

function ensureSiteAdmin(req, res, next) {
  if (req.user.siteAdmin !== true) return res.status(403).json({ message: "Not available" });
  return next();
}

router.use(ensureAuth, ensureSiteAdmin);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const parseSeatLimit = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : null;
};

async function loadOrganisation(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    req.organisation = await Organisation.findById(req.params.id);
    if (!req.organisation) return res.status(404).json({ message: "Not found" });
    next();
  } catch (err) {
    next(err);
  }
}

/** Seats taken: members who supervise. An admin who only manages takes none (§6.2). */
async function seatsUsed(organisationId) {
  const members = await OrganisationMember.find({ organisationId }).select("userId").lean();
  return User.countDocuments({
    _id: { $in: members.map((m) => m.userId) },
    portalRole: "supervisor",
  });
}

async function describe(organisation) {
  const [members, payments] = await Promise.all([
    OrganisationMember.find({ organisationId: organisation._id }).lean(),
    OrganisationPayment.find({ organisationId: organisation._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const users = await User.find({ _id: { $in: members.map((m) => m.userId) } })
    .select("name email portalRole")
    .lean();
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return {
    _id: organisation._id,
    name: organisation.name,
    planKey: organisation.planKey,
    seatLimit: organisation.seatLimit,
    seatsUsed: users.filter((u) => u.portalRole === "supervisor").length,
    expiresAt: organisation.expiresAt,
    createdAt: organisation.createdAt,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      name: byId.get(String(m.userId))?.name || "",
      email: byId.get(String(m.userId))?.email || "",
    })),
    payments: payments.map((p) => ({
      _id: p._id,
      method: p.method,
      reference: p.reference,
      amount: p.amount,
      currency: p.currency,
      createdAt: p.createdAt,
    })),
  };
}

router.get("/organisations", async (req, res, next) => {
  try {
    const organisations = await Organisation.find({}).sort({ createdAt: -1 });
    res.json({ organisations: await Promise.all(organisations.map(describe)) });
  } catch (err) {
    next(err);
  }
});

/** A Custom organisation with any seat limit and expiry (§7). */
router.post("/organisations", async (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    const seatLimit = parseSeatLimit(req.body?.seatLimit);
    if (seatLimit === null) return res.status(400).json({ message: "Seat limit must be a whole number from 1" });
    const expiresAt = parseDate(req.body?.expiresAt);
    if (!expiresAt) return res.status(400).json({ message: "A valid expiry date is required" });

    const organisation = await Organisation.create({ name, planKey: "custom", seatLimit, expiresAt });
    res.status(201).json({ organisation: await describe(organisation) });
  } catch (err) {
    next(err);
  }
});

/** Rename, change the seat limit, set an expiry, or extend it by N days. */
router.patch("/organisations/:id", loadOrganisation, async (req, res, next) => {
  try {
    const organisation = req.organisation;
    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "Name is required" });
      organisation.name = name;
    }
    if (req.body?.seatLimit !== undefined) {
      const seatLimit = parseSeatLimit(req.body.seatLimit);
      if (seatLimit === null) return res.status(400).json({ message: "Seat limit must be a whole number from 1" });
      if (seatLimit < (await seatsUsed(organisation._id))) {
        return res.status(400).json({ message: "More supervisors are attached than that seat limit" });
      }
      organisation.seatLimit = seatLimit;
    }
    if (req.body?.expiresAt !== undefined) {
      const expiresAt = parseDate(req.body.expiresAt);
      if (!expiresAt) return res.status(400).json({ message: "A valid expiry date is required" });
      organisation.expiresAt = expiresAt;
    }
    if (req.body?.extendDays !== undefined) {
      const days = Number(req.body.extendDays);
      if (!Number.isInteger(days) || days < 1 || days > 3650) {
        return res.status(400).json({ message: "Extend by a whole number of days" });
      }
      // Like a renewal: time is added to what is left, or from today.
      const now = new Date();
      const from = organisation.expiresAt && organisation.expiresAt > now ? organisation.expiresAt : now;
      organisation.expiresAt = addDays(from, days);
    }
    await organisation.save();
    res.json({ organisation: await describe(organisation) });
  } catch (err) {
    next(err);
  }
});

/**
 * Attach an existing account. A "supervisor" member gets the supervisor
 * portal and takes a seat; an "admin" takes one only if they supervise too.
 */
router.post("/organisations/:id/members", loadOrganisation, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim();
    const role = req.body?.role;
    if (!["admin", "supervisor"].includes(role)) return res.status(400).json({ message: "Role must be admin or supervisor" });

    const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
    if (!email || !user) {
      return res.status(404).json({ message: "No account with that email. They need to sign up first." });
    }
    if (user.portalRole === "supervisee") {
      return res.status(400).json({ message: "That account is a supervisee account" });
    }

    const takesSeat = role === "supervisor" || user.portalRole === "supervisor";
    if (takesSeat && (await seatsUsed(req.organisation._id)) >= req.organisation.seatLimit) {
      return res.status(400).json({ message: `This organisation's seat limit is ${req.organisation.seatLimit}` });
    }

    await OrganisationMember.create({ organisationId: req.organisation._id, userId: user._id, role });
    if (role === "supervisor" && !user.portalRole) {
      user.portalRole = "supervisor";
      await user.save();
    }
    res.status(201).json({ organisation: await describe(req.organisation) });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "That account already belongs to an organisation" });
    }
    next(err);
  }
});

/** Detach a member. Their own records and any pass of their own are untouched. */
router.delete("/organisations/:id/members/:userId", loadOrganisation, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) return res.status(404).json({ message: "Not found" });
    const result = await OrganisationMember.deleteOne({
      organisationId: req.organisation._id,
      userId: req.params.userId,
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Not found" });
    res.json({ organisation: await describe(req.organisation) });
  } catch (err) {
    next(err);
  }
});

/** Record an invoice or bank transfer (§7). Expiry is set separately. */
router.post("/organisations/:id/payments", loadOrganisation, async (req, res, next) => {
  try {
    const method = req.body?.method;
    const currency = req.body?.currency;
    const reference = String(req.body?.reference || "").trim();
    const amount = Number(req.body?.amount);
    if (!["invoice", "bank_transfer"].includes(method)) {
      return res.status(400).json({ message: "Method must be invoice or bank transfer" });
    }
    if (!["EUR", "PKR", "USD"].includes(currency)) {
      return res.status(400).json({ message: "Currency must be EUR, PKR or USD" });
    }
    if (!reference) return res.status(400).json({ message: "Payment reference is required" });
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ message: "Enter a valid amount" });

    await OrganisationPayment.create({
      organisationId: req.organisation._id,
      method,
      reference,
      amount,
      currency,
      recordedBy: req.user._id,
    });
    res.status(201).json({ organisation: await describe(req.organisation) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
