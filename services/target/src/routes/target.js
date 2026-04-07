const express = require('express');
const { param, body, query, validationResult } = require('express-validator');
const { requireAuth, requireRole } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const targetService = require('../services/targetService');

const router = express.Router();

// ── POST /api/target/upload ────────────────────────────────────────────────────────
router.post(
  '/upload',
  requireAuth,
  upload.single('photo'),
  handleMulterError,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided' });
    }

    const { title, description, tags, type, endsAt, location } = req.body;

    if (type === 'target' && endsAt) {
      const d = new Date(endsAt);
      if (isNaN(d.getTime()) || d <= new Date()) {
        return res.status(400).json({ success: false, message: 'endsAt must be a valid future date' });
      }
    }

    const result = await targetService.uploadPhoto({
      file: req.file,
      title,
      description,
      tags,
      type: type === 'target' ? 'target' : 'photo',
      userId: req.user.id,
      endsAt: endsAt || null,
      location: location || null,
    });

    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    res.status(201).json({ success: true, photo: result.photo });
  }
);

// ── POST /api/target/:id/submit ──────────────────────────────────────────────
// Submit a recreation of a target photo. Authenticated, one per user per target.
router.post(
  '/:id/submit',
  requireAuth,
  [param('id').isMongoId().withMessage('Invalid target photo id')],
  upload.single('photo'),
  handleMulterError,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided' });
    }

    const { title, description, tags } = req.body;
    const result = await targetService.submitPhoto({
      file: req.file,
      title,
      description,
      tags,
      userId: req.user.id,
      targetPhotoId: req.params.id,
    });

    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    res.status(201).json({ success: true, submission: result.submission });
  }
);

// ── GET /api/target/:id/submissions ─────────────────────────────────────────
// Get all submissions for a target photo, ranked by score descending.
router.get(
  '/:id/submissions',
  [
    param('id').isMongoId().withMessage('Invalid target photo id'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const result = await targetService.getSubmissions(req.params.id, { page, limit });

    if (result.error) {
      return res.status(result.status || 400).json({ success: false, message: result.error });
    }

    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/target/user/:userId ─────────────────────────────────────────────
router.get(
  '/user/:userId',
  [
    param('userId').isMongoId().withMessage('Invalid userId'),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;

    const result = await targetService.getUserPhotos(req.params.userId, { page, limit });
    res.status(200).json({ success: true, ...result });
  }
);

// ── GET /api/target/:id ──────────────────────────────────────────────────────
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid photo id')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const photo = await targetService.getPhoto(req.params.id);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    res.status(200).json({ success: true, photo });
  }
);

// ── PUT /api/target/:id ──────────────────────────────────────────────────────
router.put(
  '/:id',
  requireAuth,
  [
    param('id').isMongoId().withMessage('Invalid photo id'),
    body('title').optional().isString().trim().isLength({ max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 2000 }),
    body('tags').optional().isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await targetService.updatePhoto(req.params.id, req.body, req.user);

    if (result.notFound) return res.status(404).json({ success: false, message: 'Photo not found' });
    if (result.forbidden) return res.status(403).json({ success: false, message: 'Forbidden' });

    res.status(200).json({ success: true, photo: result.photo });
  }
);

// ── DELETE /api/target/:id ───────────────────────────────────────────────────
router.delete(
  '/:id',
  requireAuth,
  [param('id').isMongoId().withMessage('Invalid photo id')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const result = await targetService.deletePhoto(req.params.id, req.user);

    if (result.notFound) return res.status(404).json({ success: false, message: 'Photo not found' });
    if (result.forbidden) return res.status(403).json({ success: false, message: 'Forbidden' });

    res.status(200).json({ success: true, message: 'Photo deleted successfully' });
  }
);

// ── POST /api/target/:id/register ────────────────────────────────────────────
// Register interest in a target contest. Authenticated.
router.post(
  '/:id/register',
  requireAuth,
  [param('id').isMongoId().withMessage('Invalid target photo id')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const result = await targetService.registerForTarget(req.params.id, req.user.id);
    if (result.error) return res.status(result.status || 400).json({ success: false, message: result.error });
    res.status(201).json({ success: true, message: 'Registered for target' });
  }
);

module.exports = router;
