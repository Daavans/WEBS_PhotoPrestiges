# Clock Service

## Verantwoordelijkheid
De Clock Service beheert geplande taken, cron jobs en tijdgebonden acties binnen het Photo Prestiges platform.

## Functionaliteiten

### 1. Cron Jobs
- Periodieke taken uitvoeren
- Flexibele scheduling (cron syntax)
- Job status monitoring
- Missed job handling

### 2. Contest Beheer
- Contest start/stop automatiseren
- Deadline enforcement
- Winner selection
- Results publicatie

### 3. Score Berekeningen
- Periodieke score updates
- Leaderboard refresh
- Trending calculations
- Statistics aggregation

### 4. Data Cleanup
- Old data archiveren
- Expired tokens verwijderen
- Temporary files cleanup
- Log rotation

### 5. Notificatie Triggers
- Dagelijkse summaries triggeren
- Wekelijkse updates
- Badge checks
- Streak updates

## Scheduled Jobs

### Minutely Jobs

#### Update Trending Scores
**Schedule:** Every minute
**Functie:** Update trending_score voor recente foto's
```javascript
// * * * * *
async function updateTrendingScores() {
  // Calculate trending scores for photos uploaded in last 7 days
  // Update photo_scores table
}
```

### Hourly Jobs

#### Process Vote Notifications
**Schedule:** Every hour at :00
**Functie:** Batch vote notificaties versturen
```javascript
// 0 * * * *
async function processVoteNotifications() {
  // Get users with new votes in last hour
  // Batch notifications via Mail Service
}
```

#### Clean Expired Tokens
**Schedule:** Every hour at :30
**Functie:** Verwijder verlopen verificatie tokens
```javascript
// 30 * * * *
async function cleanExpiredTokens() {
  // Delete expired email verification tokens
  // Delete expired password reset tokens
  // Delete blacklisted JWT tokens past expiry
}
```

### Daily Jobs

#### Daily Summary Emails
**Schedule:** 8:00 AM (per user timezone)
**Functie:** Verstuur dagelijkse activiteit samenvatting
```javascript
// 0 8 * * *
async function sendDailySummaries() {
  // Get active users subscribed to daily emails
  // Generate summary (new votes, position changes)
  // Trigger Mail Service
}
```

#### Update User Streaks
**Schedule:** 11:59 PM
**Functie:** Update gebruiker streaks
```javascript
// 59 23 * * *
async function updateStreaks() {
  // Check user activity for today
  // Update or break streaks
  // Award streak bonuses
}
```

#### Aggregate Daily Statistics
**Schedule:** 00:30 AM
**Functie:** Aggregeer statistieken van afgelopen dag
```javascript
// 30 0 * * *
async function aggregateDailyStats() {
  // Total uploads, votes, users
  // Store in daily_stats table
}
```

### Weekly Jobs

#### Weekly Summary Emails
**Schedule:** Monday 9:00 AM
**Functie:** Verstuur wekelijkse samenvatting
```javascript
// 0 9 * * 1
async function sendWeeklySummaries() {
  // Top photos of the week
  // User activity summary
  // Leaderboard changes
}
```

#### Clean Old Data
**Schedule:** Sunday 2:00 AM
**Functie:** Archive oude data
```javascript
// 0 2 * * 0
async function cleanOldData() {
  // Archive photos older than 2 years
  // Clean old email logs (> 90 days)
  // Remove soft-deleted users (> 30 days)
}
```

#### Refresh Weekly Leaderboard
**Schedule:** Sunday 11:59 PM
**Functie:** Reset wekelijkse rankings
```javascript
// 59 23 * * 0
async function refreshWeeklyLeaderboard() {
  // Calculate top photos of the week
  // Store results
  // Notify winners
}
```

### Monthly Jobs

#### Monthly Newsletter
**Schedule:** 1st day of month, 10:00 AM
**Functie:** Verstuur maandelijkse nieuwsbrief
```javascript
// 0 10 1 * *
async function sendMonthlyNewsletter() {
  // Top photos of the month
  // Platform statistics
  // New features
}
```

#### Generate Monthly Report
**Schedule:** 1st day of month, 3:00 AM
**Functie:** Genereer maandelijks rapport
```javascript
// 0 3 1 * *
async function generateMonthlyReport() {
  // User growth
  // Photo uploads
  // Engagement metrics
}
```

## REST API Endpoints

### GET /api/clock/jobs
Lijst alle actieve jobs.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "jobs": [
    {
      "id": "update_trending",
      "name": "Update Trending Scores",
      "schedule": "* * * * *",
      "enabled": true,
      "lastRun": "2024-01-01T12:00:00Z",
      "nextRun": "2024-01-01T12:01:00Z",
      "status": "success",
      "executionTime": 234
    }
  ]
}
```

### POST /api/clock/trigger/{jobId}
Trigger job handmatig (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Job triggered successfully",
  "jobId": "update_trending",
  "startedAt": "2024-01-01T12:00:00Z"
}
```

### PUT /api/clock/job/{jobId}/toggle
Enable/disable job (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request Body:**
```json
{
  "enabled": false
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "update_trending",
  "enabled": false
}
```

### GET /api/clock/status
Health check en status.

**Response:**
```json
{
  "status": "healthy",
  "uptime": 86400,
  "activeJobs": 12,
  "lastJobRun": "2024-01-01T12:00:00Z",
  "failedJobs": 0
}
```

### GET /api/clock/history/{jobId}
Execution history van job.

**Query Parameters:**
```
limit=50
```

**Response:**
```json
{
  "jobId": "update_trending",
  "history": [
    {
      "executionId": "exec_id",
      "startedAt": "2024-01-01T12:00:00Z",
      "completedAt": "2024-01-01T12:00:02Z",
      "status": "success",
      "executionTime": 2000,
      "error": null
    }
  ]
}
```

## Database Schema

### scheduled_jobs
- id (string, primary key)
- name (string)
- description (text)
- schedule (string, cron syntax)
- enabled (boolean, default: true)
- last_run_at (timestamp, nullable)
- next_run_at (timestamp)
- last_status (enum: 'success', 'failed', 'running')
- last_execution_time (integer, ms)
- last_error (text, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### job_executions
- id (primary key, UUID)
- job_id (foreign key)
- started_at (timestamp)
- completed_at (timestamp, nullable)
- status (enum: 'running', 'success', 'failed')
- execution_time (integer, ms, nullable)
- error (text, nullable)
- metadata (jsonb, nullable)

### contests (optioneel)
- id (primary key, UUID)
- title (string)
- description (text)
- start_at (timestamp)
- end_at (timestamp)
- status (enum: 'upcoming', 'active', 'ended', 'cancelled')
- winner_id (foreign key, nullable)
- created_at (timestamp)

## Omgevingsvariabelen

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3006
NODE_ENV=development

# Timezone
TZ=Europe/Amsterdam

# Job Configuration
ENABLE_ALL_JOBS=true
MAX_JOB_EXECUTION_TIME=300000  # 5 minutes

# External Services
SCORE_SERVICE_URL=http://localhost:3004
MAIL_SERVICE_URL=http://localhost:3005
TARGET_SERVICE_URL=http://localhost:3003
AUTH_SERVICE_URL=http://localhost:3001
```

## Job Implementation

### Using node-cron

```javascript
const cron = require('node-cron');

// Every minute
cron.schedule('* * * * *', async () => {
  await updateTrendingScores();
});

// Every hour
cron.schedule('0 * * * *', async () => {
  await processVoteNotifications();
});

// Daily at 8 AM
cron.schedule('0 8 * * *', async () => {
  await sendDailySummaries();
});

// Weekly on Monday at 9 AM
cron.schedule('0 9 * * 1', async () => {
  await sendWeeklySummaries();
});
```

### Job Execution Flow

```javascript
async function executeJob(jobId, jobFunction) {
  const execution = await createExecution(jobId);
  
  try {
    const startTime = Date.now();
    await jobFunction();
    const executionTime = Date.now() - startTime;
    
    await updateExecution(execution.id, {
      status: 'success',
      completedAt: new Date(),
      executionTime
    });
    
    await updateJob(jobId, {
      lastStatus: 'success',
      lastRunAt: new Date(),
      lastExecutionTime: executionTime
    });
  } catch (error) {
    await updateExecution(execution.id, {
      status: 'failed',
      completedAt: new Date(),
      error: error.message
    });
    
    await updateJob(jobId, {
      lastStatus: 'failed',
      lastError: error.message
    });
    
    // Alert admin
    await alertFailure(jobId, error);
  }
}
```

## Error Handling

### Retry Logic
- Jobs worden NIET automatisch opnieuw geprobeerd
- Mislukte jobs worden gelogd
- Admin krijgt notificatie bij failures
- Handmatige retry via API

### Timeout Handling
- Maximum execution time: 5 minuten
- Jobs worden afgebroken bij timeout
- Timeout wordt gelogd als failure

### Missed Jobs
- Bij service restart: check gemiste jobs
- Optie om gemiste jobs direct uit te voeren
- Of wachten op volgende schedule

## Contest Management

### Contest Lifecycle

```javascript
// Check for contests to start
async function checkContestStart() {
  const contests = await getUpcomingContests();
  
  for (const contest of contests) {
    if (contest.start_at <= new Date()) {
      await startContest(contest.id);
      await notifyParticipants(contest.id);
    }
  }
}

// Check for contests to end
async function checkContestEnd() {
  const contests = await getActiveContests();
  
  for (const contest of contests) {
    if (contest.end_at <= new Date()) {
      await endContest(contest.id);
      await calculateWinner(contest.id);
      await notifyWinner(contest.id);
    }
  }
}
```

## Monitoring & Alerts

### Health Checks
- Service uptime
- Job execution status
- Failed job count
- Last successful run per job

### Alerting
- Email admin on job failure
- Slack/Discord webhook (optioneel)
- Multiple consecutive failures
- Long execution times

### Metrics
- Average execution time per job
- Success rate per job
- Queue backlog
- System resource usage

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "node-cron": "^3.0.0",
    "pg": "^8.11.0",
    "axios": "^1.4.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Job execution tests
npm run test:jobs

# Integration tests
npm run test:integration
```

## Deployment

Service draait op poort 3006 en is toegankelijk via internal API (niet public).

### Deployment Overwegingen
- Ensure only ONE instance runs (avoid duplicate jobs)
- Use leader election if multiple instances
- Or use external scheduler (e.g., Kubernetes CronJobs)

## Best Practices

1. **Idempotency:** Jobs moeten idempotent zijn (veilig om meerdere keren uit te voeren)
2. **Logging:** Uitgebreide logging van alle job executions
3. **Monitoring:** Real-time monitoring van job status
4. **Graceful Shutdown:** Wacht op actieve jobs bij shutdown
5. **Resource Management:** Beperk geheugen en CPU gebruik
6. **Error Recovery:** Graceful error handling zonder crash
