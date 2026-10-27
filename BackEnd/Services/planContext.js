// The context entitlements need for one user: the organisation whose plan
// they're on, if any (Custom in Phase 1, Clinic in Phase 2). Members share
// the organisation's plan and expiry; everyone else uses their own pass.

const OrganisationMember = require("../Schema/OrganisationMember");
const Organisation = require("../Schema/Organisation");

/** @returns {Promise<{organisation: object|null}>} */
async function planContextFor(userId) {
  const membership = await OrganisationMember.findOne({ userId }).select("organisationId").lean();
  if (!membership) return { organisation: null };
  const organisation = await Organisation.findById(membership.organisationId).lean();
  return { organisation };
}

module.exports = { planContextFor };
