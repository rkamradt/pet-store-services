/**
 * Notification service — business logic layer.
 *
 * Pure functions: no Kafka, no HTTP dependencies here.
 * Handlers call these functions to compose notification messages and "send"
 * them via the stubbed channel adapters below.
 *
 * In production these stubs would be replaced with real integrations
 * (e.g. SendGrid for email, Twilio for SMS).
 */

const OPS_ALERT_EMAIL = process.env.OPS_ALERT_EMAIL || 'ops@petstore.internal';

// ---------------------------------------------------------------------------
// Channel stubs
// ---------------------------------------------------------------------------

function sendEmail({ to, subject, body }) {
  console.log(`[email] TO: ${to} | SUBJECT: ${subject}\n${body}\n`);
  // Production: await sgMail.send({ to, from: 'noreply@petstore.com', subject, text: body });
}

function sendSms({ to, body }) {
  console.log(`[sms] TO: ${to} | MESSAGE: ${body}`);
  // Production: await twilioClient.messages.create({ to, from: process.env.TWILIO_FROM, body });
}

// ---------------------------------------------------------------------------
// Order notifications
// ---------------------------------------------------------------------------

/**
 * Notify a customer that their order has been received.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {Array}  params.items - [{ productName, quantity, unitPrice }]
 * @param {number} params.totalAmount
 */
function notifyOrderPlaced({ orderId, customerEmail, customerPhone, customerName, items = [], totalAmount }) {
  const itemLines = items
    .map((i) => `  - ${i.productName} x${i.quantity} @ £${(i.unitPrice / 100).toFixed(2)}`)
    .join('\n');

  const body =
    `Hi ${customerName},\n\n` +
    `Thank you for your order! We have received your order and are processing your payment.\n\n` +
    `Order reference: ${orderId}\n` +
    `Items:\n${itemLines}\n` +
    `Total: £${(totalAmount / 100).toFixed(2)}\n\n` +
    `We will notify you once your order is confirmed.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Order received — ${orderId}`, body });
  sendSms({ to: customerPhone, body: `Pet Store: Your order ${orderId} has been received. Total: £${(totalAmount / 100).toFixed(2)}. We'll be in touch shortly!` });
}

/**
 * Notify a customer that their order has been confirmed and payment taken.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {number} params.totalAmount
 */
function notifyOrderConfirmed({ orderId, customerEmail, customerPhone, customerName, totalAmount }) {
  const body =
    `Hi ${customerName},\n\n` +
    `Great news! Your order ${orderId} has been confirmed and payment of £${(totalAmount / 100).toFixed(2)} has been successfully processed.\n\n` +
    `Your order is now being prepared for dispatch. We will send you tracking information as soon as it ships.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Order confirmed — ${orderId}`, body });
  sendSms({ to: customerPhone, body: `Pet Store: Order ${orderId} confirmed! Payment of £${(totalAmount / 100).toFixed(2)} received. We'll notify you when it ships.` });
}

/**
 * Notify a customer that their order has been cancelled.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {string} params.cancellationReason
 */
function notifyOrderCancelled({ orderId, customerEmail, customerPhone, customerName, cancellationReason }) {
  const reasonText = cancellationReason ? `Reason: ${cancellationReason}\n\n` : '';

  const body =
    `Hi ${customerName},\n\n` +
    `We are sorry to inform you that your order ${orderId} has been cancelled.\n\n` +
    `${reasonText}` +
    `If a payment was taken, a full refund will be issued within 3–5 business days.\n\n` +
    `If you have any questions, please contact our support team.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Order cancelled — ${orderId}`, body });
  sendSms({ to: customerPhone, body: `Pet Store: Your order ${orderId} has been cancelled. Any payment will be refunded within 3-5 days. Sorry for the inconvenience.` });
}

// ---------------------------------------------------------------------------
// Payment notifications
// ---------------------------------------------------------------------------

/**
 * Notify a customer that their payment attempt has failed.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {string} params.failureReason
 */
function notifyPaymentFailed({ orderId, customerEmail, customerPhone, customerName, failureReason }) {
  const reasonText = failureReason ? `Reason: ${failureReason}\n\n` : '';

  const body =
    `Hi ${customerName},\n\n` +
    `Unfortunately, the payment for your order ${orderId} could not be processed.\n\n` +
    `${reasonText}` +
    `Please update your payment method or try again. If the problem persists, contact your bank or our support team.\n\n` +
    `Your order has been cancelled as a result.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Payment failed — order ${orderId}`, body });
  sendSms({ to: customerPhone, body: `Pet Store: Payment for order ${orderId} failed. Please update your payment method. Order has been cancelled.` });
}

// ---------------------------------------------------------------------------
// Shipment notifications
// ---------------------------------------------------------------------------

/**
 * Notify a customer that their shipment has been dispatched.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.shipmentId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {string} params.trackingReference
 * @param {string} params.carrier
 * @param {string} params.estimatedDeliveryDate
 */
function notifyShipmentDispatched({
  orderId,
  shipmentId,
  customerEmail,
  customerPhone,
  customerName,
  trackingReference,
  carrier,
  estimatedDeliveryDate,
}) {
  const trackingLine = trackingReference
    ? `Tracking reference: ${trackingReference} (${carrier || 'carrier'})\n`
    : '';
  const etaLine = estimatedDeliveryDate
    ? `Estimated delivery: ${estimatedDeliveryDate}\n`
    : '';

  const body =
    `Hi ${customerName},\n\n` +
    `Your order ${orderId} is on its way! Shipment ${shipmentId} has left our warehouse.\n\n` +
    `${trackingLine}` +
    `${etaLine}` +
    `\nYou can track your parcel using the reference above on the carrier's website.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Your order is on its way — ${orderId}`, body });
  sendSms({
    to: customerPhone,
    body: `Pet Store: Order ${orderId} dispatched! ${trackingReference ? `Track: ${trackingReference}. ` : ''}${estimatedDeliveryDate ? `ETA: ${estimatedDeliveryDate}.` : ''}`,
  });
}

/**
 * Notify a customer that their order has been delivered.
 * @param {object} params
 * @param {string} params.orderId
 * @param {string} params.shipmentId
 * @param {string} params.customerEmail
 * @param {string} params.customerPhone
 * @param {string} params.customerName
 * @param {string} params.deliveredAt
 */
function notifyShipmentDelivered({ orderId, shipmentId, customerEmail, customerPhone, customerName, deliveredAt }) {
  const deliveryLine = deliveredAt ? ` on ${deliveredAt}` : '';

  const body =
    `Hi ${customerName},\n\n` +
    `Great news! Your order ${orderId} has been delivered${deliveryLine}.\n\n` +
    `We hope you and your pet enjoy your new purchase! If you have any issues with your order, please contact our support team within 30 days.\n\n` +
    `We'd love to hear from you — leave a review to help other pet owners.\n\n` +
    `The Pet Store Team`;

  sendEmail({ to: customerEmail, subject: `Your order has been delivered — ${orderId}`, body });
  sendSms({ to: customerPhone, body: `Pet Store: Order ${orderId} has been delivered${deliveryLine}. Enjoy! 🐾` });
}

// ---------------------------------------------------------------------------
// Internal / operations notifications
// ---------------------------------------------------------------------------

/**
 * Send an internal low-stock alert to the operations team.
 * @param {object} params
 * @param {string} params.productId
 * @param {string} params.productName
 * @param {number} params.currentStock
 * @param {number} params.reorderThreshold
 */
function notifyInventoryLowStock({ productId, productName, currentStock, reorderThreshold }) {
  const body =
    `LOW STOCK ALERT\n\n` +
    `Product: ${productName} (ID: ${productId})\n` +
    `Current stock: ${currentStock} units\n` +
    `Reorder threshold: ${reorderThreshold} units\n\n` +
    `Please initiate a restock order as soon as possible to avoid stockouts.\n\n` +
    `Pet Store Inventory System`;

  sendEmail({
    to: OPS_ALERT_EMAIL,
    subject: `⚠ Low stock alert: ${productName} (${currentStock} remaining)`,
    body,
  });
}

module.exports = {
  notifyOrderPlaced,
  notifyOrderConfirmed,
  notifyOrderCancelled,
  notifyPaymentFailed,
  notifyShipmentDispatched,
  notifyShipmentDelivered,
  notifyInventoryLowStock,
};
