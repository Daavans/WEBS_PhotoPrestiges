const axios = require('axios');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const config = require('../config');

async function queueVoteNotification({ targetPhotoId, score }) {
  if (!config.mailServiceUrl) return;
  try {
    const db = getDb();
    const owner = await queries.findPhotoOwnerEmail(db, targetPhotoId);
    if (!owner) return;
    const { items: allScores } = await queries.findScoresByTargetPhoto(db, targetPhotoId);
    const totalVotes = allScores.length;
    const headers = config.serviceSecret ? { 'X-Service-Secret': config.serviceSecret } : {};
    await axios.post(`${config.mailServiceUrl}/api/mail/send`, {
      to: owner.email,
      template: 'vote_notification',
      userId: owner.userId ? owner.userId.toString() : undefined,
      data: {
        username: owner.username,
        photoTitle: owner.photoTitle,
        photoUrl: `${config.frontendUrl}/photos/${targetPhotoId}`,
        totalVotes,
        unsubscribeUrl: config.unsubscribeUrl,
      },
      priority: 'normal',
    }, { headers });
  } catch (err) {
    console.error('[score] Failed to queue vote notification:', err.message);
  }
}

async function recordSubmission({ submissionId, targetPhotoId, userId, score, submittedAt }) {
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return { error: 'Score must be a number between 0 and 100' };
  }

  const db = getDb();
  await queries.upsertSubmissionScore(db, { submissionId, targetPhotoId, userId, score, submittedAt });
  queueVoteNotification({ targetPhotoId, score });
  return { success: true };
}

async function getLeaderboard({ limit = 50, offset = 0, targetPhotoId } = {}) {
  const db = getDb();
  const { items, total } = await queries.findLeaderboard(db, { limit, offset, targetPhotoId });
  return {
    leaderboard: items.map((s, i) => ({
      rank: offset + i + 1,
      submissionId: s.submissionId,
      targetPhotoId: s.targetPhotoId.toString(),
      userId: s.userId.toString(),
      score: s.score,
      submittedAt: s.submittedAt,
    })),
    total,
    limit,
    offset,
  };
}

async function getPhotoScores(targetPhotoId, { limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const { items, total } = await queries.findScoresByTargetPhoto(db, targetPhotoId, { limit, offset });
  return {
    scores: items.map((s, i) => ({
      rank: offset + i + 1,
      submissionId: s.submissionId,
      userId: s.userId.toString(),
      score: s.score,
      submittedAt: s.submittedAt,
    })),
    total,
    limit,
    offset,
  };
}

async function getUserStats(userId) {
  const db = getDb();
  const [stats, rank] = await Promise.all([
    queries.findUserStats(db, userId),
    queries.findUserRank(db, userId),
  ]);
  return { userId, rank, ...stats };
}

module.exports = { recordSubmission, getLeaderboard, getPhotoScores, getUserStats };
