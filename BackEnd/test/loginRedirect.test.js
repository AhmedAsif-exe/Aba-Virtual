// Login fix c0acde5: after Google sign-in, users go back to where they were
// heading (e.g. checkout with their plan and period), or to their portal
// home. Drives the real Routes/auth.js Google legs with a stand-in strategy
// in place of Google.
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const request = require("supertest");

process.env.FRONTEND_URL = "http://front.test/";

let nextUser = null;
class StandInGoogle extends passport.Strategy {
  constructor() {
    super();
    this.name = "google";
  }
  authenticate(req) {
    if (req.path.endsWith("/callback")) this.success(nextUser);
    else this.redirect("https://accounts.google.test/auth");
  }
}

let app;
before(() => {
  passport.use(new StandInGoogle());
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));
  app = express();
  app.use(session({ secret: "test", resave: false, saveUninitialized: false }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use("/auth", require("../Routes/auth"));
});
after(() => passport.unuse("google"));

const returnCookie = (res) =>
  (res.headers["set-cookie"] || []).find((c) => c.startsWith("loginReturnTo="))?.split(";")[0];

test("the destination, query and all, survives the Google round trip and is then cleared", async () => {
  const start = await request(app).get(
    "/auth/google?from=" + encodeURIComponent("/checkout?plan=professional&period=yearly"),
  );
  const cookie = returnCookie(start);
  assert.match(cookie, /^loginReturnTo=.+/);

  nextUser = { _id: "1", portalRole: null };
  const back = await request(app).get("/auth/google/callback").set("Cookie", cookie);
  assert.strictEqual(back.headers.location, "http://front.test/checkout?plan=professional&period=yearly");
  assert.strictEqual(returnCookie(back), "loginReturnTo=");
});

test("with no destination, supervisors and supervisees land on their portal, others on home", async () => {
  for (const [role, path] of [
    ["supervisor", "/portal/supervisees"],
    ["supervisee", "/portal"],
    [null, "/"],
  ]) {
    nextUser = { _id: "2", portalRole: role };
    const back = await request(app).get("/auth/google/callback");
    assert.strictEqual(back.headers.location, `http://front.test${path}`, String(role));
  }
});

test("links to other sites are never followed", async () => {
  for (const bad of ["//evil.test", "/\\evil.test", "https://evil.test"]) {
    const start = await request(app).get("/auth/google?from=" + encodeURIComponent(bad));
    assert.strictEqual(returnCookie(start), "loginReturnTo=", `not stored: ${bad}`);

    nextUser = { _id: "3", portalRole: null };
    const back = await request(app)
      .get("/auth/google/callback")
      .set("Cookie", `loginReturnTo=${encodeURIComponent(bad)}`);
    assert.strictEqual(back.headers.location, "http://front.test/", `not followed: ${bad}`);
  }
});
