const { notifyPaymentFailed } = require('../services/notification');
const { getCustomer } = require('../services/customer-client');

/**
 * Handler for topic: payment.failed
 *
 * Expected payload shape:
 * {
 *   orderId: string,
 *   customerId: string,
 *   chargeId: string,       // Stripe charge ID, for reference
 *   failureReason: string   // optional human-readable reason from Stripe
 * }
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { orderId, customerId, failureReason } = payload;

  if (!orderId || !customerId) {
    console.warn('[payment-failed] missing orderId or customerId, skipping notification');
    return null;
  }

  let customer;
  try {
    customer = await getCustomer(customerId);
  } catch (err) {
    console.error(`[payment-failed] failed to fetch customer ${customerId}:`, err.message);
    return null;
  }

  notifyPaymentFailed({
    orderId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerName: `${customer.firstName} ${customer.lastName}`,
    failureReason,
  });

  return null;
}

module.exports = { handle };
