const config = require('../config');

let connection = null;
let channel = null;

async function connect() {
  if (!config.rabbitmqUrl) return;
  try {
    const amqp = require('amqplib');
    connection = await amqp.connect(config.rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('user.registered', { durable: true });
    console.log('[register] Connected to RabbitMQ');
  } catch (err) {
    console.error('[register] RabbitMQ connection failed:', err.message);
    // Non-fatal: service works without message queue
    channel = null;
  }
}

function publish(queue, payload) {
  if (!channel) return;
  try {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
  } catch (err) {
    console.error('[register] Failed to publish message:', err.message);
  }
}

async function close() {
  if (connection) await connection.close();
}

module.exports = { connect, publish, close };
