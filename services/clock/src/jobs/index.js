const cron = require('node-cron');
const { getDb } = require('../db/connect');
const { logExecution } = require('../db/queries');
const { cleanupExpiredSessions, cleanupExpiredVerifications } = require('./cleanupJob');
const { aggregateUserStats } = require('./statsJob');
const { sendWeeklySummaries } = require('./summaryJob');

// Registry of all jobs: id, description, schedule, handler, enabled flag
const jobRegistry = [
  {
    id: 'cleanup-sessions',
    description: 'Delete expired sessions from the database',
    schedule: '0 * * * *',
    handler: cleanupExpiredSessions,
    enabled: true,
  },
  {
    id: 'cleanup-verifications',
    description: 'Delete expired email verification tokens',
    schedule: '30 * * * *',
    handler: cleanupExpiredVerifications,
    enabled: true,
  },
  {
    id: 'aggregate-stats',
    description: 'Recalculate user_stats (points, level) from submission_scores',
    schedule: '0 2 * * *',
    handler: aggregateUserStats,
    enabled: true,
  },
  {
    id: 'weekly-summary',
    description: 'Queue weekly summary emails for subscribed users',
    schedule: '0 9 * * 1',
    handler: sendWeeklySummaries,
    enabled: true,
  },
];

// Map jobId → task instance (for enable/disable)
const taskMap = new Map();

async function runJob(job) {
  const startedAt = new Date();
  let status = 'success';
  let error = null;
  try {
    await job.handler();
  } catch (err) {
    status = 'failed';
    error = err.message;
    console.error(`[${job.id}] Job failed:`, err);
  }
  const finishedAt = new Date();
  try {
    const db = getDb();
    await logExecution(db, { jobId: job.id, startedAt, finishedAt, status, error });
  } catch (logErr) {
    console.error(`[${job.id}] Failed to log execution:`, logErr.message);
  }
}

function startScheduler() {
  for (const job of jobRegistry) {
    const task = cron.schedule(job.schedule, () => runJob(job), {
      scheduled: job.enabled,
    });
    taskMap.set(job.id, task);
    if (job.enabled) {
      console.log(`[scheduler] Registered job "${job.id}" → ${job.schedule}`);
    }
  }
  console.log(`[scheduler] Started with ${jobRegistry.filter(j => j.enabled).length} active jobs`);
}

function getJobList() {
  return jobRegistry.map(job => ({
    id: job.id,
    description: job.description,
    schedule: job.schedule,
    enabled: job.enabled,
  }));
}

function toggleJob(jobId, enabled) {
  const job = jobRegistry.find(j => j.id === jobId);
  if (!job) return false;
  job.enabled = enabled;
  const task = taskMap.get(jobId);
  if (task) {
    enabled ? task.start() : task.stop();
  }
  return true;
}

async function triggerJob(jobId) {
  const job = jobRegistry.find(j => j.id === jobId);
  if (!job) return false;
  await runJob(job);
  return true;
}

module.exports = { startScheduler, getJobList, toggleJob, triggerJob };
