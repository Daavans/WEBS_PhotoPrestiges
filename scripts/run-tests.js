#!/usr/bin/env node
/**
 * PhotoPrestiges – Newman test runner
 *
 * Haalt de Postman-collectie op via de Postman API en voert hem uit met Newman.
 *
 * Vereiste omgevingsvariabelen (zet in .env of geef mee als CLI-argument):
 *   POSTMAN_API_KEY  – jouw Postman API-sleutel (https://app.getpostman.com/app/settings/api-keys)
 *   ADMIN_TOKEN      – geldige JWT access token van een admin-gebruiker
 *   USER_TOKEN       – (optioneel) JWT van een gewone gebruiker (voor 403-test)
 *
 * Gebruik:
 *   node scripts/run-tests.js
 *   of via npm:
 *   npm test
 */

const path = require('path');
const fs = require('fs');

// Laad root .env
const rootEnv = path.join(__dirname, '..', '.env');
if (fs.existsSync(rootEnv)) require('dotenv').config({ path: rootEnv });

const newman = require('newman');

const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const ADMIN_TOKEN     = process.env.ADMIN_TOKEN     || '';
const USER_TOKEN      = process.env.USER_TOKEN      || '';

// Collectie-UID in Postman (WEBS5 workspace)
const COLLECTION_UID  = '37359447-fdc17fb0-0ed5-47e5-aa79-f9e0e66ba4da';

if (!POSTMAN_API_KEY) {
  console.error('\n❌  Stel POSTMAN_API_KEY in via .env of als omgevingsvariabele.');
  console.error('    Aanmaken: https://app.getpostman.com/app/settings/api-keys\n');
  process.exit(1);
}

if (!ADMIN_TOKEN) {
  console.warn('\n⚠️   ADMIN_TOKEN is niet ingesteld.');
  console.warn('    Clock-service tests zullen mislukken (vereist admin JWT).');
  console.warn('    Login eerst via POST http://localhost:3001/api/auth/login en kopieer het token.\n');
}

const collectionUrl = `https://api.getpostman.com/collections/${COLLECTION_UID}?apikey=${POSTMAN_API_KEY}`;

console.log('🚀  PhotoPrestiges – testcollectie wordt uitgevoerd...\n');

newman.run({
  collection: collectionUrl,
  envVar: [
    { key: 'admin_token', value: ADMIN_TOKEN },
    { key: 'user_token',  value: USER_TOKEN  },
    { key: 'base_url_read',  value: process.env.BASE_URL_READ  || 'http://localhost:3007' },
    { key: 'base_url_clock', value: process.env.BASE_URL_CLOCK || 'http://localhost:3006' },
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
    console.error('\n❌  Newman fout:', err.message);
    process.exit(1);
  }

  const { stats } = summary.run;
  const failed = stats.assertions.failed;
  const total  = stats.assertions.total;

  console.log(`\n📊  Resultaat: ${total - failed}/${total} tests geslaagd`);

  if (failed > 0) {
    console.error(`❌  ${failed} test(s) mislukt\n`);
    process.exit(1);
  } else {
    console.log('✅  Alle tests geslaagd!\n');
    process.exit(0);
  }
});
