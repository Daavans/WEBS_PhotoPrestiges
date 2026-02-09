const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function findUserByEmail(db, email) {
  const users = db.collection('users');
  return users.findOne(
    { email: email.toLowerCase().trim(), deletedAt: { $exists: false } },
    { projection: { _id: 1, email: 1, username: 1, role: 1, password_hash: 1 } }
  );
}

async function createSession(db, { userId, tokenHash, refreshTokenHash, expiresAt }) {
  const sessions = db.collection('sessions');
  const doc = {
    userId,
    tokenHash,
    refreshTokenHash,
    expiresAt: new Date(expiresAt),
    createdAt: new Date(),
  };
  const result = await sessions.insertOne(doc);
  return result.insertedId;
}

async function findSessionByRefreshHash(db, refreshTokenHash) {
  const sessions = db.collection('sessions');
  return sessions.findOne({
    refreshTokenHash,
    expiresAt: { $gt: new Date() },
  });
}

async function deleteSessionByTokenHash(db, tokenHash) {
  const sessions = db.collection('sessions');
  const result = await sessions.deleteOne({ tokenHash });
  return result.deletedCount > 0;
}

async function deleteSessionByRefreshHash(db, refreshTokenHash) {
  const sessions = db.collection('sessions');
  const result = await sessions.deleteOne({ refreshTokenHash });
  return result.deletedCount > 0;
}

module.exports = {
  hashToken,
  findUserByEmail,
  createSession,
  findSessionByRefreshHash,
  deleteSessionByTokenHash,
  deleteSessionByRefreshHash,
};
