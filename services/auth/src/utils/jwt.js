const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const { secret, expiry, refreshExpiry } = config.jwt;

function generateAccessToken(payload) {
  return jwt.sign(
    { ...payload, type: 'access', jti: uuidv4() },
    secret,
    { expiresIn: expiry }
  );
}

function generateRefreshToken(payload) {
  return jwt.sign(
    { userId: payload.userId, type: 'refresh', jti: uuidv4() },
    secret,
    { expiresIn: refreshExpiry }
  );
}

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function decodeToken(token) {
  return jwt.decode(token);
}

function getExpiresInSeconds(expiryString) {
  const match = expiryString.match(/^(\d+)([smhd])$/);
  if (!match)
    return 86400;

  const [, num, unit] = match;
  const n = parseInt(num, 10);
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
  return n * (multipliers[unit] || 86400);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  getExpiresInSeconds,
};
