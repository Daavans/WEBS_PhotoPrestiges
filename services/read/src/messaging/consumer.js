const config = require('../config');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;
const EXCHANGE = 'photo.events';
const QUEUE = 'read.photo.events';
const PREFETCH_COUNT = 1;

async function connectWithRetry(retries = 0) {
  const amqp = require('amqplib');
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    console.log('[read] Connected to RabbitMQ');
    return connection;
  } catch (err) {
    if (retries >= MAX_RETRIES) {
      console.error('[read] RabbitMQ connection failed after max retries:', err.message);
      return null;
    }
    console.log(`[read] RabbitMQ not ready, retrying in ${RETRY_DELAY_MS / 1000}s... (${retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(retries + 1);
  }
}

async function startConsumer(onMessage) {
  if (!config.rabbitmqUrl) return;

  const connection = await connectWithRetry();
  if (!connection) return;

  const channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, '');
  channel.prefetch(PREFETCH_COUNT);
  console.log('[read] Listening on queue: ' + QUEUE);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await onMessage(payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[read] Failed to process RabbitMQ message:', err.message);
      channel.nack(msg, false, false);
    }
  });
}

async function close() {}

module.exports = { startConsumer, close };
