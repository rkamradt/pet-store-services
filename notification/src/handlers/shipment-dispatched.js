const { notifyShipmentDispatched } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: shipment.dispatched
 *
 * Expected payload shape:
 * {
 *   shipmentId: string,
 *   orderId: string,
 *   customerId: string,
 *   trackingReference: string,       // optional carrier tracking number
 *   carrier: string,                 // optional carrier name e.g. "Royal Mail"
 *   estimatedDeliveryDate: string    // optional ISO date string
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { shipmentId, orderId, customerId, trackingReference, carrier, estimatedDeliveryDate } = payload;

  if (!orderId || !customerId) {
    console.warn('[shipment-dispatched] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[shipment-dispatched] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyShipmentDispatched({
    orderId,
    shipmentId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    trackingReference,
    carrier,
    estimatedDeliveryDate,
  });

  return null;
}

module.exports = { handle };
