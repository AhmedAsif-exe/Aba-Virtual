/**
 * Seeds the three certifying boards the supervisor works with today.
 *
 *   node scripts/seedBoards.js
 *
 * Run-once and idempotent — it skips any board whose name already exists, so
 * re-running never overwrites hours figures she has since edited in the admin
 * panel. Everything after this seed is managed from that panel, not here.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const SupervisionBoard = require("../Schema/SupervisionBoard");

// defaultRequiredHours/defaultRatio are prefills for the "add supervisee"
// form only; the real figures are entered per supervisee because they vary
// with when the trainee started and which pathway they are on.
const BOARDS = [
  {
    name: "BACB",
    fullName: "Behavior Analyst Certification Board",
    defaultRequiredHours: 2000,
    defaultRatio: "1:10",
    sortOrder: 1,
  },
  {
    name: "IBAO",
    fullName: "International Behavior Analysis Organization",
    defaultRequiredHours: 1500,
    defaultRatio: "1:10",
    sortOrder: 2,
  },
  {
    name: "QABA",
    fullName: "Qualified Applied Behavior Analysis Credentialing Board",
    defaultRequiredHours: 1500,
    defaultRatio: "1:30",
    sortOrder: 3,
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const board of BOARDS) {
    const existing = await SupervisionBoard.findOne({ name: board.name });
    if (existing) {
      console.log(`- ${board.name} already exists, leaving it alone`);
      continue;
    }
    await SupervisionBoard.create(board);
    console.log(`+ created ${board.name}`);
  }

  console.log(
    "\nThese defaults are prefills only — confirm the figures with Faiza and edit them in the admin panel.",
  );
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
