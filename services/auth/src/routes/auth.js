const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { requireAuth } = require('../middleware/auth');
const jwtUtils = require('../utils/jwt');

const router = express.Router();

const loginValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/login', loginValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  if (!result) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  res.status(200).json({
    success: true,
    data: {
      token: result.token,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      user: result.user,
    },
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await authService.logout(req.token);
  } catch (err) {
    // still respond success; token may already be expired
  }
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const refreshValidators = [
  body('refreshToken').notEmpty().isString().withMessage('refreshToken required'),
];

router.post('/refresh', refreshValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  if (!result) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
  res.status(200).json({
    success: true,
    data: { token: result.token, expiresIn: result.expiresIn },
  });
});

router.get('/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: 'Missing or invalid authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwtUtils.verifyToken(token);
    if (decoded.type !== 'access') {
      return res.status(401).json({ valid: false });
    }
    const payload = authService.validate(decoded);
    res.status(200).json(payload);
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
