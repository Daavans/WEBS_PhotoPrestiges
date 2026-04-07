const { ObjectId } = require('mongodb');

// ── email_queue ───────────────────────────────────────────────────────────────

async function insertQueuedEmail(db, doc) {
  const queue = db.collection('email_queue');
  const result = await queue.insertOne({
    ...doc,
    status: 'queued',
    attempts: 0,
    lastAttemptAt: null,
    sentAt: null,
    error: null,
    createdAt: new Date(),
  });
  return result.insertedId;
}

async function findQueuedBatch(db, batchSize, maxRetries) {
  const queue = db.collection('email_queue');
  return queue.find({
    $or: [
      { status: 'queued' },
      { status: 'failed', attempts: { $lt: maxRetries } },
    ],
  })
    .sort({ priority: -1, createdAt: 1 })
    .limit(batchSize)
    .toArray();
}

// Returns true if this worker successfully claimed the item (atomic via status check).
async function markEmailSending(db, id) {
  const queue = db.collection('email_queue');
  const result = await queue.updateOne(
    { _id: new ObjectId(id), status: { $in: ['queued', 'failed'] } },
    { $set: { status: 'sending', lastAttemptAt: new Date() }, $inc: { attempts: 1 } }
  );
  return result.modifiedCount === 1;
}

async function markEmailSent(db, id, messageId) {
  const queue = db.collection('email_queue');
  await queue.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'sent', sentAt: new Date(), messageId } }
  );
}

async function markEmailFailed(db, id, errorMessage, maxRetries) {
  const queue = db.collection('email_queue');
  const item = await queue.findOne({ _id: new ObjectId(id) });
  const attempts = item?.attempts || 0;
  const status = attempts >= maxRetries ? 'permanently_failed' : 'failed';
  await queue.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, error: errorMessage } }
  );
}

// ── email_preferences ─────────────────────────────────────────────────────────

async function findPreferencesByUserId(db, userId) {
  const prefs = db.collection('email_preferences');
  return prefs.findOne({ userId });
}

async function upsertPreferences(db, userId, updates) {
  const prefs = db.collection('email_preferences');
  await prefs.updateOne(
    { userId },
    { $set: { ...updates, userId, updatedAt: new Date() } },
    { upsert: true }
  );
  return prefs.findOne({ userId });
}

async function findPreferencesByUnsubscribeToken(db, token) {
  const prefs = db.collection('email_preferences');
  return prefs.findOne({ unsubscribeToken: token });
}

// ── email_logs ────────────────────────────────────────────────────────────────

async function insertEmailLog(db, doc) {
  const logs = db.collection('email_logs');
  const result = await logs.insertOne({ ...doc, sentAt: new Date() });
  return result.insertedId;
}

module.exports = {
  insertQueuedEmail,
  findQueuedBatch,
  markEmailSending,
  markEmailSent,
  markEmailFailed,
  findPreferencesByUserId,
  upsertPreferences,
  findPreferencesByUnsubscribeToken,
  insertEmailLog,
};
