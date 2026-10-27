/**
 * Grants (or removes) ABA Virtual site-admin access: the internal screen for
 * Custom plans, and later the standard boards.
 *
 *   node scripts/promoteAdmin.js someone@example.com
 *   node scripts/promoteAdmin.js someone@example.com --remove
 *
 * Deliberately a script and not a route, like promoteSupervisor.js: nothing
 * on the network can make an account a site admin. Running this needs shell
 * access to the server. Emails are never stored in code.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../Schema/User");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function main() {
  const email = (process.argv[2] || "").trim();
  const remove = process.argv.includes("--remove");
  if (!email || email.startsWith("--")) {
    console.error("Usage: node scripts/promoteAdmin.js <email> [--remove]");
    process.exit(1);
  }

  console.log(`Database: ${String(process.env.MONGODB_URI).replace(/\/\/[^@]*@/, "//***@")}`);
  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, "i") });
  if (!user) {
    console.error(`No account found for ${email}. Sign in on the site once first.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  if (Boolean(user.siteAdmin) === !remove) {
    console.log(`${user.email} ${remove ? "is not" : "is already"} a site admin.`);
  } else {
    user.siteAdmin = !remove;
    await user.save();
    console.log(`${user.email} ${remove ? "is no longer" : "is now"} a site admin.`);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
