const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const targetRoutes = require('./routes/target');

const app = express();
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_GENERAL_MAX = 100;
const RATE_LIMIT_UPLOAD_MAX = 20;
const JSON_BODY_LIMIT = '10kb';

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl === '*' ? true : config.frontendUrl,
  credentials: true,
}));
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_GENERAL_MAX,
  message: { success: false, message: 'Too many requests' },
});

const uploadLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_UPLOAD_MAX,
  message: { success: false, message: 'Too many upload requests' },
});

app.use('/api/target', generalLimiter);
app.use('/api/target/upload', uploadLimiter);
app.use('/api/target', targetRoutes);

app.get('/health', async (req, res) => {
  try {
    const { getDb } = require('./db/connect');
    getDb();
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
