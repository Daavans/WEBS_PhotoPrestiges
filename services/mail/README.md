# Mail Service

## Verantwoordelijkheid
De Mail Service beheert het verzenden van e-mail notificaties, welkomstmails, en communicatie met gebruikers binnen het Photo Prestiges platform.

## Functionaliteiten

### 1. Transactionele Emails
- Welkomstmail bij registratie
- Email verificatie
- Wachtwoord reset
- Account updates

### 2. Notificatie Emails
- Nieuwe votes op foto's
- Nieuwe comments (toekomstig)
- Badge verdiend notificaties
- Level up notificaties

### 3. Periodieke Emails
- Dagelijkse samenvatting
- Wekelijkse top foto's
- Maandelijkse statistieken
- Contest uitnodigingen

### 4. Marketing Emails
- Nieuwsbrieven
- Platform updates
- Speciale events
- User engagement campaigns

### 5. Template Management
- HTML email templates
- Dynamic content insertion
- Multi-language support (optioneel)
- Responsive design

## REST API Endpoints

### POST /api/mail/send
Verstuur email (internal API).

**Request Body:**
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "data": {
    "username": "photomaster",
    "verificationUrl": "https://photoprestiges.com/verify?token=xxx"
  },
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "message_id_here",
  "status": "queued"
}
```

### POST /api/mail/subscribe
Inschrijven voor notificaties.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "types": ["votes", "badges", "weekly_summary"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription preferences updated"
}
```

### DELETE /api/mail/unsubscribe
Uitschrijven van notificaties.

**Query Parameters:**
```
token=unsubscribe_token
types=all  # or specific types: votes,badges
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully unsubscribed from notifications"
}
```

### GET /api/mail/preferences
Haal email voorkeuren op.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "userId": "user_id",
  "subscriptions": {
    "votes": true,
    "badges": true,
    "comments": false,
    "weekly_summary": true,
    "newsletter": false
  }
}
```

### PUT /api/mail/preferences
Werk email voorkeuren bij.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "votes": true,
  "badges": true,
  "weekly_summary": false
}
```

**Response:**
```json
{
  "success": true,
  "preferences": { /* updated preferences */ }
}
```

## Database Schema

### email_queue
- id (primary key)
- to_email (string, indexed)
- user_id (foreign key, nullable)
- template (string)
- data (jsonb)
- priority (enum: 'low', 'normal', 'high')
- status (enum: 'queued', 'sending', 'sent', 'failed')
- attempts (integer, default: 0)
- last_attempt_at (timestamp, nullable)
- sent_at (timestamp, nullable)
- error (text, nullable)
- created_at (timestamp)

### email_preferences
- user_id (primary key, foreign key)
- votes_enabled (boolean, default: true)
- badges_enabled (boolean, default: true)
- comments_enabled (boolean, default: true)
- weekly_summary_enabled (boolean, default: true)
- newsletter_enabled (boolean, default: false)
- unsubscribe_token (string, unique)
- updated_at (timestamp)

### email_logs
- id (primary key)
- user_id (foreign key, nullable)
- to_email (string, indexed)
- template (string)
- subject (string)
- message_id (string, unique)
- status (enum: 'sent', 'delivered', 'bounced', 'complained')
- sent_at (timestamp)
- delivered_at (timestamp, nullable)

### email_templates
- id (primary key)
- code (string, unique)
- name (string)
- subject (string)
- html_body (text)
- text_body (text)
- variables (jsonb)
- active (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)

## Email Templates

### welcome
**Onderwerp:** Welkom bij Photo Prestiges!
**Variabelen:** username, verificationUrl
**Gebruik:** Nieuwe gebruiker registratie

### email_verification
**Onderwerp:** Verifieer je email adres
**Variabelen:** username, verificationUrl, expiryHours
**Gebruik:** Email verificatie

### password_reset
**Onderwerp:** Reset je wachtwoord
**Variabelen:** username, resetUrl, expiryMinutes
**Gebruik:** Wachtwoord vergeten

### vote_notification
**Onderwerp:** Je foto heeft een nieuwe stem!
**Variabelen:** username, photoTitle, photoUrl, totalVotes
**Gebruik:** Nieuwe vote op foto

### badge_earned
**Onderwerp:** Je hebt een nieuwe badge verdiend!
**Variabelen:** username, badgeName, badgeDescription, badgeIcon
**Gebruik:** Badge achievement

### level_up
**Onderwerp:** Level Up! Je bent nu Level {level}
**Variabelen:** username, newLevel, points, nextLevelPoints
**Gebruik:** Gebruiker bereikt nieuw level

### weekly_summary
**Onderwerp:** Je wekelijkse Photo Prestiges samenvatting
**Variabelen:** username, topPhotos, totalVotes, newBadges, rank
**Gebruik:** Wekelijkse activiteit samenvatting

## Omgevingsvariabelen

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3005
NODE_ENV=development

# Email Provider (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
EMAIL_FROM=noreply@photoprestiges.com
EMAIL_FROM_NAME=Photo Prestiges

# Alternative: SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASSWORD=your_smtp_password

# Queue Configuration
QUEUE_BATCH_SIZE=50
QUEUE_INTERVAL_MS=5000
MAX_RETRY_ATTEMPTS=3
RETRY_DELAY_MS=60000

# Frontend URLs
FRONTEND_URL=https://photoprestiges.com
UNSUBSCRIBE_URL=https://photoprestiges.com/unsubscribe

# External Services
AUTH_SERVICE_URL=http://localhost:3001
```

## Email Providers

### SendGrid (Aanbevolen)
```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: email,
  from: process.env.EMAIL_FROM,
  templateId: 'd-xxxxx',
  dynamicTemplateData: data
});
```

### Mailgun
```javascript
const mailgun = require('mailgun-js')({
  apiKey: process.env.MAILGUN_API_KEY,
  domain: process.env.MAILGUN_DOMAIN
});

await mailgun.messages().send({
  from: process.env.EMAIL_FROM,
  to: email,
  subject: subject,
  html: html
});
```

### Amazon SES
```javascript
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'eu-west-1' });

await ses.sendEmail({
  Source: process.env.EMAIL_FROM,
  Destination: { ToAddresses: [email] },
  Message: {
    Subject: { Data: subject },
    Body: { Html: { Data: html } }
  }
}).promise();
```

## Queue Processing

### Email Queue Worker
```javascript
// Process queue every 5 seconds
setInterval(async () => {
  const emails = await getQueuedEmails(BATCH_SIZE);
  
  for (const email of emails) {
    try {
      await sendEmail(email);
      await markAsSent(email.id);
    } catch (error) {
      await handleFailure(email.id, error);
    }
  }
}, QUEUE_INTERVAL_MS);
```

### Retry Logic
- Failed emails are retried up to 3 times
- Exponential backoff between retries
- Permanent failures logged for manual review

## Template Engine

### Handlebars Templates
```html
<html>
  <body>
    <h1>Hallo {{username}}!</h1>
    <p>Welkom bij Photo Prestiges.</p>
    <a href="{{verificationUrl}}">Verifieer je account</a>
  </body>
</html>
```

### Dynamic Variables
Templates support dynamic data insertion:
- User information
- Photo details
- Statistics
- URLs (verification, unsubscribe)

## Notification Types

### Real-time (Immediate)
- Email verification
- Password reset
- Critical security alerts

### Batched (Delayed)
- Vote notifications (batched per hour)
- Badge notifications (batched per day)
- Comment notifications (batched)

### Scheduled
- Daily summaries (8:00 AM local time)
- Weekly summaries (Monday 9:00 AM)
- Monthly newsletters (1st of month)

## User Preferences

Users can control:
- Vote notifications (on/off)
- Badge notifications (on/off)
- Comment notifications (on/off)
- Weekly summary (on/off)
- Newsletter (on/off)
- Frequency (immediate/daily digest/weekly)

## Unsubscribe Mechanism

1. All emails include unsubscribe link
2. Unique token per user
3. One-click unsubscribe (no login required)
4. Option to unsubscribe from all or specific types
5. Immediate effect (no more emails)

## Email Deliverability

### Best Practices
- SPF, DKIM, DMARC configuration
- Verified sender domain
- Clean email list (remove bounces)
- Respect unsubscribes
- Avoid spam triggers
- Monitor bounce/complaint rates

### Monitoring
- Delivery rate
- Open rate (optional tracking)
- Bounce rate
- Complaint rate
- Unsubscribe rate

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "@sendgrid/mail": "^7.7.0",
    "handlebars": "^4.7.7",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0",
    "node-cron": "^3.0.0",
    "juice": "^9.0.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Template rendering tests
npm run test:templates

# Integration tests (with mock SMTP)
npm run test:integration
```

## Error Handling

### Common Errors
- Invalid email address
- Bounced emails
- Rate limit exceeded
- Template not found
- Missing required variables

### Error Responses
```json
{
  "success": false,
  "error": "Invalid email address",
  "code": "INVALID_EMAIL"
}
```

## Rate Limiting

- Per user: 10 emails per hour
- Per service: 1000 emails per hour
- Bulk operations: separate queue with lower priority

## Compliance

- GDPR compliant
- CAN-SPAM compliant
- Easy unsubscribe
- Privacy policy link in footer
- Data retention policy

## Deployment

Service draait op poort 3005 en is toegankelijk via internal API (niet public).

## Monitoring & Alerts

- Failed email alerts
- Queue backlog alerts
- Bounce rate threshold alerts
- High complaint rate alerts
