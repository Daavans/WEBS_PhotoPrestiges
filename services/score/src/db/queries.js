const { ObjectId } = require('mongodb');

const DEFAULT_LEADERBOARD_LIMIT = 50;
const DEFAULT_SCORES_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const WINNER_SCORE_WEIGHT = 0.7;
const TIME_BONUS_WEIGHT = 0.3;
const TIME_BONUS_MAX = 100;
const ROUNDING_FACTOR = 100;
const DEFAULT_PHOTO_TITLE = 'your photo';

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
  return { email: user.email, username: user.username, photoTitle: photo.title || DEFAULT_PHOTO_TITLE, userId: user._id };
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

async function findScoresByTargetPhoto(db, targetPhotoId, { limit = DEFAULT_SCORES_LIMIT, offset = DEFAULT_OFFSET } = {}) {
  const scores = db.collection('submission_scores');
  const filter = { targetPhotoId: new ObjectId(targetPhotoId) };
  const [items, total] = await Promise.all([
    scores.find(filter).sort({ score: -1 }).skip(offset).limit(limit).toArray(),
    scores.countDocuments(filter),
  ]);
  return { items, total };
}

async function findLeaderboard(db, { limit = DEFAULT_LEADERBOARD_LIMIT, offset = DEFAULT_OFFSET, targetPhotoId } = {}) {
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

  return { totalSubmissions, bestScore, averageScore: Math.round(averageScore * ROUNDING_FACTOR) / ROUNDING_FACTOR };
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

async function findSubmissionsWithTiming(db, targetPhotoId) {
  // Returns all scores for a target, joined with submission timing for winner calculation.
  // Formula: winnerScore = score * 0.7 + timeBonus * 0.3
  // timeBonus = max(0, 100 - ((submittedAt - uploadedAt) / (endsAt - uploadedAt)) * 100)
  const scores = db.collection('submission_scores');
  const photos = db.collection('photos');

  const [target, allScores] = await Promise.all([
    photos.findOne({ _id: new ObjectId(targetPhotoId) }),
    scores.find({ targetPhotoId: new ObjectId(targetPhotoId) }).toArray(),
  ]);

  if (!target || !allScores.length) return { target, scores: [] };

  const uploadedAt = target.uploadedAt ? new Date(target.uploadedAt).getTime() : null;
  const endsAt = target.endsAt ? new Date(target.endsAt).getTime() : null;
  const duration = endsAt && uploadedAt ? endsAt - uploadedAt : null;

  const enriched = allScores.map(s => {
    let timeBonus = 0;
    if (duration && duration > 0 && uploadedAt) {
      const elapsed = new Date(s.submittedAt).getTime() - uploadedAt;
      timeBonus = Math.max(0, TIME_BONUS_MAX - (elapsed / duration) * TIME_BONUS_MAX);
    }
    const winnerScore = Math.round((s.score * WINNER_SCORE_WEIGHT + timeBonus * TIME_BONUS_WEIGHT) * ROUNDING_FACTOR) / ROUNDING_FACTOR;
    return { ...s, timeBonus: Math.round(timeBonus * ROUNDING_FACTOR) / ROUNDING_FACTOR, winnerScore };
  });

  enriched.sort((a, b) => b.winnerScore - a.winnerScore || b.score - a.score);
  return { target, scores: enriched };
}

async function markWinnerDetermined(db, targetPhotoId) {
  const photos = db.collection('photos');
  await photos.updateOne(
    { _id: new ObjectId(targetPhotoId) },
    { $set: { winnerDetermined: true, updatedAt: new Date() } }
  );
}

module.exports = {
  upsertSubmissionScore,
  findScoresByTargetPhoto,
  findLeaderboard,
  findUserStats,
  findUserRank,
  findPhotoOwnerEmail,
  findSubmissionsWithTiming,
  markWinnerDetermined,
};