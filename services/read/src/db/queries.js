const { ObjectId } = require('mongodb');

async function findPhotos(db, { filter = {}, sort = { uploadedAt: -1 }, skip = 0, limit = 20 } = {}) {
  const photos = db.collection('photos');
  const query = { status: 'active', ...filter };
  const [items, total] = await Promise.all([
    photos.find(query, { projection: { url: 0 } }).sort(sort).skip(skip).limit(limit).toArray(),
    photos.countDocuments(query),
  ]);
  return { items, total };
}

async function findPhotoById(db, id) {
  const photos = db.collection('photos');
  let oid;
  try { oid = new ObjectId(id); } catch { return null; }
  const photo = await photos.findOneAndUpdate(
    { _id: oid, status: 'active' },
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
    photos.countDocuments({ userId: oid, status: 'active' }),
  ]);

  const sub = submissionStats[0] || { totalSubmissions: 0, bestScore: null, averageScore: null };

  return {
    ...(stats || {}),
    totalPhotos: photoCount,
    totalSubmissions: sub.totalSubmissions,
    bestScore: sub.bestScore,
    averageScore: sub.averageScore !== null ? Math.round(sub.averageScore * 100) / 100 : null,
  };
}

async function searchPhotos(db, query, { skip = 0, limit = 20 } = {}) {
  const photos = db.collection('photos');
  const filter = {
    status: 'active',
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

async function getLeaderboard(db, { period = 'all', skip = 0, limit = 50 } = {}) {
  const scores = db.collection('submission_scores');

  const matchStage = {};
  if (period === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    matchStage.submittedAt = { $gte: weekAgo };
  } else if (period === 'month') {
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
        averageScore: Math.round(entry.averageScore * 100) / 100,
      };
    })
  );

  return { items: enriched, total };
}

async function getPlatformStats(db) {
  const [totalPhotos, totalUsers, totalSubmissions] = await Promise.all([
    db.collection('photos').countDocuments({ status: 'active' }),
    db.collection('users').countDocuments({ deletedAt: null }),
    db.collection('submission_scores').countDocuments({}),
  ]);
  return { totalPhotos, totalUsers, totalSubmissions };
}

module.exports = {
  findPhotos,
  findPhotoById,
  findUserProfile,
  findUserStats,
  searchPhotos,
  getLeaderboard,
  getPlatformStats,
};
