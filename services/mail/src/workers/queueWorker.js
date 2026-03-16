const config = require('../config');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const mailService = require('../services/mailService');

let workerInterval = null;

function getRetryDelayMs(attempts) {
  const delays = [30000, 120000, 600000];
  return delays[Math.min(attempts, delays.length - 1)];
}

async function processQueue() {
  let db;
  try {
    db = getDb();
  } catch (err) {
    return;
  }

  const now = new Date();
  const batch = await queries.findQueuedBatch(db, config.queue.batchSize);

  for (const item of batch) {
    if (item.status === 'failed' && item.lastAttemptAt) {
      const delay = getRetryDelayMs(item.attempts);
      const eligible = new Date(item.lastAttemptAt.getTime() + delay);
      if (now < eligible) continue;
    }

    await queries.markEmailSending(db, item._id);

    try {
      const messageId = await mailService.sendEmail({
        to: item.to,
        template: item.template,
        data: item.data || {},
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
      await queries.markEmailFailed(db, item._id, err.message || 'Unknown error');
    }
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
