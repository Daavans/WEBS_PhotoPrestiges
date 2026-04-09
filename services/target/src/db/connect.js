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
  await photos.createIndex({ userId: 1 });
  await photos.createIndex({ status: 1 });
  await photos.createIndex({ uploadedAt: -1 });
  await photos.createIndex({ 'tags.tag': 1 });
  await photos.createIndex({ endsAt: 1 });
  // 2dsphere index for geo queries on location.coords
  await photos.createIndex({ 'location.coords': '2dsphere' }).catch(() => {});

  const regs = db.collection('target_registrations');
  await regs.createIndex({ targetPhotoId: 1 });
  await regs.createIndex({ userId: 1 });
  await regs.createIndex({ targetPhotoId: 1, userId: 1 }, { unique: true });
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
