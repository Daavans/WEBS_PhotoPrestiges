const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const dbQueries = require('../db/queries');
const config = require('../config');
const { getDb } = require('../db/connect');
const publisher = require('../messaging/publisher');

async function queueWelcomeEmail({ email, username, verificationToken, userId }) {
  if (!config.mailServiceUrl) return;
  const baseUrl = config.publicBaseUrl || `http://localhost:${config.port}`;
  const verificationUrl = `${baseUrl}/api/register/verify?token=${verificationToken}`;
  try {
    const headers = config.serviceSecret ? { 'X-Service-Secret': config.serviceSecret } : {};
    await axios.post(`${config.mailServiceUrl}/api/mail/send`, {
      to: email,
      template: 'welcome',
      userId,
      data: {
        username,
        verificationUrl,
        unsubscribeUrl: config.unsubscribeUrl,
      },
      priority: 'high',
    }, { headers });
  } catch (err) {
    console.error('[register] Failed to queue welcome email:', err.message);
  }
}

function parseExpiryToMs(expiryString) {
  const match = (expiryString || '24h').match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const [, num, unit] = match;
  const n = parseInt(num, 10);
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return n * (multipliers[unit] || 86400000);
}

async function register({ email, password, username, firstName, lastName }) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();
  const existingByEmail = await dbQueries.findUserByEmailForAuth(db, normalizedEmail);
  if (existingByEmail) return { conflict: 'email' };
  const normalizedUsername = (username || '').trim().toLowerCase();
  if (normalizedUsername) {
    const existingByUsername = await dbQueries.findUserByUsername(db, normalizedUsername);
    if (existingByUsername) return { conflict: 'username' };
  }
  const password_hash = await bcrypt.hash(password, config.bcryptRounds);
  const userDoc = {
    email: normalizedEmail,
    username: normalizedUsername || normalizedEmail.split('@')[0],
    password_hash,
    firstName: (firstName || '').trim() || null,
    lastName: (lastName || '').trim() || null,
    role: 'user',
    verified: false,
  };
  const userId = await dbQueries.createUser(db, userDoc);
  await dbQueries.createUserStats(db, userId);
  const verificationToken = uuidv4();
  const expiresAt = new Date(Date.now() + parseExpiryToMs(config.verificationTokenExpiry));
  await dbQueries.createEmailVerification(db, {
    userId,
    token: verificationToken,
    expiresAt,
  });
  queueWelcomeEmail({ email: normalizedEmail, username: userDoc.username, verificationToken, userId: userId.toString() });
  publisher.publish('user.registered', {
    userId: userId.toString(),
    email: normalizedEmail,
    username: userDoc.username,
    password_hash: userDoc.password_hash,
    role: userDoc.role,
    registeredAt: new Date().toISOString(),
  });
  return {
    userId: userId.toString(),
    message: 'Registration successful. Please check your email to verify your account.',
  };
}

async function verifyEmail(token) {
  const db = getDb();
  const verification = await dbQueries.findEmailVerificationByToken(db, token);
  if (!verification) return null;
  const users = db.collection('users');
  await users.updateOne(
    { _id: verification.userId },
    { $set: { verified: true, updatedAt: new Date() } }
  );
  await dbQueries.deleteEmailVerification(db, token);
  return { userId: verification.userId.toString() };
}

async function getProfile(userId) {
  const db = getDb();
  const user = await dbQueries.findUserById(db, userId);
  if (!user) return null;
  const stats = await dbQueries.findUserStats(db, userId);
  return {
    id: user._id.toString(),
    email: user.email,
    username: user.username || user.email,
    firstName: user.firstName || null,
    lastName: user.lastName || null,
    bio: user.bio || null,
    avatarUrl: user.avatarUrl || null,
    verified: user.verified ?? false,
    role: user.role || 'user',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    stats: stats
      ? {
          totalPhotos: stats.totalPhotos ?? 0,
          totalVotesReceived: stats.totalVotesReceived ?? 0,
          totalVotesGiven: stats.totalVotesGiven ?? 0,
          points: stats.points ?? 0,
          level: stats.level ?? 1,
        }
      : { totalPhotos: 0, totalVotesReceived: 0, totalVotesGiven: 0, points: 0, level: 1 },
  };
}

async function updateProfile(userId, data) {
  const db = getDb();
  const allowed = ['firstName', 'lastName', 'bio', 'avatarUrl'];
  const update = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      update[key] = typeof data[key] === 'string' ? data[key].trim() || null : data[key];
    }
  }
  if (Object.keys(update).length === 0) {
    return await getProfile(userId);
  }
  const result = await dbQueries.updateUser(db, userId, update);
  if (!result || !result.value) return null;
  return getProfile(userId);
}

async function deleteAccount(userId) {
  const db = getDb();
  return dbQueries.softDeleteUser(db, userId);
}

module.exports = {
  register,
  verifyEmail,
  getProfile,
  updateProfile,
  deleteAccount,
};
