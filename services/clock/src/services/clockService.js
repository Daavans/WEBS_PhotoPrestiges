const { getDb } = require('../db/connect');
const { findExecutionHistory, findLastExecution } = require('../db/queries');
const { getJobList, toggleJob, triggerJob } = require('../jobs');

async function listJobs() {
  const db = getDb();
  const jobs = getJobList();

  const enriched = await Promise.all(
    jobs.map(async (job) => {
      const last = await findLastExecution(db, job.id);
      return {
        ...job,
        lastRun: last
          ? { startedAt: last.startedAt, status: last.status, durationMs: last.durationMs }
          : null,
      };
    })
  );

  return enriched;
}

async function trigger(jobId) {
  const found = await triggerJob(jobId);
  if (!found) return { error: 'Job not found' };
  return { triggered: true };
}

function toggle(jobId, enabled) {
  const found = toggleJob(jobId, enabled);
  if (!found) return { error: 'Job not found' };
  return { jobId, enabled };
}

async function getHistory(jobId, limit = 20) {
  const db = getDb();
  const jobs = getJobList();
  if (!jobs.find(j => j.id === jobId)) return { error: 'Job not found' };
  const history = await findExecutionHistory(db, jobId, limit);
  return { items: history };
}

function getStatus() {
  const jobs = getJobList();
  return {
    status: 'ok',
    scheduler: 'running',
    totalJobs: jobs.length,
    activeJobs: jobs.filter(j => j.enabled).length,
  };
}

module.exports = { listJobs, trigger, toggle, getHistory, getStatus };
