require('dotenv').config();

const mongodbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
if (!mongodbUri) throw new Error('Missing required env: MONGODB_URI or DATABASE_URL');
if (!process.env.JWT_SECRET) throw new Error('Missing required env: JWT_SECRET');

module.exports = {
  port: parseInt(process.env.PORT || '3003', 10),
  mongodbUri,
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL || '*',
  nodeEnv: process.env.NODE_ENV || 'development',

  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || String(6 * 1024 * 1024), 10),
  allowedFormats: (process.env.ALLOWED_FORMATS || 'jpg,jpeg,png,webp').split(','),
  maxWidth: parseInt(process.env.MAX_WIDTH || '4000', 10),
  maxHeight: parseInt(process.env.MAX_HEIGHT || '4000', 10),
  minWidth: parseInt(process.env.MIN_WIDTH || '200', 10),
  minHeight: parseInt(process.env.MIN_HEIGHT || '200', 10),

  uploadDir: process.env.UPLOAD_DIR || '/uploads',
  baseUrl: process.env.BASE_URL || 'http://localhost:3003',

  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',

  imaggaApiKey: process.env.IMAGGA_API_KEY || null,
  imaggaApiSecret: process.env.IMAGGA_API_SECRET || null,
  googleVisionApiKey: process.env.GOOGLE_VISION_API_KEY || null,
};
