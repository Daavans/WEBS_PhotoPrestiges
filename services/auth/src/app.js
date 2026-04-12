const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth');

const app = express();
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

const RATE_WINDOW_MS = 60 * 1000;
const GENERAL_RATE_LIMIT_MAX = 100;
const LOGIN_RATE_LIMIT_MAX = 10;
const JSON_BODY_LIMIT = '10kb';
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_INTERNAL_ERROR = 500;
const HTTP_SERVICE_UNAVAILABLE = 503;

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl === '*' ? true : config.frontendUrl,
  credentials: true,
}));
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

const generalLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: GENERAL_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many requests' },
});
const loginLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: LOGIN_RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many login attempts' },
});

app.use('/api/auth', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

app.get('/health', async (req, res) => {
  try {
    const { getDb } = require('./db/connect');
    getDb();
    res.status(HTTP_OK).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(HTTP_SERVICE_UNAVAILABLE).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((req, res) => {
  res.status(HTTP_NOT_FOUND).json({ success: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('[auth] Unhandled error:', err.message, err.stack);
  res.status(HTTP_INTERNAL_ERROR).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
