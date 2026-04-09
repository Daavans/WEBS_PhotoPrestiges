const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('../config');

// Finds all target photos whose endsAt has passed and winner not yet determined,
// calculates winner (score * 0.7 + timeBonus * 0.3), marks them done, and mails results.
async function checkDeadlines() {
  const client = new MongoClient(config.mongodbUri);
  await client.connect();
  const url = new URL(config.mongodbUri);
  const db = client.db(url.pathname.slice(1) || 'photoprestiges');

  try {
    const photos = db.collection('photos');
    const scores = db.collection('submission_scores');
    const users = db.collection('users');

    const expiredTargets = await photos.find({
      type: 'target',
      status: 'active',
      endsAt: { $lte: new Date() },
      winnerDetermined: { $ne: true },
    }).toArray();

    let processed = 0;

    for (const target of expiredTargets) {
      const targetId = target._id;
      const allScores = await scores.find({ targetPhotoId: targetId }).toArray();

      if (allScores.length === 0) {
        // No submissions — still mark as done
        await photos.updateOne({ _id: targetId }, { $set: { winnerDetermined: true, updatedAt: new Date() } });
        processed++;
        continue;
      }

      const uploadedAt = target.uploadedAt ? new Date(target.uploadedAt).getTime() : null;
      const endsAt = new Date(target.endsAt).getTime();
      const duration = uploadedAt ? endsAt - uploadedAt : null;

      const enriched = allScores.map(s => {
        let timeBonus = 0;
        if (duration && duration > 0 && uploadedAt) {
          const elapsed = new Date(s.submittedAt).getTime() - uploadedAt;
          timeBonus = Math.max(0, 100 - (elapsed / duration) * 100);
        }
        const winnerScore = Math.round((s.score * 0.7 + timeBonus * 0.3) * 100) / 100;
        return { ...s, timeBonus: Math.round(timeBonus * 100) / 100, winnerScore };
      });
      enriched.sort((a, b) => b.winnerScore - a.winnerScore || b.score - a.score);

      const winner = enriched[0];

      // Mark winner determined
      await photos.updateOne(
        { _id: targetId },
        { $set: { winnerDetermined: true, winnerId: winner.userId, updatedAt: new Date() } }
      );

      // Mail the target owner with full results
      if (config.mailServiceUrl) {
        const owner = await users.findOne({ _id: target.userId }, { projection: { email: 1, username: 1 } });
        if (owner) {
          const winnerUser = await users.findOne({ _id: winner.userId }, { projection: { username: 1, email: 1 } });
          const headers = config.serviceSecret ? { 'X-Service-Secret': config.serviceSecret } : {};
          await axios.post(`${config.mailServiceUrl}/api/mail/send`, {
            to: owner.email,
            userId: owner._id.toString(),
            template: 'contest_results',
            data: {
              ownerUsername: owner.username || owner.email,
              photoTitle: target.title || 'Jouw target',
              winnerUsername: winnerUser?.username || 'Onbekend',
              winnerScore: winner.winnerScore,
              totalSubmissions: allScores.length,
              frontendUrl: config.frontendUrl,
            },
          }, { headers, timeout: 5000 }).catch(e => console.warn('[deadline] Mail failed:', e.message));

          // Mail the winner separately
          if (winnerUser?.email) {
            await axios.post(`${config.mailServiceUrl}/api/mail/send`, {
              to: winnerUser.email,
              userId: winner.userId.toString(),
              template: 'you_won',
              data: {
                username: winnerUser.username || 'Deelnemer',
                photoTitle: target.title || 'het target',
                winnerScore: winner.winnerScore,
                score: winner.score,
                frontendUrl: config.frontendUrl,
              },
            }, { headers, timeout: 5000 }).catch(e => console.warn('[deadline] Winner mail failed:', e.message));
          }
        }
      }

      processed++;
      console.log(`[check-deadlines] Processed target ${targetId}, winner: ${winner.userId}`);
    }

    return { processedTargets: processed };
  } finally {
    await client.close();
  }
}

module.exports = { checkDeadlines };
