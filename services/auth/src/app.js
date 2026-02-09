const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl === '*' ? true : config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' },
});
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts' },
});

app.use('/api/auth', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

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
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const authRoutes = require('./routes/auth');

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.frontendUrl === '*' ? true : config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests' },
});
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts' },
});

app.use('/api/auth', generalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

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
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
