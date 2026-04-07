require('dotenv').config();

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || '3005', 10),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  resendApiKey: process.env.RESEND_API_KEY || null,
  email: {
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    fromName: process.env.EMAIL_FROM_NAME || 'Photo Prestiges',
  },
  queue: {
    intervalMs: parseInt(process.env.QUEUE_INTERVAL_MS || '5000', 10),
    batchSize: parseInt(process.env.QUEUE_BATCH_SIZE || '10', 10),
    maxRetries: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
  },
  unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'http://localhost:3000/unsubscribe',
  serviceSecret: process.env.SERVICE_SECRET || null,
};
