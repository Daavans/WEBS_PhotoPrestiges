const axios = require('axios');
const { getDb } = require('../db/connect');
const config = require('../config');

// Queues weekly summary emails for all users who have the weeklySummary preference enabled.
async function sendWeeklySummaries() {
  if (!config.mailServiceUrl) {
    console.warn('[weekly-summary] MAIL_SERVICE_URL not set — skipping');
    return { skipped: true };
  }

  const db = getDb();
  const preferences = db.collection('email_preferences');
  const users = db.collection('users');

  const subscribedPrefs = await preferences
    .find({ weeklySummary: true })
    .toArray();

  let queued = 0;

  for (const pref of subscribedPrefs) {
    const user = await users.findOne(
      { _id: pref.userId, deletedAt: null },
      { projection: { email: 1, username: 1 } }
    );
    if (!user) continue;

    try {
      await axios.post(
        `${config.mailServiceUrl}/api/mail/send`,
        {
          to: user.email,
          userId: user._id.toString(),
          template: 'weekly_summary',
          data: {
            username: user.username || user.email,
            frontendUrl: config.frontendUrl,
          },
        },
        {
          headers: config.serviceSecret
            ? { 'X-Service-Secret': config.serviceSecret }
            : {},
          timeout: 5000,
        }
      );
      queued++;
    } catch (err) {
      console.error(`[weekly-summary] Failed to queue email for ${user.email}:`, err.message);
    }
  }

  console.log(`[weekly-summary] Queued ${queued} weekly summary emails`);
  return { queued };
}

module.exports = { sendWeeklySummaries };
