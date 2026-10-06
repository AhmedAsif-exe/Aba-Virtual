/**
 * Grants an existing account the supervisor role.
 *
 *   node scripts/promoteSupervisor.js ffazian.aba@gmail.com
 *
 * Deliberately a script and not a route. Supervisor access reaches every
 * trainee's hour log and private notes, so there is nothing on the network —
 * not even an admin-key endpoint like the ones in Routes/games.js — that can
 * grant it. Running this needs shell access to the VPS.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../Schema/User");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  const email = (process.argv[2] || "").trim();
  if (!email) {
    console.error("Usage: node scripts/promoteSupervisor.js <email>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
  if (!user) {
    console.error(`No account found for ${email}. Sign in on the site once first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (user.portalRole === "supervisor") {
    console.log(`${user.email} is already a supervisor.`);
  } else {
    user.portalRole = "supervisor";
    await user.save();
    console.log(`${user.email} is now a supervisor.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
