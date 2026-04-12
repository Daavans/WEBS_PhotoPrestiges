const { MongoClient } = require('mongodb');
const config = require('../config');

const DEFAULT_DB_NAME = 'photoprestiges';
const TEXT_INDEX_NAME = 'photos_text_search';
const INDEX_CONFLICT_CODE = 85;
const INDEX_KEY_CONFLICT_CODE = 86;

let client;
let db;

async function connect() {
  if (db) return db;
  client = new MongoClient(config.mongodbUri);
  await client.connect();
  const url = new URL(config.mongodbUri);
  const dbName = url.pathname.slice(1) || DEFAULT_DB_NAME;
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
  // Full-text search index covering title, description, tags and location.description.
  // Drops and recreates if weights differ from an existing index (codes 85/86).
  const textIndexSpec = { title: 'text', description: 'text', 'tags.tag': 'text', 'location.description': 'text' };
  const textIndexOpts = { name: TEXT_INDEX_NAME, weights: { title: 10, description: 5, 'tags.tag': 3, 'location.description': 2 } };
  try {
    await photos.createIndex(textIndexSpec, textIndexOpts);
  } catch (err) {
    if (err.code === INDEX_CONFLICT_CODE || err.code === INDEX_KEY_CONFLICT_CODE) {
      await photos.dropIndex(TEXT_INDEX_NAME).catch(() => {});
      await photos.createIndex(textIndexSpec, textIndexOpts);
    }
  }
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
