const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'stripe-provider',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});

const producer = kafka.producer();

/**
 * Connect the Kafka producer. Must be called before publishing any events.
 * @returns {Promise<void>}
 */
async function connect() {
  await producer.connect();
  console.log('[producer] Connected to Kafka brokers:', process.env.KAFKA_BROKERS || 'localhost:9092');
}

/**
 * Publish an event payload to the specified Kafka topic.
 *
 * Topics published by this service:
 *   - payment.charged   — Emitted when a charge is successfully processed by Stripe
 *   - payment.failed    — Emitted when a charge attempt is rejected by Stripe
 *   - payment.refunded  — Emitted when a refund is successfully processed by Stripe
 *
 * @param {string} topic   - Kafka topic name
 * @param {object} payload - Event object to be JSON-serialised and sent
 * @returns {Promise<void>}
 */
async function publish(topic, payload) {
  const message = JSON.stringify(payload);
  await producer.send({
    topic,
    messages: [
      {
        key: payload.data?.orderId || payload.eventId,
        value: message,
      },
    ],
  });
  console.log(`[producer] Published to ${topic}:`, message);
}

/**
 * Gracefully disconnect the Kafka producer.
 * @returns {Promise<void>}
 */
async function disconnect() {
  await producer.disconnect();
  console.log('[producer] Disconnected from Kafka');
}

module.exports = { connect, publish, disconnect };
