// In-memory MongoDB for tests. Never touches the database in .env.
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let server;

async function connect() {
  server = await MongoMemoryServer.create();
  await mongoose.connect(server.getUri());
}

async function clear() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

async function disconnect() {
  await mongoose.disconnect();
  if (server) await server.stop();
}

/** The in-memory server's address, for scripts run as child processes. */
const uri = () => server.getUri();

module.exports = { connect, clear, disconnect, uri };
