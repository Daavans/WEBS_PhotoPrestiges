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
const { startConsumer } = require('./messaging/consumer');
const { upsertUserFromEvent } = require('./db/queries');

async function start() {
  await connect();
  await startConsumer(async (payload) => {
    const db = getDb();
    await upsertUserFromEvent(db, payload);
    console.log('[auth] Synced user from register event:', payload.email);
  });
  app.listen(config.port, () => {
    console.log(`Auth service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
