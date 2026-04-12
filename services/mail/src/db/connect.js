const { MongoClient } = require('mongodb');
const config = require('../config');

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(config.mongodbUri);
  await client.connect();
  const url = new URL(config.mongodbUri);
  const dbName = url.pathname.slice(1) || 'photoprestiges';
  db = client.db(dbName);
  await ensureIndexes();
  return db;
}

async function ensureIndexes() {
  if (!db) return;

  const queue = db.collection('email_queue');
  await queue.createIndex({ status: 1, priority: -1, createdAt: 1 });
  await queue.createIndex({ userId: 1 });
  await queue.createIndex({ createdAt: 1 });

  const prefs = db.collection('email_preferences');
  await prefs.createIndex({ userId: 1 }, { unique: true });
  await prefs.createIndex({ unsubscribeToken: 1 }, { unique: true, sparse: true });

  const logs = db.collection('email_logs');
  await logs.createIndex({ userId: 1 });
  await logs.createIndex({ to: 1 });
  await logs.createIndex({ sentAt: -1 });
}

function getDb() {
  if (!db) throw new Error('DB not connected; call connect() first');
  return db;
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connect, getDb, close, ensureIndexes };
