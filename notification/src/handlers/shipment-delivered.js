const { notifyShipmentDelivered } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: shipment.delivered
 *
 * Expected payload shape:
 * {
 *   shipmentId: string,
 *   orderId: string,
 *   customerId: string,
 *   deliveredAt: string    // ISO timestamp of confirmed delivery
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { shipmentId, orderId, customerId, deliveredAt } = payload;

  if (!orderId || !customerId) {
    console.warn('[shipment-delivered] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[shipment-delivered] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyShipmentDelivered({
    orderId,
    shipmentId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    deliveredAt,
  });

  return null;
}

module.exports = { handle };
