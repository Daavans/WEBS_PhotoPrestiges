const { getDb } = require('../db/connect');

async function cleanupExpiredSessions() {
  const db = getDb();
  const result = await db.collection('sessions').deleteMany({
    expiresAt: { $lt: new Date() },
  });
  console.log(`[cleanup-sessions] Removed ${result.deletedCount} expired sessions`);
  return { deletedSessions: result.deletedCount };
}

async function cleanupExpiredVerifications() {
  const db = getDb();
  const result = await db.collection('email_verifications').deleteMany({
    expiresAt: { $lt: new Date() },
  });
  console.log(`[cleanup-verifications] Removed ${result.deletedCount} expired verifications`);
  return { deletedVerifications: result.deletedCount };
}

module.exports = { cleanupExpiredSessions, cleanupExpiredVerifications };
