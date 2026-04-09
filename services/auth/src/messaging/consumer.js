const config = require('../config');

let connection = null;

async function startConsumer(onMessage) {
  if (!config.rabbitmqUrl) return;
  try {
    const amqp = require('amqplib');
    connection = await amqp.connect(config.rabbitmqUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue('user.registered', { durable: true });
    channel.prefetch(1);
    console.log('[auth] RabbitMQ consumer listening on user.registered');

    channel.consume('user.registered', async (msg) => {
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
  } catch (err) {
    console.error('[auth] RabbitMQ consumer connection failed:', err.message);
  }
}

module.exports = { startConsumer };
