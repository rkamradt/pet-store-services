// Set FOREIGN_API_BASE_URL=http://stripe-provider-mock:3000 in dev/stage to use the companion mock

const fetch = require('node-fetch');

const BASE_URL = process.env.FOREIGN_API_BASE_URL || 'https://api.stripe.com';

function authHeaders() {
  const apiKey = process.env.FOREIGN_API_KEY;
  if (!apiKey) {
    throw new Error('FOREIGN_API_KEY environment variable is not set');
  }
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

/**
 * Encode a plain object as application/x-www-form-urlencoded, as required by the Stripe API.
 */
function encodeFormBody(params) {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
}

/**
 * Create a charge via the Stripe API.
 *
 * @param {object} params
 * @param {string} params.customerId       - Internal customer ID (passed as metadata)
 * @param {number} params.amount           - Amount in the smallest currency unit (e.g. cents)
 * @param {string} params.currency         - ISO 4217 currency code (e.g. "usd")
 * @param {string} params.paymentMethodId  - Stripe payment method ID
 * @param {string} params.orderId          - Internal order ID (passed as metadata)
 * @param {string} [params.description]    - Human-readable charge description
 * @returns {Promise<object>} Raw parsed JSON from Stripe
 */
async function createCharge({ customerId, amount, currency, paymentMethodId, orderId, description }) {
  const body = encodeFormBody({
    amount,
    currency,
    payment_method: paymentMethodId,
    customer: customerId,
    description: description || `Pet Store order ${orderId}`,
    'metadata[orderId]': orderId,
    'metadata[customerId]': customerId,
    confirm: true,
  });

  const response = await fetch(`${BASE_URL}/v1/payment_intents`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  });

  const data = await response.json();
  return data;
}

/**
 * Create a refund via the Stripe API.
 *
 * @param {object} params
 * @param {string} params.chargeId   - Stripe PaymentIntent or Charge ID to refund
 * @param {number} [params.amount]   - Amount to refund in smallest currency unit; omit for full refund
 * @param {string} [params.reason]   - Reason for refund: 'duplicate', 'fraudulent', or 'requested_by_customer'
 * @param {string} params.orderId    - Internal order ID (passed as metadata)
 * @returns {Promise<object>} Raw parsed JSON from Stripe
 */
async function createRefund({ chargeId, amount, reason, orderId }) {
  const body = encodeFormBody({
    payment_intent: chargeId,
    ...(amount !== undefined ? { amount } : {}),
    ...(reason ? { reason } : {}),
    'metadata[orderId]': orderId,
  });

  const response = await fetch(`${BASE_URL}/v1/refunds`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  });

  const data = await response.json();
  return data;
}

module.exports = { createCharge, createRefund };
