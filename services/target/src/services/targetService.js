const { ObjectId } = require('mongodb');
const axios = require('axios');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const config = require('../config');
const { validateDimensions, generateThumbnail } = require('../utils/thumbnail');
const { storePhoto, storeThumbnail } = require('../utils/storage');
const { analyseImage, isFlagged, compareImages } = require('../utils/analysis');

function getFormat(mimetype) {
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  return map[mimetype] || 'jpg';
}

/**
 * Upload a photo:
 * 1. Validate dimensions
 * 2. Generate thumbnail
 * 3. Store both files
 * 4. Save metadata to DB
 * 5. Kick off analysis in background
 */
async function uploadPhoto({ file, title, description, tags, userId, type = 'photo', endsAt, location }) {
  const format = getFormat(file.mimetype);
  const buffer = file.buffer;

  // 1. Validate dimensions
  const dimResult = await validateDimensions(buffer);
  if (!dimResult.valid) {
    return { error: dimResult.message };
  }

  // 2. Generate thumbnail from buffer
  const thumbBuffer = await generateThumbnail(buffer, format);

  // 3. Convert to base64 data URLs
  const { url } = storePhoto(buffer, format);
  const { thumbnailUrl } = storeThumbnail(thumbBuffer, format);

  // 4. Parse user-supplied tags
  let parsedTags = [];
  if (Array.isArray(tags)) {
    parsedTags = tags.map((t) => ({ tag: t.trim().toLowerCase(), source: 'user', confidence: 1 }));
  } else if (typeof tags === 'string') {
    try {
      const arr = JSON.parse(tags);
      parsedTags = arr.map((t) => ({ tag: t.trim().toLowerCase(), source: 'user', confidence: 1 }));
    } catch {
      // ignore malformed tags
    }
  }

  // 5. Parse deadline and location
  let parsedEndsAt = null;
  if (endsAt) {
    const d = new Date(endsAt);
    if (!isNaN(d.getTime()) && d > new Date()) parsedEndsAt = d;
  }

  let parsedLocation = null;
  if (location) {
    if (typeof location === 'string') {
      try { parsedLocation = JSON.parse(location); } catch { parsedLocation = { description: location }; }
    } else {
      parsedLocation = location;
    }
    // Build GeoJSON point if lat/lng present
    if (parsedLocation.lat != null && parsedLocation.lng != null) {
      parsedLocation.coords = {
        type: 'Point',
        coordinates: [parseFloat(parsedLocation.lng), parseFloat(parsedLocation.lat)],
      };
    }
  }

  // 6. Save to MongoDB
  const db = getDb();
  const doc = {
    userId: new ObjectId(userId),
    title: (title || '').trim() || null,
    description: (description || '').trim() || null,
    url,
    thumbnailUrl,
    storageKey: null,
    thumbnailStorageKey: null,
    fileSize: file.size,
    width: dimResult.width,
    height: dimResult.height,
    format,
    status: 'active',
    tags: parsedTags,
    analysis: null,
    type,
    endsAt: parsedEndsAt,
    location: parsedLocation,
    winnerDetermined: false,
  };

  const photoId = await queries.createPhoto(db, doc);

  // 6. Run image analysis in background (non-blocking)
  setImmediate(async () => {
    try {
      const analysis = await analyseImage(url);

      const status = isFlagged(analysis) ? 'flagged' : 'active';

      const analysisTagDocs = analysis.imaggaTags.map((t) => ({
        tag: t.tag,
        source: 'imagga',
        confidence: t.confidence,
      }));

      await queries.updateAnalysis(db, photoId.toString(), analysis);
      if (status === 'flagged') {
        await queries.updatePhoto(db, photoId.toString(), { status, tags: [...parsedTags, ...analysisTagDocs] });
      } else {
        await queries.updatePhoto(db, photoId.toString(), { tags: [...parsedTags, ...analysisTagDocs] });
      }
    } catch (err) {
      console.error('Background analysis failed for photo', photoId, err.message);
    }
  });

  return {
    photo: {
      id: photoId.toString(),
      url,
      thumbnailUrl,
      title: doc.title,
      description: doc.description,
      userId,
      tags: parsedTags,
      format,
      fileSize: file.size,
      width: dimResult.width,
      height: dimResult.height,
      status: 'active',
      endsAt: doc.endsAt,
      location: doc.location,
      uploadedAt: new Date(),
    },
  };
}


async function getPhoto(photoId) {
  const db = getDb();
  const photo = await queries.findPhotoById(db, photoId);
  if (!photo) return null;
  await queries.incrementViews(db, photoId);
  return formatPhoto(photo);
}


async function getUserPhotos(userId, { page, limit }) {
  const db = getDb();
  const { items, total } = await queries.findPhotosByUserId(db, userId, { page, limit });
  return {
    photos: items.map(formatPhoto),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}


async function updatePhoto(photoId, { title, description, tags }, requestingUser) {
  const db = getDb();
  const photo = await queries.findPhotoById(db, photoId);
  if (!photo) return { notFound: true };

  if (photo.userId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
    return { forbidden: true };
  }

  const updates = {};
  if (title !== undefined) updates.title = title.trim() || null;
  if (description !== undefined) updates.description = description.trim() || null;
  if (tags !== undefined) {
    updates.tags = tags.map((t) => ({ tag: t.trim().toLowerCase(), source: 'user', confidence: 1 }));
  }

  const updated = await queries.updatePhoto(db, photoId, updates);
  return { photo: formatPhoto(updated) };
}


async function deletePhoto(photoId, requestingUser) {
  const db = getDb();
  const photo = await queries.findPhotoById(db, photoId);
  if (!photo) return { notFound: true };

  if (photo.userId.toString() !== requestingUser.id && requestingUser.role !== 'admin') {
    return { forbidden: true };
  }

  await queries.softDeletePhoto(db, photoId);
  return { success: true };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhoto(photo) {
  return {
    id: photo._id.toString(),
    url: photo.url,
    thumbnailUrl: photo.thumbnailUrl,
    title: photo.title,
    description: photo.description,
    userId: photo.userId.toString(),
    type: photo.type || 'photo',
    tags: photo.tags || [],
    analysis: photo.analysis || null,
    format: photo.format,
    fileSize: photo.fileSize,
    width: photo.width,
    height: photo.height,
    status: photo.status,
    views: photo.views,
    endsAt: photo.endsAt || null,
    location: photo.location || null,
    winnerDetermined: photo.winnerDetermined || false,
    uploadedAt: photo.uploadedAt,
    updatedAt: photo.updatedAt,
  };
}


async function submitPhoto({ file, title, description, tags, userId, targetPhotoId }) {
  const db = getDb();

  // 1. Verify the target photo exists and is a target type
  const targetPhoto = await queries.findPhotoById(db, targetPhotoId);
  if (!targetPhoto) return { error: 'Target photo not found', status: 404 };
  if (targetPhoto.status === 'flagged') return { error: 'Target photo is not available', status: 403 };

  // 2. Check deadline
  if (targetPhoto.endsAt && new Date() > new Date(targetPhoto.endsAt)) {
    return { error: 'Submission deadline has passed', status: 403 };
  }

  // 3. One submission per user per target
  const existing = await queries.findSubmissionByUserAndTarget(db, userId, targetPhotoId);
  if (existing) return { error: 'You have already submitted for this target', status: 409 };

  const format = getFormat(file.mimetype);
  const buffer = file.buffer;

  // 3. Validate dimensions
  const dimResult = await validateDimensions(buffer);
  if (!dimResult.valid) return { error: dimResult.message, status: 400 };

  // 4. Generate thumbnail and store
  const thumbBuffer = await generateThumbnail(buffer, format);
  const { url } = storePhoto(buffer, format);
  const { thumbnailUrl } = storeThumbnail(thumbBuffer, format);

  // 5. Compare with target photo via Imagga
  let score = null;
  try {
    score = await compareImages(targetPhoto.url, url);
  } catch (err) {
    console.warn('Image comparison failed, storing submission without score:', err.message);
  }

  // 6. Parse user tags
  let parsedTags = [];
  if (Array.isArray(tags)) {
    parsedTags = tags.map((t) => ({ tag: t.trim().toLowerCase(), source: 'user', confidence: 1 }));
  } else if (typeof tags === 'string') {
    try {
      const arr = JSON.parse(tags);
      parsedTags = arr.map((t) => ({ tag: t.trim().toLowerCase(), source: 'user', confidence: 1 }));
    } catch {  }
  }

  // 7. Store submission in DB
  const doc = {
    userId: new ObjectId(userId),
    targetPhotoId: new ObjectId(targetPhotoId),
    title: (title || '').trim() || null,
    description: (description || '').trim() || null,
    url,
    thumbnailUrl,
    fileSize: file.size,
    width: dimResult.width,
    height: dimResult.height,
    format,
    tags: parsedTags,
    score,          
    analysis: null,
  };

  const submissionId = await queries.createSubmission(db, doc);

  // 8. Notify score service (fire-and-forget)
  if (score !== null && config.scoreServiceUrl) {
    setImmediate(async () => {
      try {
        await axios.post(`${config.scoreServiceUrl}/api/score/submission`, {
          submissionId: submissionId.toString(),
          targetPhotoId,
          userId,
          score,
        });
      } catch (err) {
        console.warn('Score service notification failed:', err.message);
      }
    });
  }

  // 9. Run content moderation in background
  setImmediate(async () => {
    try {
      const analysis = await analyseImage(url);
      const status = isFlagged(analysis) ? 'flagged' : 'active';
      await queries.updateSubmission(db, submissionId.toString(), { analysis, status });
    } catch (err) {
      console.error('Background analysis failed for submission', submissionId, err.message);
    }
  });

  return {
    submission: {
      id: submissionId.toString(),
      targetPhotoId,
      url,
      thumbnailUrl,
      title: doc.title,
      description: doc.description,
      userId,
      score,
      tags: parsedTags,
      format,
      fileSize: file.size,
      width: dimResult.width,
      height: dimResult.height,
      submittedAt: new Date(),
    },
  };
}

async function getSubmissions(targetPhotoId, { page, limit }) {
  const db = getDb();
  const target = await queries.findPhotoById(db, targetPhotoId);
  if (!target) return { error: 'Target photo not found', status: 404 };

  const { items, total } = await queries.findSubmissionsByTargetId(db, targetPhotoId, { page, limit });
  return {
    submissions: items.map((s) => ({
      id: s._id.toString(),
      targetPhotoId: s.targetPhotoId.toString(),
      userId: s.userId.toString(),
      url: s.url,
      thumbnailUrl: s.thumbnailUrl,
      title: s.title,
      score: s.score,
      tags: s.tags || [],
      submittedAt: s.submittedAt,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

async function registerForTarget(targetPhotoId, userId) {
  const db = getDb();
  const target = await queries.findPhotoById(db, targetPhotoId);
  if (!target) return { error: 'Target not found', status: 404 };
  if (target.type !== 'target') return { error: 'Photo is not a target', status: 400 };
  if (target.status === 'flagged') return { error: 'Target is not available', status: 403 };
  if (target.endsAt && new Date() > new Date(target.endsAt)) {
    return { error: 'Registration deadline has passed', status: 403 };
  }
  const result = await queries.registerForTarget(db, { userId, targetPhotoId });
  if (result.alreadyRegistered) return { error: 'Already registered', status: 409 };
  return { success: true };
}

module.exports = { uploadPhoto, getPhoto, getUserPhotos, updatePhoto, deletePhoto, submitPhoto, getSubmissions, registerForTarget };
