const { test, before, after } = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const db = require("./helpers/db");

before(db.connect);
after(db.disconnect);

test("tests run against an in-memory database", () => {
  assert.match(mongoose.connection.host, /127\.0\.0\.1|localhost/);
});
