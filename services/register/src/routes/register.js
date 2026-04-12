const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, query, validationResult } = require('express-validator');
const registerService = require('../services/registerService');
const { requireAuth } = require('../middleware/auth');

const REGISTER_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const REGISTER_RATE_LIMIT_MAX = 10;
const PASSWORD_MIN_LENGTH = 8;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const NAME_MAX_LENGTH = 255;
const BIO_MAX_LENGTH = 500;

const router = express.Router();
const registerLimiter = rateLimit({
  windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
  max: REGISTER_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many registration attempts' },
});

const registerValidators = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: PASSWORD_MIN_LENGTH })
    .withMessage('Password must be at least 8 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain at least one special character'),
  body('username')
    .optional({ values: 'falsy' })
    .isLength({ min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers and underscore'),
  body('firstName').optional({ values: 'falsy' }).trim().isLength({ max: NAME_MAX_LENGTH }),
  body('lastName').optional({ values: 'falsy' }).trim().isLength({ max: NAME_MAX_LENGTH }),
];

router.post('/', registerLimiter, registerValidators, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { email, password, username, firstName, lastName } = req.body;
    const result = await registerService.register({ email, password, username, firstName, lastName });
    if (result.conflict === 'email') {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    if (result.conflict === 'username') {
      return res.status(409).json({ success: false, message: 'Username already taken' });
    }
    res.status(201).json({
      success: true,
      message: result.message,
      userId: result.userId,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/verify', query('token').notEmpty().withMessage('token required'), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { token } = req.query;
  const result = await registerService.verifyEmail(token);
  if (!result) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }
  res.status(200).json({
    success: true,
    message: 'Email verified successfully. You can now login.',
  });
});

router.get('/profile', requireAuth, async (req, res) => {
  const profile = await registerService.getProfile(req.user.id);
  if (!profile) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.status(200).json({ success: true, profile });
});

const updateProfileValidators = [
  body('firstName').optional({ values: 'falsy' }).trim().isLength({ max: NAME_MAX_LENGTH }),
  body('lastName').optional({ values: 'falsy' }).trim().isLength({ max: NAME_MAX_LENGTH }),
  body('bio').optional({ values: 'falsy' }).trim().isLength({ max: BIO_MAX_LENGTH }),
  body('avatarUrl').optional({ values: 'falsy' }).trim().isURL().withMessage('avatarUrl must be a valid URL'),
];

router.put('/profile', requireAuth, updateProfileValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const profile = await registerService.updateProfile(req.user.id, req.body);
  if (!profile) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.status(200).json({ success: true, message: 'Profile updated successfully', profile });
});

router.delete('/profile', requireAuth, async (req, res) => {
  const deleted = await registerService.deleteAccount(req.user.id);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  res.status(200).json({ success: true, message: 'Account deleted successfully' });
});

module.exports = router;
