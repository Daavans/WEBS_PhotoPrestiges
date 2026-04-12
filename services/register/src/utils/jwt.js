const jwt = require('jsonwebtoken');
const config = require('../config');

const secret = config.jwt.secret;

function verifyToken(token) {
  return jwt.verify(token, secret);
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  verifyToken,
  decodeToken,
};
