const express = require('express');
const { query, param, validationResult } = require('express-validator');
const readService = require('../services/readService');

const router = express.Router();

// ── GET /api/read/photos ────────────────────────────────────────────────────────
// Browse photos with optional filters and sorting. Public.
router.get(
  '/photos',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['photo', 'target']),
    query('sort').optional().isIn(['newest', 'oldest', 'views']),
    query('tag').optional().isString().trim(),
    query('userId').optional().isMongoId(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { page = 1, limit = 20, type, sort, tag, userId } = req.query;
    const result = await readService.getPhotos({ page, limit, type, sort, tag, userId });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/read/photo/:id ─────────────────────────────────────────────────────
// Single photo detail. Public.
router.get(
  '/photo/:id',
  [param('id').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await readService.getPhoto(req.params.id);
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result.photo });
  }
);

// ── GET /api/read/user/:userId ──────────────────────────────────────────────────
// Public user profile with stats.
router.get(
  '/user/:userId',
  [param('userId').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await readService.getUserProfile(req.params.userId);
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result });
  }
);

// ── GET /api/read/search ────────────────────────────────────────────────────────
// Full-text search on title, description and tags. Public.
router.get(
  '/search',
  [
    query('q').isString().trim().notEmpty().withMessage('Search query is required'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { q, page = 1, limit = 20 } = req.query;
    const result = await readService.search(q, { page, limit });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/read/leaderboard ───────────────────────────────────────────────────
// Top users ranked by best score. Public.
router.get(
  '/leaderboard',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('period').optional().isIn(['all', 'week', 'month']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { page = 1, limit = 50, period = 'all' } = req.query;
    const result = await readService.getLeaderboard({ page, limit, period });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/read/stats ─────────────────────────────────────────────────────────
// Platform-wide statistics. Public.
router.get('/stats', async (req, res) => {
  const stats = await readService.getStats();
  res.status(200).json({ success: true, data: stats });
});

module.exports = router;
