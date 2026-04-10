const config = require('../config');

const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 10;
const EXCHANGE = 'user.events';

let channel = null;

async function connect(retries = 0) {
  if (!config.rabbitmqUrl) return;
  try {
    const amqp = require('amqplib');
    const connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    // Fanout exchange: elke subscriber krijgt een eigen kopie van het bericht
    await channel.assertExchange(EXCHANGE, 'fanout', { durable: true });
    console.log('[register] Connected to RabbitMQ (exchange: ' + EXCHANGE + ')');
  } catch (err) {
    if (retries >= MAX_RETRIES) {
      console.error('[register] RabbitMQ connection failed after max retries:', err.message);
      return;
    }
    console.log(`[register] RabbitMQ not ready, retrying in ${RETRY_DELAY_MS / 1000}s... (${retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return connect(retries + 1);
  }
}

function publish(routingKey, payload) {
  if (!channel) return;
  try {
    // Bij fanout exchange wordt routingKey genegeerd, maar meesturen voor leesbaarheid
    channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(payload)), { persistent: true });
  } catch (err) {
    console.error('[register] Failed to publish message:', err.message);
  }
}

async function close() {}

module.exports = { connect, publish, close };
