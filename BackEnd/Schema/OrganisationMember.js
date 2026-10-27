const mongoose = require("mongoose");

/** A login's place in an organisation. One organisation per user. */
const organisationMemberSchema = new mongoose.Schema(
  {
    organisationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    role: { type: String, enum: ["admin", "supervisor"], required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("OrganisationMember", organisationMemberSchema);
