const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const scoreService = require('../services/scoreService');

const router = express.Router();

// ── POST /api/score/submission ─────────────────────────────────────────────────
// Internal endpoint: called by target service after a submission is scored.
router.post(
  '/submission',
  [
    body('submissionId').isString().notEmpty(),
    body('targetPhotoId').isMongoId(),
    body('userId').isMongoId(),
    body('score').isFloat({ min: 0, max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { submissionId, targetPhotoId, userId, score, submittedAt } = req.body;
    const result = await scoreService.recordSubmission({ submissionId, targetPhotoId, userId, score, submittedAt });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(201).json({ success: true });
  }
);

// ── GET /api/score/leaderboard ─────────────────────────────────────────────────
// Overall or per-target leaderboard. Public endpoint.
router.get(
  '/leaderboard',
  [
    query('targetPhotoId').optional().isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;
    const targetPhotoId = req.query.targetPhotoId || null;

    const result = await scoreService.getLeaderboard({ limit, offset, targetPhotoId });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/score/photo/:targetPhotoId ───────────────────────────────────────
// All submissions for a specific target photo, ranked by score.
router.get(
  '/photo/:targetPhotoId',
  [
    param('targetPhotoId').isMongoId(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;
    const result = await scoreService.getPhotoScores(req.params.targetPhotoId, { limit, offset });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/score/user/:userId ────────────────────────────────────────────────
// Stats for a specific user: best score, average, rank, total submissions.
router.get(
  '/user/:userId',
  [param('userId').isMongoId()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await scoreService.getUserStats(req.params.userId);
    res.status(200).json({ success: true, data: result });
  }
);

module.exports = router;
