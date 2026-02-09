const path = require('path');
const fs = require('fs');
const rootEnv = path.join(__dirname, '.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
}

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/photoprestiges';
const url = new URL(mongodbUri);
const databaseName = url.pathname.slice(1).replace(/\/$/, '') || 'photoprestiges';
const baseUrl = `${url.protocol}//${url.host}`;

const config = {
  mongodb: {
    url: baseUrl,
    databaseName,
    options: {}
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  lockCollectionName: 'changelog_lock',
  lockTtl: 60,
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs'
};

module.exports = config;
