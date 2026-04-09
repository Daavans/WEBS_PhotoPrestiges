const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, duration);
  });
  next();
}

async function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

const mailQueueSize = new client.Gauge({
  name: 'mail_queue_size',
  help: 'Current number of emails pending in the queue',
  registers: [register],
});

const mailSentTotal = new client.Counter({
  name: 'mail_sent_total',
  help: 'Total number of emails successfully sent',
  registers: [register],
});

const mailFailedTotal = new client.Counter({
  name: 'mail_failed_total',
  help: 'Total number of emails that permanently failed',
  registers: [register],
});

module.exports = { metricsMiddleware, metricsEndpoint, register, mailQueueSize, mailSentTotal, mailFailedTotal };
