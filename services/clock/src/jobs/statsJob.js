const { getDb } = require('../db/connect');

// Recalculates user_stats for all users based on submission_scores and photos.
// Points formula: bestScore * 10 + totalSubmissions * 2
// Level formula: floor(points / 100) + 1
async function aggregateUserStats() {
  const db = getDb();
  const scores = db.collection('submission_scores');
  const photos = db.collection('photos');
  const userStats = db.collection('user_stats');

  // Aggregate submission stats per user
  const submissionStats = await scores.aggregate([
    {
      $group: {
        _id: '$userId',
        bestScore: { $max: '$score' },
        totalSubmissions: { $sum: 1 },
        totalVotesReceived: { $sum: 0 }, // placeholder for future vote system
      },
    },
  ]).toArray();

  let updated = 0;

  for (const stat of submissionStats) {
    const photoCount = await photos.countDocuments({ userId: stat._id, status: 'active' });
    const points = Math.round(stat.bestScore * 10 + stat.totalSubmissions * 2);
    const level = Math.floor(points / 100) + 1;

    await userStats.updateOne(
      { userId: stat._id },
      {
        $set: {
          userId: stat._id,
          totalPhotos: photoCount,
          totalVotesReceived: stat.totalVotesReceived,
          points,
          level,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          totalVotesGiven: 0,
        },
      },
      { upsert: true }
    );
    updated++;
  }

  console.log(`[aggregate-stats] Updated stats for ${updated} users`);
  return { updatedUsers: updated };
}

module.exports = { aggregateUserStats };
