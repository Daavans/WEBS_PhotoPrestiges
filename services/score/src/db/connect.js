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
  const scores = db.collection('submission_scores');
  await scores.createIndex({ userId: 1 });
  await scores.createIndex({ targetPhotoId: 1 });
  await scores.createIndex({ score: -1 });
  await scores.createIndex({ submittedAt: -1 });
  // Prevent duplicate entries for same submission
  await scores.createIndex({ submissionId: 1 }, { unique: true });
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

module.exports = { connect, getDb, close };
