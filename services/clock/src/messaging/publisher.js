const config = require('../config');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;
const EXCHANGE = 'mail.events';

let channel = null;

async function connect(retries = 0) {
  if (!config.rabbitmqUrl) return;
  try {
    const amqp = require('amqplib');
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
    console.log('[clock] Connected to RabbitMQ (exchange: ' + EXCHANGE + ')');
  } catch (err) {
    if (retries >= MAX_RETRIES) {
      console.error('[clock] RabbitMQ connection failed after max retries:', err.message);
      return;
    }
    console.log(`[clock] RabbitMQ not ready, retrying in ${RETRY_DELAY_MS / 1000}s... (${retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return connect(retries + 1);
  }
}

function publishMail(payload) {
  if (!channel) return;
  try {
    channel.publish(EXCHANGE, '', Buffer.from(JSON.stringify(payload)), { persistent: true });
  } catch (err) {
    console.error('[clock] Failed to publish mail request:', err.message);
  }
}

async function close() {}

module.exports = { connect, publishMail, close };
