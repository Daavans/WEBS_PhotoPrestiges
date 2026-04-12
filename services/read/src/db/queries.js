const { ObjectId } = require('mongodb');

const DEFAULT_LIMIT = 20;
const DEFAULT_LEADERBOARD_LIMIT = 50;
const DEFAULT_RADIUS_KM = 10;
const METERS_PER_KM = 1000;
const SCORE_ROUNDING_FACTOR = 100;
const PERIOD_WEEK = 'week';
const PERIOD_MONTH = 'month';
const DAYS_IN_WEEK = 7;
const STATUS_ACTIVE = 'active';

async function findPhotos(db, { filter = {}, sort = { uploadedAt: -1 }, skip = 0, limit = DEFAULT_LIMIT } = {}) {
  const photos = db.collection('photos');
  const query = { status: STATUS_ACTIVE, ...filter };
  const [items, total] = await Promise.all([
    photos.find(query, { projection: { url: 0 } }).sort(sort).skip(skip).limit(limit).toArray(),
    photos.countDocuments(query),
  ]);
  return { items, total };
}

async function findPhotosByLocation(db, { description, lat, lng, radiusKm = DEFAULT_RADIUS_KM, skip = 0, limit = DEFAULT_LIMIT } = {}) {
  const photos = db.collection('photos');
  const query = { status: STATUS_ACTIVE };

  if (lat != null && lng != null) {
    // Geo-near query (requires 2dsphere index)
    const results = await photos.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: 'distance',
          maxDistance: radiusKm * METERS_PER_KM,
          spherical: true,
          query,
          key: 'location.coords',
        },
      },
      { $skip: skip },
      { $limit: limit },
      { $project: { url: 0 } },
    ]).toArray();
    return { items: results, total: results.length };
  }

  if (description) {
    query['location.description'] = { $regex: description, $options: 'i' };
  } else {
    query['location'] = { $ne: null };
  }

  const [items, total] = await Promise.all([
    photos.find(query, { projection: { url: 0 } }).sort({ uploadedAt: -1 }).skip(skip).limit(limit).toArray(),
    photos.countDocuments(query),
  ]);
  return { items, total };
}

async function findPhotoById(db, id) {
  const photos = db.collection('photos');
  let oid;
  try { oid = new ObjectId(id); } catch { return null; }
  const photo = await photos.findOneAndUpdate(
    { _id: oid, status: STATUS_ACTIVE },
    { $inc: { views: 1 } },
    { returnDocument: 'after' }
  );
  return photo;
}

async function findUserProfile(db, userId) {
  const users = db.collection('users');
  let oid;
  try { oid = new ObjectId(userId); } catch { return null; }
  return users.findOne(
    { _id: oid, deletedAt: null },
    { projection: { password_hash: 0 } }
  );
}

async function findUserStats(db, userId) {
  let oid;
  try { oid = new ObjectId(userId); } catch { return null; }

  const userStats = db.collection('user_stats');
  const scores = db.collection('submission_scores');
  const photos = db.collection('photos');

  const [stats, submissionStats, photoCount] = await Promise.all([
    userStats.findOne({ userId: oid }),
    scores.aggregate([
      { $match: { userId: oid } },
      { $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        bestScore: { $max: '$score' },
        averageScore: { $avg: '$score' },
      }},
    ]).toArray(),
    photos.countDocuments({ userId: oid, status: STATUS_ACTIVE }),
  ]);

  const sub = submissionStats[0] || { totalSubmissions: 0, bestScore: null, averageScore: null };

  return {
    ...(stats || {}),
    totalPhotos: photoCount,
    totalSubmissions: sub.totalSubmissions,
    bestScore: sub.bestScore,
    averageScore: sub.averageScore !== null ? Math.round(sub.averageScore * SCORE_ROUNDING_FACTOR) / SCORE_ROUNDING_FACTOR : null,
  };
}

async function searchPhotos(db, query, { skip = 0, limit = DEFAULT_LIMIT } = {}) {
  const photos = db.collection('photos');
  const filter = {
    status: STATUS_ACTIVE,
    $text: { $search: query },
  };
  const [items, total] = await Promise.all([
    photos.find(filter, { projection: { url: 0, score: { $meta: 'textScore' } } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .toArray(),
    photos.countDocuments(filter),
  ]);
  return { items, total };
}

async function getLeaderboard(db, { period = 'all', skip = 0, limit = DEFAULT_LEADERBOARD_LIMIT } = {}) {
  const scores = db.collection('submission_scores');

  const matchStage = {};
  if (period === PERIOD_WEEK) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - DAYS_IN_WEEK);
    matchStage.submittedAt = { $gte: weekAgo };
  } else if (period === PERIOD_MONTH) {
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    matchStage.submittedAt = { $gte: monthAgo };
  }

  const pipeline = [
    ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: '$userId',
        bestScore: { $max: '$score' },
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$score' },
      },
    },
    { $sort: { bestScore: -1, totalSubmissions: -1 } },
  ];

  const all = await scores.aggregate(pipeline).toArray();
  const total = all.length;
  const page = all.slice(skip, skip + limit);

  // Enrich with user info
  const users = db.collection('users');
  const enriched = await Promise.all(
    page.map(async (entry, index) => {
      const user = await users.findOne(
        { _id: entry._id, deletedAt: null },
        { projection: { username: 1, avatarUrl: 1 } }
      );
      return {
        rank: skip + index + 1,
        userId: entry._id,
        username: user?.username || null,
        avatarUrl: user?.avatarUrl || null,
        bestScore: entry.bestScore,
        totalSubmissions: entry.totalSubmissions,
        averageScore: Math.round(entry.averageScore * SCORE_ROUNDING_FACTOR) / SCORE_ROUNDING_FACTOR,
      };
    })
  );

  return { items: enriched, total };
}

async function getPlatformStats(db) {
  const [totalPhotos, totalUsers, totalSubmissions] = await Promise.all([
    db.collection('photos').countDocuments({ status: STATUS_ACTIVE }),
    db.collection('users').countDocuments({ deletedAt: null }),
    db.collection('submission_scores').countDocuments({}),
  ]);
  return { totalPhotos, totalUsers, totalSubmissions };
}

module.exports = {
  findPhotos,
  findPhotosByLocation,
  findPhotoById,
  findUserProfile,
  findUserStats,
  searchPhotos,
  getLeaderboard,
  getPlatformStats,
};
