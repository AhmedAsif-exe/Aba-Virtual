const User = require("../../Schema/User");
const SupervisionBoard = require("../../Schema/SupervisionBoard");
const SuperviseeProfile = require("../../Schema/SuperviseeProfile");

const DAY_MS = 24 * 60 * 60 * 1000;
const daysFromNow = (days) => new Date(Date.now() + days * DAY_MS);

let counter = 0;
const uniqueEmail = (prefix) => `${prefix}${++counter}@example.test`;

function makeSupervisor({ planKey = "professional", expiresAt = daysFromNow(30), ...rest } = {}) {
  return User.create({
    name: "Supervisor",
    email: uniqueEmail("supervisor"),
    portalRole: "supervisor",
    supervisionPlan: { planKey, expiresAt },
    ...rest,
  });
}

const makeBoard = (name = "BACB") =>
  SupervisionBoard.findOneAndUpdate(
    { name },
    { name, defaultRequiredHours: 2000, defaultRatio: "1:10" },
    { upsert: true, new: true },
  );

async function makeSupervisee(supervisor, profileFields = {}) {
  const board = await makeBoard();
  const user = await User.create({
    name: "Supervisee",
    email: uniqueEmail("supervisee"),
    portalRole: "supervisee",
  });
  const profile = await SuperviseeProfile.create({
    userId: user._id,
    supervisorId: supervisor._id,
    boardId: board._id,
    requiredTotalHours: 1500,
    supervisionStartDate: new Date("2026-01-01"),
    ...profileFields,
  });
  return { user, profile };
}

module.exports = { daysFromNow, makeSupervisor, makeBoard, makeSupervisee };
