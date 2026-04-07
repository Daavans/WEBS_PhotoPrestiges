const { ObjectId } = require('mongodb');

async function findPhotoOwnerEmail(db, targetPhotoId) {
  const photos = db.collection('photos');
  const photo = await photos.findOne(
    { _id: new ObjectId(targetPhotoId) },
    { projection: { userId: 1, title: 1 } }
  );
  if (!photo) return null;
  const users = db.collection('users');
  const user = await users.findOne(
    { _id: photo.userId },
    { projection: { email: 1, username: 1 } }
  );
  if (!user) return null;
  return { email: user.email, username: user.username, photoTitle: photo.title || 'je foto', userId: user._id };
}

async function upsertSubmissionScore(db, { submissionId, targetPhotoId, userId, score, submittedAt }) {
  const scores = db.collection('submission_scores');
  await scores.updateOne(
    { submissionId },
    {
      $set: {
        submissionId,
        targetPhotoId: new ObjectId(targetPhotoId),
        userId: new ObjectId(userId),
        score,
        submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

async function findScoresByTargetPhoto(db, targetPhotoId, { limit = 20, offset = 0 } = {}) {
  const scores = db.collection('submission_scores');
  const filter = { targetPhotoId: new ObjectId(targetPhotoId) };
  const [items, total] = await Promise.all([
    scores.find(filter).sort({ score: -1 }).skip(offset).limit(limit).toArray(),
    scores.countDocuments(filter),
  ]);
  return { items, total };
}

async function findLeaderboard(db, { limit = 50, offset = 0, targetPhotoId } = {}) {
  const scores = db.collection('submission_scores');
  const filter = targetPhotoId ? { targetPhotoId: new ObjectId(targetPhotoId) } : {};
  const [items, total] = await Promise.all([
    scores.find(filter).sort({ score: -1 }).skip(offset).limit(limit).toArray(),
    scores.countDocuments(filter),
  ]);
  return { items, total };
}

async function findUserStats(db, userId) {
  const scores = db.collection('submission_scores');
  const filter = { userId: new ObjectId(userId) };

  const [userScores, totalSubmissions] = await Promise.all([
    scores.find(filter).sort({ score: -1 }).toArray(),
    scores.countDocuments(filter),
  ]);

  if (totalSubmissions === 0) {
    return { totalSubmissions: 0, bestScore: null, averageScore: null };
  }

  const bestScore = userScores[0].score;
  const averageScore = userScores.reduce((sum, s) => sum + s.score, 0) / totalSubmissions;

  return { totalSubmissions, bestScore, averageScore: Math.round(averageScore * 100) / 100 };
}

async function findUserRank(db, userId) {
  const scores = db.collection('submission_scores');

  // Get best score for this user
  const best = await scores.findOne({ userId: new ObjectId(userId) }, { sort: { score: -1 } });
  if (!best) return null;

  // Count how many distinct users have a higher best score
  const higherCount = await scores.aggregate([
    { $sort: { score: -1 } },
    { $group: { _id: '$userId', bestScore: { $first: '$score' } } },
    { $match: { bestScore: { $gt: best.score } } },
    { $count: 'count' },
  ]).toArray();

  return (higherCount[0]?.count ?? 0) + 1;
}

module.exports = {
  upsertSubmissionScore,
  findScoresByTargetPhoto,
  findLeaderboard,
  findUserStats,
  findUserRank,
  findPhotoOwnerEmail,
};
