const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const DEFAULT_SUBJECT = 'Photo Prestiges';

const cache = {};

const SUBJECTS = {
  welcome: 'Welcome to Photo Prestiges!',
  email_verification: 'Verify your email address',
  password_reset: 'Reset your password',
  vote_notification: 'Your photo received a new vote!',
  weekly_summary: 'Your weekly Photo Prestiges summary',
};

function getTemplate(name) {
  if (cache[name]) return cache[name];
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${name}`);
  }
  const source = fs.readFileSync(filePath, 'utf8');
  cache[name] = Handlebars.compile(source);
  return cache[name];
}

function renderTemplate(name, data) {
  const template = getTemplate(name);
  const html = template(data);
  const subject = SUBJECTS[name] || DEFAULT_SUBJECT;
  return { subject, html };
}

module.exports = { renderTemplate };
