const path = require('path');
const fs = require('fs');

const rootEnv = path.join(__dirname, '..', '..', '..', '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  require('dotenv').config();
}

const config = require('./config');
const { connect, getDb } = require('./db/connect');
const app = require('./app');
const { startWorker } = require('./workers/queueWorker');
const { startConsumer } = require('./messaging/consumer');
const queries = require('./db/queries');

const WELCOME_EMAIL_SUBJECT = 'Welcome to Photo Prestiges!';
const WELCOME_EMAIL_PRIORITY = 1;

async function handleUserRegistered(payload) {
  const db = getDb();
  await queries.insertQueuedEmail(db, {
    to: payload.email,
    template: 'welcome',
    userId: payload.userId,
    data: {
      username: payload.username,
      unsubscribeUrl: config.unsubscribeUrl,
    },
    priority: WELCOME_EMAIL_PRIORITY,
    subject: WELCOME_EMAIL_SUBJECT,
  });
}

async function start() {
  await connect();
  startWorker();
  await startConsumer(handleUserRegistered);
  app.listen(config.port, () => {
    console.log(`Mail service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
