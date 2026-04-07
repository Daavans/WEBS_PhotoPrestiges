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
  const photos = db.collection('photos');
  await photos.createIndex({ status: 1, uploadedAt: -1 });
  await photos.createIndex({ status: 1, views: -1 });
  await photos.createIndex({ userId: 1, status: 1 });
  await photos.createIndex({ 'tags.tag': 1, status: 1 });
  // Text index for search
  await photos.createIndex(
    { title: 'text', description: 'text', 'tags.tag': 'text' },
    { name: 'photos_text_search' }
  ).catch(() => { /* index may already exist with different name */ });
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
