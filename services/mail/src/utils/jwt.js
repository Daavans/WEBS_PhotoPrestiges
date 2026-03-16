const jwt = require('jsonwebtoken');
const config = require('../config');

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = { verifyToken, decodeToken };
