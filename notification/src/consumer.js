const kafka = require('./kafka');
const producer = require('./producer');

const orderPlacedHandler = require('./handlers/order-placed');
const orderConfirmedHandler = require('./handlers/order-confirmed');
const orderCancelledHandler = require('./handlers/order-cancelled');
const paymentFailedHandler = require('./handlers/payment-failed');
const shipmentDispatchedHandler = require('./handlers/shipment-dispatched');
const shipmentDeliveredHandler = require('./handlers/shipment-delivered');
const inventoryLowStockHandler = require('./handlers/inventory-low-stock');

const consumer = kafka.consumer({ groupId: 'notification-group' });

const TOPIC_HANDLERS = {
  'order.placed': orderPlacedHandler,
  'order.confirmed': orderConfirmedHandler,
  'order.cancelled': orderCancelledHandler,
  'payment.failed': paymentFailedHandler,
  'shipment.dispatched': shipmentDispatchedHandler,
  'shipment.delivered': shipmentDeliveredHandler,
  'inventory.low-stock': inventoryLowStockHandler,
};

async function startConsumer() {
  await consumer.connect();
  console.log('[consumer] connected');

  for (const topic of Object.keys(TOPIC_HANDLERS)) {
    await consumer.subscribe({ topic, fromBeginning: false });
    console.log(`[consumer] subscribed to ${topic}`);
  }

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      let payload;
      try {
        payload = JSON.parse(message.value.toString());
      } catch (err) {
        console.error(`[consumer] failed to parse message on ${topic}:`, err.message);
        return;
      }

      console.log(`[consumer] received message on ${topic}:`, JSON.stringify(payload));

      const handler = TOPIC_HANDLERS[topic];
      if (!handler) {
        console.warn(`[consumer] no handler registered for topic: ${topic}`);
        return;
      }

      try {
        const result = await handler.handle(payload);
        if (result && result.topic && result.payload) {
          await producer.publish(result.topic, result.payload);
        }
      } catch (err) {
        console.error(`[consumer] error handling message on ${topic}:`, err.message, err.stack);
      }
    },
  });
}

module.exports = { startConsumer };
