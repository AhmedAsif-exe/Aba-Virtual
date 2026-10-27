// A minimal app around the real routers, with the session replaced by an
// `x-test-user` header naming the signed-in user's id.
const express = require("express");
const User = require("../../Schema/User");

function buildApp(mounts) {
  const app = express();
  app.use(express.json());
  app.use(async (req, res, next) => {
    try {
      const id = req.get("x-test-user");
      req.user = id ? await User.findById(id) : null;
      req.isAuthenticated = () => Boolean(req.user);
      next();
    } catch (err) {
      next(err);
    }
  });
  for (const [path, router] of Object.entries(mounts)) app.use(path, router);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
  return app;
}

module.exports = { buildApp };
