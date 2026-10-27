// §4.4: when a pass ends the supervisor is read-only and their supervisees
// can view but not log hours. Enforced on the server, route by route.
const { test, describe, before, after, beforeEach } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const request = require("supertest");

const db = require("./helpers/db");
const { buildApp } = require("./helpers/app");
const { daysFromNow, makeSupervisor, makeSupervisee } = require("./helpers/fixtures");
const supervisionRouter = require("../Routes/supervision");
const boardsRouter = require("../Routes/boards");
const { SUPERVISOR_PLAN_ENDED } = require("../Middleware/supervisionAuth");

const app = buildApp({ "/supervision": supervisionRouter, "/boards": boardsRouter });
const as = (user) => ({ "x-test-user": String(user._id) });

// Writes that stay open while read-only, on purpose (see the plan, §12).
const ALLOWED_WHILE_READ_ONLY = new Set([
  "post /supervisees/:id/reset-password",
  "delete /shares/:shareId",
]);

/** Every non-GET supervisor route the router actually defines. */
function supervisorWriteRoutes() {
  const routes = [];
  for (const layer of supervisionRouter.stack) {
    const route = layer.route;
    if (!route || route.path.startsWith("/me") || route.path.startsWith("/shared")) continue;
    for (const method of Object.keys(route.methods)) {
      if (method === "get" || ALLOWED_WHILE_READ_ONLY.has(`${method} ${route.path}`)) continue;
      routes.push({ method, path: route.path });
    }
  }
  return routes;
}

const fillParams = (path) =>
  path
    .replace(":month", "2026-10")
    .replace(/:[a-zA-Z]+/g, () => String(new mongoose.Types.ObjectId()));

before(db.connect);
after(db.disconnect);
beforeEach(db.clear);

describe("expired supervisor (§4.4)", () => {
  test("every supervisor write route answers 402", async () => {
    const supervisor = await makeSupervisor({ expiresAt: daysFromNow(-1) });
    const routes = supervisorWriteRoutes();
    assert.ok(routes.length >= 18, `expected at least 18 write routes, found ${routes.length}`);

    for (const { method, path } of routes) {
      const res = await request(app)[method](`/supervision${fillParams(path)}`).set(as(supervisor)).send({});
      assert.strictEqual(res.status, 402, `${method.toUpperCase()} ${path} returned ${res.status}`);
      assert.strictEqual(res.body.planExpired, true);
    }
  });

  test("board writes answer 402", async () => {
    const supervisor = await makeSupervisor({ expiresAt: daysFromNow(-1) });
    const id = String(new mongoose.Types.ObjectId());
    for (const [method, path] of [["post", "/boards"], ["patch", `/boards/${id}`], ["delete", `/boards/${id}`]]) {
      const res = await request(app)[method](path).set(as(supervisor)).send({ name: "X" });
      assert.strictEqual(res.status, 402, `${method} ${path}`);
    }
  });

  test("can still read the roster, each record and the boards", async () => {
    const supervisor = await makeSupervisor({ expiresAt: daysFromNow(-1) });
    const { profile } = await makeSupervisee(supervisor);
    const id = profile._id;
    for (const path of [
      "/supervision/supervisees",
      `/supervision/supervisees/${id}`,
      `/supervision/supervisees/${id}/progress`,
      `/supervision/supervisees/${id}/hours`,
      `/supervision/supervisees/${id}/meetings`,
      `/supervision/supervisees/${id}/assignments`,
      `/supervision/supervisees/${id}/payments`,
      "/supervision/shares",
      "/boards",
    ]) {
      const res = await request(app).get(path).set(as(supervisor));
      assert.strictEqual(res.status, 200, `GET ${path} returned ${res.status}`);
    }
  });

  test("can still reset a supervisee's password (account recovery)", async () => {
    const supervisor = await makeSupervisor({ expiresAt: daysFromNow(-1) });
    const { profile } = await makeSupervisee(supervisor);
    const res = await request(app)
      .post(`/supervision/supervisees/${profile._id}/reset-password`)
      .set(as(supervisor));
    assert.strictEqual(res.status, 200);
  });
});

describe("active, legacy and complimentary supervisors can write", () => {
  const logHours = async (supervisor) => {
    const { profile } = await makeSupervisee(supervisor);
    return request(app)
      .post(`/supervision/supervisees/${profile._id}/hours`)
      .set(as(supervisor))
      .send({ weekStartDate: "2026-10-05", hours: 10 });
  };

  test("active pass", async () => {
    assert.strictEqual((await logHours(await makeSupervisor())).status, 201);
  });

  test("pre-migration Yearly pass still in date", async () => {
    const supervisor = await makeSupervisor({ planKey: null });
    supervisor.supervisionPlan.plan = "supervision-yearly";
    await supervisor.save();
    assert.strictEqual((await logHours(supervisor)).status, 201);
  });

  test("complimentary account with no expiry", async () => {
    const supervisor = await makeSupervisor({ planKey: null, expiresAt: null, email: "ffaizan.aba@gmail.com" });
    assert.strictEqual((await logHours(supervisor)).status, 201);
  });
});

describe("supervisees of an expired supervisor (§4.4)", () => {
  test("can view but cannot log hours, with the spec's message", async () => {
    const supervisor = await makeSupervisor({ expiresAt: daysFromNow(-1) });
    const { user } = await makeSupervisee(supervisor);

    const view = await request(app).get("/supervision/me/hours").set(as(user));
    assert.strictEqual(view.status, 200);
    assert.strictEqual((await request(app).get("/supervision/me").set(as(user))).status, 200);

    const log = await request(app)
      .post("/supervision/me/hours")
      .set(as(user))
      .send({ weekStartDate: "2026-10-05", hours: 10 });
    assert.strictEqual(log.status, 402);
    assert.strictEqual(
      log.body.message,
      "Your supervisor's plan has ended. You can view your records. Logging opens again when they renew.",
    );
    assert.strictEqual(log.body.message, SUPERVISOR_PLAN_ENDED);

    const id = String(new mongoose.Types.ObjectId());
    assert.strictEqual((await request(app).patch(`/supervision/me/hours/${id}`).set(as(user)).send({})).status, 402);
    assert.strictEqual((await request(app).delete(`/supervision/me/hours/${id}`).set(as(user))).status, 402);
  });

  test("log hours again once the supervisor has an active pass", async () => {
    const supervisor = await makeSupervisor();
    const { user } = await makeSupervisee(supervisor);
    const log = await request(app)
      .post("/supervision/me/hours")
      .set(as(user))
      .send({ weekStartDate: "2026-10-05", hours: 10 });
    assert.strictEqual(log.status, 201);
  });
});
