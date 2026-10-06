const express = require("express");
const passport = require("passport");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const User = require("../Schema/User");

const router = express.Router();

function backendBase() {
  return (process.env.BACKEND_PUBLIC_URL || "http://localhost:5000").replace(
    /\/+$/,
    "",
  );
}

const AVATAR_DIR = path.join(__dirname, "..", "uploads", "avatars");
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${req.user._id}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Manual Register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashed });
    await user.save();

    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Manual Login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(400).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      // Serialise explicitly rather than echoing the Mongoose document, which
      // carried the bcrypt hash and googleId back to the browser. The client
      // reads its user from /auth/me anyway; this just stops the login
      // response being the one place a password hash leaves the server.
      res.json({
        message: "Login successful",
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          role: user.role,
          portalRole: user.portalRole || null,
          mustChangePassword: !!user.mustChangePassword,
        },
      });
    });
  })(req, res, next);
});

// Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL);
  }
);

// routes/auth.js
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // clear the cookie
      res.json({ message: "Logged out successfully" });
    });
  });
});
router.get("/me", async (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const { name, email, pfp, _id, paidItems, role, password, portalRole, mustChangePassword } =
      req.user;
    res.json({
      user: {
        name,
        email,
        pfp,
        _id,
        paidItems,
        role,
        hasPassword: !!password,
        // Supervision portal. `portalRole` drives which portal screens the
        // frontend offers; it is read-only here and set only by
        // scripts/promoteSupervisor.js or by a supervisor creating an
        // account. The frontend guard is cosmetic — every supervision route
        // re-checks this server-side (Middleware/supervisionAuth.js).
        portalRole: portalRole || null,
        mustChangePassword: !!mustChangePassword,
      },
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

function ensureAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ message: "Not authenticated" });
}

const ROLES = ["Parent", "Trainer", "Caretaker"];

// Update the caller's own profile. Only `role` is editable here today.
//
// Do NOT widen this to spread req.body, and do NOT add `portalRole` to ROLES.
// This route lets a user set their own value, so anything reachable from here
// is self-grantable: putting portal access in reach would let any customer
// hand themselves a supervisee's — or a supervisor's — view of every trainee's
// hour log. `role` is a self-declared descriptor; portalRole is a permission
// and is only ever written server-side.
router.patch("/profile", ensureAuth, async (req, res) => {
  const { role } = req.body || {};
  if (role !== undefined && role !== null && !ROLES.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  req.user.role = role || null;
  await req.user.save();
  res.json({ role: req.user.role });
});

// Change (or, for Google-only accounts with no password yet, set) the
// caller's password. Existing local accounts must prove they know the
// current password; Google-only accounts have none to prove.
router.post("/change-password", ensureAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: "New password must be at least 6 characters long" });
  }

  if (req.user.password) {
    const isMatch = await bcrypt.compare(currentPassword || "", req.user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
  }

  req.user.password = await bcrypt.hash(newPassword, 10);
  // A supervisee created by the supervisor starts on a generated password and
  // is locked out of the portal until they replace it; this is where that
  // lock lifts.
  req.user.mustChangePassword = false;
  await req.user.save();
  res.json({ message: "Password updated" });
});

// Upload/replace the caller's profile picture.
router.post("/avatar", ensureAuth, (req, res) => {
  avatarUpload.single("avatar")(req, res, async (err) => {
    if (err) return res.status(400).json({ message: err.message });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const previousPfp = req.user.pfp;
    req.user.pfp = `${backendBase()}/uploads/avatars/${req.file.filename}`;
    await req.user.save();

    // Best-effort cleanup of the previous locally-hosted avatar (never a
    // Google photo URL, which lives outside AVATAR_DIR and must not be touched).
    if (previousPfp?.includes("/uploads/avatars/")) {
      const oldPath = path.join(AVATAR_DIR, path.basename(previousPfp));
      fs.unlink(oldPath, () => {});
    }

    res.json({ pfp: req.user.pfp });
  });
});

module.exports = router;
