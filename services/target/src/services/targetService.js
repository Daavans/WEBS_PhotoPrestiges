const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const { validateDimensions, generateThumbnail } = require('../utils/thumbnail');
const { storePhoto, storeThumbnail } = require('../utils/storage');
const { analyseImage, isFlagged } = require('../utils/analysis');

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
async function uploadPhoto({ file, title, description, tags, userId }) {
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

  // 5. Save to MongoDB
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
    tags: photo.tags || [],
    analysis: photo.analysis || null,
    format: photo.format,
    fileSize: photo.fileSize,
    width: photo.width,
    height: photo.height,
    status: photo.status,
    views: photo.views,
    uploadedAt: photo.uploadedAt,
    updatedAt: photo.updatedAt,
  };
}

module.exports = { uploadPhoto, getPhoto, getUserPhotos, updatePhoto, deletePhoto };
