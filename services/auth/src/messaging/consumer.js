const config = require('../config');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;
const EXCHANGE = 'user.events';
const QUEUE = 'auth.user.registered';

async function connectWithRetry(retries = 0) {
  const amqp = require('amqplib');
  try {
    const connection = await amqp.connect(config.rabbitmqUrl);
    console.log('[auth] Connected to RabbitMQ');
    return connection;
  } catch (err) {
    if (retries >= MAX_RETRIES) {
      console.error('[auth] RabbitMQ connection failed after max retries:', err.message);
      return null;
    }
    console.log(`[auth] RabbitMQ not ready, retrying in ${RETRY_DELAY_MS / 1000}s... (${retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return connectWithRetry(retries + 1);
  }
}

async function startConsumer(onMessage) {
  if (!config.rabbitmqUrl) return;

  const connection = await connectWithRetry();
  if (!connection) return;

  const channel = await connection.createChannel();
  // Bind eigen queue aan de fanout exchange
  await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
  await channel.assertQueue(QUEUE, { durable: true });
  await channel.bindQueue(QUEUE, EXCHANGE, '');
  channel.prefetch(1);
  console.log('[auth] Listening on queue: ' + QUEUE);

  channel.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString());
      await onMessage(payload);
      channel.ack(msg);
    } catch (err) {
      console.error('[auth] Failed to process user.registered event:', err.message);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = { startConsumer };
