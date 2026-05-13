const { notifyOrderCancelled } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: order.cancelled
 *
 * Expected payload shape:
 * {
 *   orderId: string,
 *   customerId: string,
 *   cancellationReason: string  // optional
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { orderId, customerId, cancellationReason } = payload;

  if (!orderId || !customerId) {
    console.warn('[order-cancelled] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[order-cancelled] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyOrderCancelled({
    orderId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    cancellationReason,
  });

  return null;
}

module.exports = { handle };
