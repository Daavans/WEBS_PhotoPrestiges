const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const mailService = require('../services/mailService');

const router = express.Router();

// ── POST /api/mail/send ───────────────────────────────────────────────────────
// Internal endpoint — no auth, relies on Docker network isolation
const sendValidators = [
  body('to').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('template').isString().notEmpty().withMessage('Template name required'),
  body('data').optional().isObject(),
  body('priority').optional().isIn(['low', 'normal', 'high']),
  body('userId').optional().isString(),
];

router.post('/send', sendValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { to, template, data = {}, priority = 'normal', userId } = req.body;
  const queueId = await mailService.queueEmail({ to, userId, template, data, priority });
  res.status(202).json({
    success: true,
    data: { queueId, status: 'queued' },
    message: 'Email queued successfully',
  });
});

// ── GET /api/mail/preferences ─────────────────────────────────────────────────
router.get('/preferences', requireAuth, async (req, res) => {
  const prefs = await mailService.getPreferences(req.user.id);
  res.status(200).json({
    success: true,
    data: {
      userId: prefs.userId,
      votes: prefs.votes,
      badges: prefs.badges,
      comments: prefs.comments,
      weeklySummary: prefs.weeklySummary,
      newsletter: prefs.newsletter,
      unsubscribeToken: prefs.unsubscribeToken,
    },
  });
});

// ── PUT /api/mail/preferences ─────────────────────────────────────────────────
const prefValidators = [
  body('votes').optional().isBoolean(),
  body('badges').optional().isBoolean(),
  body('comments').optional().isBoolean(),
  body('weeklySummary').optional().isBoolean(),
  body('newsletter').optional().isBoolean(),
];

router.put('/preferences', requireAuth, prefValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const updated = await mailService.updatePreferences(req.user.id, req.body);
  res.status(200).json({
    success: true,
    data: {
      userId: updated.userId,
      votes: updated.votes,
      badges: updated.badges,
      comments: updated.comments,
      weeklySummary: updated.weeklySummary,
      newsletter: updated.newsletter,
    },
    message: 'Preferences updated',
  });
});

// ── POST /api/mail/subscribe ──────────────────────────────────────────────────
const subscribeValidators = [
  body('types').isArray({ min: 1 }).withMessage('types must be a non-empty array'),
  body('types.*').isIn(['votes', 'badges', 'comments', 'weeklySummary', 'newsletter']),
];

router.post('/subscribe', requireAuth, subscribeValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const updates = {};
  for (const t of req.body.types) {
    updates[t] = true;
  }
  const updated = await mailService.updatePreferences(req.user.id, updates);
  res.status(200).json({
    success: true,
    data: {
      userId: updated.userId,
      votes: updated.votes,
      badges: updated.badges,
      comments: updated.comments,
      weeklySummary: updated.weeklySummary,
      newsletter: updated.newsletter,
    },
    message: 'Subscription preferences updated',
  });
});

// ── DELETE /api/mail/unsubscribe ──────────────────────────────────────────────
router.delete('/unsubscribe', [
  query('token').isString().notEmpty().withMessage('Unsubscribe token required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  const { token, types } = req.query;
  const result = await mailService.unsubscribeByToken(token, types);
  if (!result) {
    return res.status(404).json({ success: false, message: 'Invalid unsubscribe token' });
  }
  res.status(200).json({ success: true, message: 'Successfully unsubscribed from notifications' });
});

module.exports = router;
