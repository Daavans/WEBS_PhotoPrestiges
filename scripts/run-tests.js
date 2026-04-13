#!/usr/bin/env node
/**
 * PhotoPrestiges – Newman test runner
 *
 * Fetches the Postman collection via the Postman API and runs it with Newman.
 *
 * Required environment variables (set in .env or pass as CLI argument):
 *   POSTMAN_API_KEY  – your Postman API key (https://app.getpostman.com/app/settings/api-keys)
 *   ADMIN_TOKEN      – valid JWT access token of an admin user
 *   USER_TOKEN       – (optional) JWT of a regular user (for 403 tests)
 *
 * Usage:
 *   node scripts/run-tests.js
 *   or via npm:
 *   npm test
 */

const path = require('path');
const fs = require('fs');

// Load root .env
const rootEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) require('dotenv').config({ path: rootEnv });

const newman = require('newman');

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const ADMIN_TOKEN     = process.env.ADMIN_TOKEN     || '';
const USER_TOKEN      = process.env.USER_TOKEN      || '';

// Collection UID in Postman (WEBS5 workspace)
const COLLECTION_UID  = '37359447-fdc17fb0-0ed5-47e5-aa79-f9e0e66ba4da';

if (!POSTMAN_API_KEY) {
  console.error('\n  Set POSTMAN_API_KEY via .env or as an environment variable.');
  console.error('    Create one at: https://app.getpostman.com/app/settings/api-keys\n');
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.warn('\n   ADMIN_TOKEN is not set.');
  console.warn('    Clock-service tests will fail (requires admin JWT).');
  console.warn('    Log in first via POST http://localhost:3001/api/auth/login and copy the token.\n');
}

const collectionUrl = `https://api.getpostman.com/collections/${COLLECTION_UID}?apikey=${POSTMAN_API_KEY}`;

console.log('  PhotoPrestiges – running test collection...\n');

newman.run({
  collection: collectionUrl,
  envVar: [
    { key: 'admin_token',        value: ADMIN_TOKEN },
    // user_token intentionally omitted — captured dynamically via pm.environment.set in [AUTH] Login
    { key: 'base_url_auth',      value: process.env.BASE_URL_AUTH     || 'http://localhost:3001' },
    { key: 'base_url_register',  value: process.env.BASE_URL_REGISTER || 'http://localhost:3002' },
    { key: 'base_url_target',    value: process.env.BASE_URL_TARGET   || 'http://localhost:3003' },
    { key: 'base_url_score',     value: process.env.BASE_URL_SCORE    || 'http://localhost:3004' },
    { key: 'base_url_mail',      value: process.env.BASE_URL_MAIL     || 'http://localhost:3005' },
    { key: 'base_url_clock',     value: process.env.BASE_URL_CLOCK    || 'http://localhost:3006' },
    { key: 'base_url_read',      value: process.env.BASE_URL_READ     || 'http://localhost:3007' },
  ],
  reporters: ['cli'],
  reporter: {
    cli: {
      noSummary: false,
      noFailures: false,
    },
  },
}, (err, summary) => {
  if (err) {
    console.error('\n  Newman error:', err.message);
    process.exit(1);
  }

  const { stats } = summary.run;
  const failed = stats.assertions.failed;
  const total  = stats.assertions.total;

  console.log(`\n📊  Results: ${total - failed}/${total} tests passed`);

  if (failed > 0) {
    console.error(`  ${failed} test(s) failed\n`);
    process.exit(1);
  } else {
    console.log('  All tests passed!\n');
    process.exit(0);
  }
});