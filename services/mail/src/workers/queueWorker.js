const config = require('../config');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const mailService = require('../services/mailService');

let workerInterval = null;
let isProcessing = false;

function getRetryDelayMs(failures) {
  // failures = number of past send failures (attempts - 1 at delay-check time, since
  // attempts was incremented by markEmailSending before the failure was recorded)
  const delays = [30000, 120000, 600000];
  return delays[Math.min(failures, delays.length - 1)];
}

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;
  try {
    let db;
    try {
      db = getDb();
    } catch (err) {
      return;
    }

    const { maxRetries } = config.queue;
    const now = new Date();
    const batch = await queries.findQueuedBatch(db, config.queue.batchSize, maxRetries);

    for (const item of batch) {
      if (item.status === 'failed' && item.lastAttemptAt) {
        // attempts was already incremented for the last send attempt, so the
        // number of completed failures is item.attempts (not item.attempts - 1).
        const delay = getRetryDelayMs(item.attempts);
        const eligible = new Date(item.lastAttemptAt.getTime() + delay);
        if (now < eligible) continue;
      }

      // Atomically claim the item — skip if another worker already grabbed it.
      const claimed = await queries.markEmailSending(db, item._id);
      if (!claimed) continue;

      // Enrich template data with a user-specific unsubscribe URL.
      const data = { ...item.data };
      if (item.userId) {
        try {
          const prefs = await mailService.getPreferences(item.userId);
          data.unsubscribeUrl = `${config.unsubscribeUrl}?token=${prefs.unsubscribeToken}`;
        } catch (err) {
          // Non-fatal — template will use whatever unsubscribeUrl was already in data.
        }
      }

      try {
        const messageId = await mailService.sendEmail({
          to: item.to,
          template: item.template,
          data,
        });
        await queries.markEmailSent(db, item._id, messageId || '');
        await queries.insertEmailLog(db, {
          userId: item.userId || null,
          to: item.to,
          template: item.template,
          subject: item.subject || '',
          messageId: messageId || '',
          status: 'sent',
        });
      } catch (err) {
        await queries.markEmailFailed(db, item._id, err.message || 'Unknown error', maxRetries);
      }
    }
  } finally {
    isProcessing = false;
  }
}

function startWorker() {
  if (workerInterval) return;
  console.log(`Mail queue worker started (interval: ${config.queue.intervalMs}ms, batch: ${config.queue.batchSize})`);
  workerInterval = setInterval(() => {
    processQueue().catch((err) => console.error('Queue worker error:', err));
  }, config.queue.intervalMs);
  processQueue().catch((err) => console.error('Queue worker error:', err));
}

function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

module.exports = { startWorker, stopWorker };
