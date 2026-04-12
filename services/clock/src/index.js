const path = require('path');
const fs = require('fs');

const rootEnv = path.join(__dirname, '..', '..', '..', '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else if (fs.existsSync(path.join(process.cwd(), '.env'))) {
  require('dotenv').config();
}

const config = require('./config');
const { connect } = require('./db/connect');
const app = require('./app');
const { startScheduler } = require('./jobs');
const publisher = require('./messaging/publisher');

async function start() {
  await connect();
  await publisher.connect();
  startScheduler();
  app.listen(config.port, () => {
    console.log(`Clock service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
