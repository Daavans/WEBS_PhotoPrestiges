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

async function start() {
  await connect();
  app.listen(config.port, () => {
    console.log(`Read service listening on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
