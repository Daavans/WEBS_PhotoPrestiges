const axios = require('axios');
const { MongoClient } = require('mongodb');
const config = require('../config');

// Finds all active targets with a future deadline.
// For each, finds registered participants who have NOT yet submitted.
// Sends them a reminder email with time remaining.
async function sendDeadlineReminders() {
  if (!config.mailServiceUrl) {
    console.warn('[send-reminders] MAIL_SERVICE_URL not set — skipping');
    return { skipped: true };
  }

  const client = new MongoClient(config.mongodbUri);
  await client.connect();
  const url = new URL(config.mongodbUri);
  const db = client.db(url.pathname.slice(1) || 'photoprestiges');

  try {
    const photos = db.collection('photos');
    const regs = db.collection('target_registrations');
    const submissions = db.collection('submissions');
    const users = db.collection('users');

    const now = new Date();
    const activeTargets = await photos.find({
      type: 'target',
      status: 'active',
      endsAt: { $gt: now },
    }).toArray();

    let queued = 0;
    const headers = config.serviceSecret ? { 'X-Service-Secret': config.serviceSecret } : {};

    for (const target of activeTargets) {
      const targetId = target._id;
      const registered = await regs.find({ targetPhotoId: targetId }).toArray();
      if (!registered.length) continue;

      const submittedUserIds = (await submissions.find({ targetPhotoId: targetId }).toArray())
        .map(s => s.userId.toString());

      const pending = registered.filter(r => !submittedUserIds.includes(r.userId.toString()));

      const msLeft = new Date(target.endsAt).getTime() - now.getTime();
      const hoursLeft = Math.round(msLeft / (1000 * 60 * 60));

      for (const reg of pending) {
        const user = await users.findOne(
          { _id: reg.userId, deletedAt: null },
          { projection: { email: 1, username: 1 } }
        );
        if (!user) continue;

        await axios.post(`${config.mailServiceUrl}/api/mail/send`, {
          to: user.email,
          userId: user._id.toString(),
          template: 'deadline_reminder',
          data: {
            username: user.username || user.email,
            photoTitle: target.title || 'het target',
            hoursLeft,
            endsAt: target.endsAt,
            frontendUrl: config.frontendUrl,
          },
        }, { headers, timeout: 5000 }).catch(e => console.warn('[send-reminders] Mail failed:', e.message));
        queued++;
      }
    }

    console.log(`[send-reminders] Queued ${queued} reminder emails`);
    return { queued };
  } finally {
    await client.close();
  }
}

module.exports = { sendDeadlineReminders };
