require('dotenv').config();

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || process.env.AUTH_SERVICE_PORT || '3001', 10),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  rabbitmqUrl: process.env.RABBITMQ_URL || null,
};
