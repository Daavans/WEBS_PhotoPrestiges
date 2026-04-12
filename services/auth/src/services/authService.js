const bcrypt = require('bcryptjs');
const dbQueries = require('../db/queries');
const jwtUtils = require('../utils/jwt');
const config = require('../config');
const { getDb } = require('../db/connect');

const DEFAULT_EXPIRY_MS = 86400000;

async function login(email, password) {
  const db = getDb();
  const user = await dbQueries.findUserByEmail(db, email);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.password_hash || '');
  if (!match) return null;

  const userId = user._id.toString();
  const accessToken = jwtUtils.generateAccessToken({
    userId,
    email: user.email,
    role: user.role || 'user',
  });
  const refreshToken = jwtUtils.generateRefreshToken({ userId });
  const tokenHash = dbQueries.hashToken(accessToken);
  const refreshTokenHash = dbQueries.hashToken(refreshToken);
  const decoded = jwtUtils.decodeToken(accessToken);
  const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + DEFAULT_EXPIRY_MS);
  await dbQueries.createSession(db, {
    userId: user._id,
    tokenHash,
    refreshTokenHash,
    expiresAt,
  });
  const expiresIn = jwtUtils.getExpiresInSeconds(config.jwt.expiry);
  return {
    token: accessToken,
    refreshToken,
    expiresIn,
    user: {
      id: userId,
      email: user.email,
      username: user.username || user.email,
      role: user.role || 'user',
    },
  };
}

async function logout(accessToken) {
  const db = getDb();
  const tokenHash = dbQueries.hashToken(accessToken);
  await dbQueries.deleteSessionByTokenHash(db, tokenHash);
}

async function refresh(refreshToken) {
  const db = getDb();
  const refreshTokenHash = dbQueries.hashToken(refreshToken);
  const session = await dbQueries.findSessionByRefreshHash(db, refreshTokenHash);
  if (!session) return null;
  const decoded = jwtUtils.decodeToken(refreshToken);
  if (!decoded || decoded.type !== 'refresh') return null;
  const users = db.collection('users');
  const user = await users.findOne(
    { _id: session.userId, deletedAt: { $exists: false } },
    { projection: { _id: 1, email: 1, username: 1, role: 1 } }
  );
  if (!user) return null;
  const userId = user._id.toString();
  const newAccessToken = jwtUtils.generateAccessToken({
    userId,
    email: user.email,
    role: user.role || 'user',
  });
  const expiresIn = jwtUtils.getExpiresInSeconds(config.jwt.expiry);
  return { token: newAccessToken, expiresIn };
}

function validate(decoded) {
  return {
    valid: true,
    user: {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
    },
  };
}

module.exports = { login, logout, refresh, validate };
