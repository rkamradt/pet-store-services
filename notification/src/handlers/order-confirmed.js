const { notifyOrderConfirmed } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: order.confirmed
 *
 * Expected payload shape:
 * {
 *   orderId: string,
 *   customerId: string,
 *   totalAmount: number  // in pence/cents
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { orderId, customerId, totalAmount } = payload;

  if (!orderId || !customerId) {
    console.warn('[order-confirmed] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[order-confirmed] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyOrderConfirmed({
    orderId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    totalAmount,
  });

  return null;
}

module.exports = { handle };
