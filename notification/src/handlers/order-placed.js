const { notifyOrderPlaced } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: order.placed
 *
 * Expected payload shape:
 * {
 *   orderId: string,
 *   customerId: string,
 *   items: [{ productId, productName, quantity, unitPrice }],
 *   totalAmount: number  // in pence/cents
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { orderId, customerId, items = [], totalAmount } = payload;

  if (!orderId || !customerId) {
    console.warn('[order-placed] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[order-placed] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyOrderPlaced({
    orderId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    items,
    totalAmount,
  });

  return null;
}

module.exports = { handle };
