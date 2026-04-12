const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const clockService = require('../services/clockService');

const router = express.Router();

// All clock routes require admin role
router.use(requireAuth, requireRole('admin'));

// ── GET /api/clock/status ───────────────────────────────────────────────────────
// Scheduler health and summary.
router.get('/status', (req, res) => {
  const status = clockService.getStatus();
  res.status(200).json({ success: true, data: status });
});

// ── GET /api/clock/jobs ─────────────────────────────────────────────────────────
// List all registered jobs with last run info.
router.get('/jobs', async (req, res) => {
  const jobs = await clockService.listJobs();
  res.status(200).json({ success: true, data: jobs });
});

// ── POST /api/clock/trigger/:jobId ─────────────────────────────────────────────
// Manually trigger a job by ID.
router.post(
  '/trigger/:jobId',
  [param('jobId').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await clockService.trigger(req.params.jobId);
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result });
  }
);

// ── PUT /api/clock/job/:jobId/toggle ───────────────────────────────────────────
// Enable or disable a job.
router.put(
  '/job/:jobId/toggle',
  [
    param('jobId').isString().notEmpty(),
    body('enabled').isBoolean(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = clockService.toggle(req.params.jobId, req.body.enabled);
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    res.status(200).json({ success: true, data: result });
  }
);

// ── GET /api/clock/history/:jobId ──────────────────────────────────────────────
// Last N execution records for a job.
router.get(
  '/history/:jobId',
  [
    param('jobId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const limit = req.query.limit || 20;
    const result = await clockService.getHistory(req.params.jobId, limit);
    if (result.error) return res.status(404).json({ success: false, message: result.error });
    res.status(200).json({ success: true, ...result });
  }
);

module.exports = router;
