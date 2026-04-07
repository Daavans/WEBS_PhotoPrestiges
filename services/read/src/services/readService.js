const { getDb } = require('../db/connect');
const queries = require('../db/queries');

async function getPhotos({ page = 1, limit = 20, type, sort = 'newest', tag, userId } = {}) {
  const db = getDb();
  const skip = (page - 1) * limit;

  const filter = {};
  if (type) filter.type = type;
  if (tag) filter['tags.tag'] = tag;
  if (userId) {
    const { ObjectId } = require('mongodb');
    try { filter.userId = new ObjectId(userId); } catch { return { items: [], total: 0 }; }
  }

  const sortMap = {
    newest: { uploadedAt: -1 },
    oldest: { uploadedAt: 1 },
    views: { views: -1 },
  };
  const sortOrder = sortMap[sort] || sortMap.newest;

  return queries.findPhotos(db, { filter, sort: sortOrder, skip, limit });
}

async function getPhoto(id) {
  const db = getDb();
  const photo = await queries.findPhotoById(db, id);
  if (!photo) return { error: 'Photo not found' };
  return { photo };
}

async function getUserProfile(userId) {
  const db = getDb();
  const [profile, stats] = await Promise.all([
    queries.findUserProfile(db, userId),
    queries.findUserStats(db, userId),
  ]);
  if (!profile) return { error: 'User not found' };
  return { profile, stats };
}

async function search(q, { page = 1, limit = 20 } = {}) {
  if (!q || q.trim().length === 0) return { items: [], total: 0 };
  const db = getDb();
  const skip = (page - 1) * limit;
  return queries.searchPhotos(db, q.trim(), { skip, limit });
}

async function getLeaderboard({ page = 1, limit = 50, period = 'all' } = {}) {
  const db = getDb();
  const skip = (page - 1) * limit;
  return queries.getLeaderboard(db, { period, skip, limit });
}

async function getStats() {
  const db = getDb();
  return queries.getPlatformStats(db);
}

async function getPhotosByLocation({ description, lat, lng, radiusKm, page = 1, limit = 20 } = {}) {
  const db = getDb();
  const skip = (page - 1) * limit;
  return queries.findPhotosByLocation(db, { description, lat, lng, radiusKm, skip, limit });
}

module.exports = { getPhotos, getPhoto, getUserProfile, search, getLeaderboard, getStats, getPhotosByLocation };
