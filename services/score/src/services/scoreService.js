const { ObjectId } = require('mongodb');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const config = require('../config');
const publisher = require('../messaging/publisher');

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const DEFAULT_LEADERBOARD_LIMIT = 50;
const DEFAULT_SCORES_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const TOP_RANKINGS_COUNT = 10;
const MAIL_PRIORITY = 'normal';

async function queueVoteNotification({ targetPhotoId, score }) {
  try {
    const db = getDb();
    const owner = await queries.findPhotoOwnerEmail(db, targetPhotoId);
    if (!owner) return;
    const { items: allScores } = await queries.findScoresByTargetPhoto(db, targetPhotoId);
    const totalVotes = allScores.length;
    publisher.publishMail({
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
      priority: MAIL_PRIORITY,
    });
  } catch (err) {
    console.error('[score] Failed to queue vote notification:', err.message);
  }
}

async function recordSubmission({ submissionId, targetPhotoId, userId, score, submittedAt }) {
  if (typeof score !== 'number' || score < SCORE_MIN || score > SCORE_MAX) {
    return { error: 'Score must be a number between 0 and 100' };
  }

  const db = getDb();
  await queries.upsertSubmissionScore(db, { submissionId, targetPhotoId, userId, score, submittedAt });
  queueVoteNotification({ targetPhotoId, score });
  return { success: true };
}

async function getLeaderboard({ limit = DEFAULT_LEADERBOARD_LIMIT, offset = DEFAULT_OFFSET, targetPhotoId } = {}) {
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

async function getPhotoScores(targetPhotoId, { limit = DEFAULT_SCORES_LIMIT, offset = DEFAULT_OFFSET } = {}) {
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

async function getWinner(targetPhotoId) {
  const db = getDb();
  const { target, scores } = await queries.findSubmissionsWithTiming(db, targetPhotoId);
  if (!target) return { error: 'Target not found' };

  if (!target.endsAt || new Date() < new Date(target.endsAt)) {
    return { error: 'Contest has not ended yet', status: 400 };
  }

  if (!scores.length) return { winner: null, message: 'No submissions for this target', rankings: [] };

  const winner = scores[0];

  // Enrich winner with username
  const users = db.collection('users');
  const winnerUser = await users.findOne(
    { _id: new ObjectId(winner.userId.toString()) },
    { projection: { username: 1, email: 1 } }
  );

  return {
    winner: {
      userId: winner.userId.toString(),
      username: winnerUser?.username || null,
      submissionId: winner.submissionId,
      score: winner.score,
      timeBonus: winner.timeBonus,
      winnerScore: winner.winnerScore,
      submittedAt: winner.submittedAt,
    },
    rankings: scores.slice(0, TOP_RANKINGS_COUNT).map((s, i) => ({
      rank: i + 1,
      userId: s.userId.toString(),
      submissionId: s.submissionId,
      score: s.score,
      timeBonus: s.timeBonus,
      winnerScore: s.winnerScore,
      submittedAt: s.submittedAt,
    })),
  };
}

module.exports = { recordSubmission, getLeaderboard, getPhotoScores, getUserStats, getWinner };