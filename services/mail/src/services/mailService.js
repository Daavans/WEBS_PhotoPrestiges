const { Resend } = require('resend');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { getDb } = require('../db/connect');
const queries = require('../db/queries');
const { renderTemplate } = require('../utils/templates');

let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;
  if (!config.resendApiKey) return null;
  resendClient = new Resend(config.resendApiKey);
  return resendClient;
}

async function sendEmail({ to, template, data }) {
  const { subject, html } = renderTemplate(template, data);
  const client = getResendClient();

  if (!client) {
    console.log(`[MAIL DEV] To: ${to} | Subject: ${subject}`);
    console.log(`[MAIL DEV] Template: ${template} | Data: ${JSON.stringify(data)}`);
    return `dev-${uuidv4()}`;
  }

  const { data: result, error } = await client.emails.send({
    from: `${config.email.fromName} <${config.email.from}>`,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message);
  return result.id;
}

async function queueEmail({ to, userId, template, data, priority = 'normal' }) {
  const db = getDb();
  const id = await queries.insertQueuedEmail(db, { to, userId: userId || null, template, data, priority });
  return id.toString();
}

async function getPreferences(userId) {
  const db = getDb();
  let prefs = await queries.findPreferencesByUserId(db, userId);
  if (!prefs) {
    const token = uuidv4();
    prefs = await queries.upsertPreferences(db, userId, {
      userId,
      votes: true,
      badges: true,
      comments: true,
      weeklySummary: true,
      newsletter: false,
      unsubscribeToken: token,
    });
  }
  return prefs;
}

async function updatePreferences(userId, updates) {
  const db = getDb();
  const allowed = ['votes', 'badges', 'comments', 'weeklySummary', 'newsletter'];
  const filtered = {};
  for (const key of allowed) {
    if (typeof updates[key] === 'boolean') {
      filtered[key] = updates[key];
    }
  }

  const existing = await queries.findPreferencesByUserId(db, userId);
  if (!existing) {
    filtered.unsubscribeToken = uuidv4();
  }

  return queries.upsertPreferences(db, userId, filtered);
}

async function unsubscribeByToken(token, types) {
  const db = getDb();
  const prefs = await queries.findPreferencesByUnsubscribeToken(db, token);
  if (!prefs) return null;

  let updates = {};
  if (!types || types === 'all') {
    updates = { votes: false, badges: false, comments: false, weeklySummary: false, newsletter: false };
  } else {
    const typeList = types.split(',').map((t) => t.trim());
    for (const t of typeList) {
      if (['votes', 'badges', 'comments', 'weeklySummary', 'newsletter'].includes(t)) {
        updates[t] = false;
      }
    }
  }

  return queries.upsertPreferences(db, prefs.userId, updates);
}

module.exports = { sendEmail, queueEmail, getPreferences, updatePreferences, unsubscribeByToken };
