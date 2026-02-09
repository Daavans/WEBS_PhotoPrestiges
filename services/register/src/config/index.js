require('dotenv').config();

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || process.env.REGISTER_SERVICE_PORT || '3002', 10),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  verificationTokenExpiry: process.env.VERIFICATION_TOKEN_EXPIRY || '24h',
  mailServiceUrl: process.env.MAIL_SERVICE_URL || null,
};
