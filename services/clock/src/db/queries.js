async function logExecution(db, { jobId, startedAt, finishedAt, status, error = null }) {
  const executions = db.collection('job_executions');
  const durationMs = finishedAt - startedAt;
  await executions.insertOne({
    jobId,
    startedAt,
    finishedAt,
    status,
    error,
    durationMs,
  });
}

async function findExecutionHistory(db, jobId, limit = 20) {
  const executions = db.collection('job_executions');
  return executions
    .find({ jobId })
    .sort({ startedAt: -1 })
    .limit(limit)
    .toArray();
}

async function findLastExecution(db, jobId) {
  const executions = db.collection('job_executions');
  return executions.findOne({ jobId }, { sort: { startedAt: -1 } });
}

module.exports = { logExecution, findExecutionHistory, findLastExecution };
