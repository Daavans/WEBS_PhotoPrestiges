const path = require('path');
const fs = require('fs');
const Handlebars = require('handlebars');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const cache = {};

const SUBJECTS = {
  welcome: 'Welkom bij Photo Prestiges!',
  email_verification: 'Verifieer je email adres',
  password_reset: 'Reset je wachtwoord',
  vote_notification: 'Je foto heeft een nieuwe stem!',
  weekly_summary: 'Je wekelijkse Photo Prestiges samenvatting',
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
  const subject = SUBJECTS[name] || 'Photo Prestiges';
  return { subject, html };
}

module.exports = { renderTemplate };
