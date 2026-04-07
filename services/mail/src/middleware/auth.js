const jwtUtils = require('../utils/jwt');
const config = require('../config');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwtUtils.verifyToken(token);
    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
    };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
}

function requireServiceAuth(req, res, next) {
  if (!config.serviceSecret) {
    // No secret configured — only safe if port is not exposed; warn and allow
    console.warn('[mail] SERVICE_SECRET not set; /api/mail/send is unauthenticated');
    return next();
  }
  const header = req.headers['x-service-secret'];
  if (!header || header !== config.serviceSecret) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireServiceAuth };
