// This service contains no business logic. It translates foreign API responses to internal events only.

const { v4: uuidv4 } = require('uuid');

/**
 * Translate a successful Stripe PaymentIntent response into a payment.charged event payload.
 *
 * @param {object} stripePaymentIntent - Raw Stripe PaymentIntent object
 * @param {object} requestContext      - Original request parameters (orderId, customerId, etc.)
 * @returns {object} Internal payment.charged event
 */
function toPaymentCharged(stripePaymentIntent, requestContext) {
  return {
    eventId: uuidv4(),
    topic: 'payment.charged',
    occurredAt: new Date().toISOString(),
    data: {
      chargeId: stripePaymentIntent.id,
      stripeChargeId: stripePaymentIntent.latest_charge || stripePaymentIntent.id,
      orderId: requestContext.orderId || stripePaymentIntent.metadata?.orderId,
      customerId: requestContext.customerId || stripePaymentIntent.customer || stripePaymentIntent.metadata?.customerId,
      paymentMethodId: stripePaymentIntent.payment_method || requestContext.paymentMethodId,
      amount: stripePaymentIntent.amount,
      currency: stripePaymentIntent.currency,
      status: stripePaymentIntent.status,
    },
  };
}

/**
 * Translate a failed Stripe PaymentIntent response into a payment.failed event payload.
 *
 * @param {object} stripePaymentIntent - Raw Stripe PaymentIntent object (with last_payment_error)
 * @param {object} requestContext      - Original request parameters (orderId, customerId, etc.)
 * @returns {object} Internal payment.failed event
 */
function toPaymentFailed(stripePaymentIntent, requestContext) {
  const error = stripePaymentIntent.last_payment_error || stripePaymentIntent.error || {};
  return {
    eventId: uuidv4(),
    topic: 'payment.failed',
    occurredAt: new Date().toISOString(),
    data: {
      orderId: requestContext.orderId || stripePaymentIntent.metadata?.orderId,
      customerId: requestContext.customerId || stripePaymentIntent.customer || stripePaymentIntent.metadata?.customerId,
      paymentMethodId: stripePaymentIntent.payment_method || requestContext.paymentMethodId,
      amount: stripePaymentIntent.amount || requestContext.amount,
      currency: stripePaymentIntent.currency || requestContext.currency,
      failureCode: error.code || 'unknown',
      failureMessage: error.message || 'Payment was declined',
      declineCode: error.decline_code || null,
    },
  };
}

/**
 * Translate a successful Stripe Refund response into a payment.refunded event payload.
 *
 * @param {object} stripeRefund   - Raw Stripe Refund object
 * @param {object} requestContext - Original request parameters (orderId, chargeId, etc.)
 * @returns {object} Internal payment.refunded event
 */
function toPaymentRefunded(stripeRefund, requestContext) {
  return {
    eventId: uuidv4(),
    topic: 'payment.refunded',
    occurredAt: new Date().toISOString(),
    data: {
      refundId: stripeRefund.id,
      stripeRefundId: stripeRefund.id,
      chargeId: requestContext.chargeId || stripeRefund.payment_intent || stripeRefund.charge,
      orderId: requestContext.orderId || stripeRefund.metadata?.orderId,
      amount: stripeRefund.amount,
      currency: stripeRefund.currency,
      reason: stripeRefund.reason || requestContext.reason || 'requested_by_customer',
      status: stripeRefund.status,
    },
  };
}

module.exports = { toPaymentCharged, toPaymentFailed, toPaymentRefunded };
