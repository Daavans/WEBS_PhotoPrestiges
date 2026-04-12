const { ObjectId } = require('mongodb');

async function createUser(db, doc) {
  const users = db.collection('users');
  const result = await users.insertOne({
    ...doc,
    role: doc.role || 'user',
    verified: doc.verified ?? false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return result.insertedId;
}

async function findUserByEmail(db, email) {
  const users = db.collection('users');
  return users.findOne(
    { email: email.toLowerCase().trim(), deletedAt: { $exists: false } },
    { projection: { password_hash: 0 } }
  );
}

async function findUserById(db, userId) {
  const users = db.collection('users');
  return users.findOne(
    { _id: new ObjectId(userId), deletedAt: { $exists: false } },
    { projection: { password_hash: 0 } }
  );
}

async function findUserByEmailForAuth(db, email) {
  const users = db.collection('users');
  return users.findOne(
    { email: email.toLowerCase().trim(), deletedAt: { $exists: false } },
    { projection: { _id: 1, email: 1, username: 1, role: 1, password_hash: 1 } }
  );
}

async function findUserByUsername(db, username) {
  const users = db.collection('users');
  return users.findOne(
    { username: (username || '').trim().toLowerCase(), deletedAt: { $exists: false } },
    { projection: { _id: 1 } }
  );
}

async function updateUser(db, userId, update) {
  const users = db.collection('users');
  const result = await users.findOneAndUpdate(
    { _id: new ObjectId(userId), deletedAt: { $exists: false } },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { password_hash: 0 } }
  );
  return result;
}

async function softDeleteUser(db, userId) {
  const users = db.collection('users');
  const result = await users.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { deletedAt: new Date(), updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

async function createEmailVerification(db, { userId, token, expiresAt }) {
  const coll = db.collection('email_verifications');
  const result = await coll.insertOne({
    userId: new ObjectId(userId),
    token,
    expiresAt: new Date(expiresAt),
    createdAt: new Date(),
  });
  return result.insertedId;
}

async function findEmailVerificationByToken(db, token) {
  const coll = db.collection('email_verifications');
  return coll.findOne({
    token,
    expiresAt: { $gt: new Date() },
  });
}

async function deleteEmailVerification(db, token) {
  const coll = db.collection('email_verifications');
  const result = await coll.deleteOne({ token });
  return result.deletedCount > 0;
}

async function createUserStats(db, userId) {
  const coll = db.collection('user_stats');
  const result = await coll.insertOne({
    userId: new ObjectId(userId),
    totalPhotos: 0,
    totalVotesReceived: 0,
    totalVotesGiven: 0,
    points: 0,
    level: 1,
    updatedAt: new Date(),
  });
  return result.insertedId;
}

async function findUserStats(db, userId) {
  const coll = db.collection('user_stats');
  return coll.findOne({ userId: new ObjectId(userId) });
}

async function updateUserStats(db, userId, update) {
  const coll = db.collection('user_stats');
  await coll.updateOne(
    { userId: new ObjectId(userId) },
    { $set: { ...update, updatedAt: new Date() } },
    { upsert: true }
  );
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByEmailForAuth,
  findUserByUsername,
  updateUser,
  softDeleteUser,
  createEmailVerification,
  findEmailVerificationByToken,
  deleteEmailVerification,
  createUserStats,
  findUserStats,
  updateUserStats,
};
