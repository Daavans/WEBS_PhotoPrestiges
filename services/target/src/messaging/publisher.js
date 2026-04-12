const config = require('../config');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;
const EXCHANGE = 'photo.events';

let channel = null;

async function connect(retries = 0) {
  if (!config.rabbitmqUrl) return;
  try {
    const amqp = require('amqplib');
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
    console.log('[target] Connected to RabbitMQ (exchange: ' + EXCHANGE + ')');
  } catch (err) {
    if (retries >= MAX_RETRIES) {
      console.error('[target] RabbitMQ connection failed after max retries:', err.message);
      return;
    }
    console.log(`[target] RabbitMQ not ready, retrying in ${RETRY_DELAY_MS / 1000}s... (${retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return connect(retries + 1);
  }
}

function publishPhoto(eventType, payload) {
  if (!channel) return;
  try {
    channel.publish(EXCHANGE, eventType, Buffer.from(JSON.stringify({ eventType, ...payload })), { persistent: true });
  } catch (err) {
    console.error('[target] Failed to publish photo event:', err.message);
  }
}

async function close() {}

module.exports = { connect, publishPhoto, close };
