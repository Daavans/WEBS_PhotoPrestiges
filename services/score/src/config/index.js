require('dotenv').config();

const DEFAULT_PORT = '3004';

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || DEFAULT_PORT, 10),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  mailServiceUrl: process.env.MAIL_SERVICE_URL || null,
  unsubscribeUrl: process.env.UNSUBSCRIBE_URL || 'http://localhost:3000/unsubscribe',
  serviceSecret: process.env.SERVICE_SECRET || null,
};