const kafka = require('./kafka');

const producer = kafka.producer();

/**
 * Connect the Kafka producer. Must be called once before publish().
 */
async function connect() {
  await producer.connect();
  console.log('[producer] connected');
}

/**
 * Publish a message to a Kafka topic.
 * This service currently produces no outbound events, but the infrastructure
 * is in place should that change.
 *
 * @param {string} topic - Kafka topic name
 * @param {object} payload - Plain object to serialise as JSON
 */
async function publish(topic, payload) {
  await producer.send({
    topic,
    messages: [
      {
        value: JSON.stringify(payload),
      },
    ],
  });
  console.log(`[producer] published to ${topic}:`, JSON.stringify(payload));
}

module.exports = { connect, publish };
