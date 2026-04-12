const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const scoreRoutes = require('./routes/score');

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 200;
const JSON_BODY_LIMIT = '10kb';

const app = express();
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl === '*' ? true : config.frontendUrl,
  credentials: true,
}));
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

app.use(express.json({ limit: JSON_BODY_LIMIT }));

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  message: { success: false, message: 'Too many requests' },
});

app.use('/api/score', limiter);
app.use('/api/score', scoreRoutes);

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