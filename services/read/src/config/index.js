require('dotenv').config();

const DEFAULT_PORT = 3007;
const DEFAULT_RADIX = 10;

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || String(DEFAULT_PORT), DEFAULT_RADIX),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
};
