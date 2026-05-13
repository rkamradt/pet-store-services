'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * In-memory store for orders.
 * Key: orderId (string)
 * Value: Order object
 *
 * In a production deployment this would be replaced with a database
 * (e.g. PostgreSQL via an ORM or query builder).
 */
const ordersStore = new Map();

// ---------------------------------------------------------------------------
// Order status constants
// ---------------------------------------------------------------------------
const STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  FULFILLED: 'FULFILLED',
};

// ---------------------------------------------------------------------------
// Event publisher (stub — wire up a real message bus via MESSAGE_BUS_URL)
// ---------------------------------------------------------------------------
/**
 * Publishes a domain event.
 * Currently logs to stdout; replace with a real message bus client.
 *
 * @param {string} topic
 * @param {object} payload
 */
function publishEvent(topic, payload) {
  const envelope = {
    topic,
    timestamp: new Date().toISOString(),
    payload,
  };
  console.info(`[event:publish] ${topic}`, JSON.stringify(envelope));
  // TODO(infra): forward to MESSAGE_BUS_URL when available
}

// ---------------------------------------------------------------------------
// Helper — compute total from line items
// ---------------------------------------------------------------------------
function computeTotal(items) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * Place a new order.
 *
 * @param {{
 *   customerId: string,
 *   items: Array<{ productId: string, quantity: number, unitPrice: number }>,
 *   paymentMethodId: string,
 *   shippingAddress: {
 *     line1: string,
 *     line2?: string,
 *     city: string,
 *     postcode: string,
 *     country: string
 *   }
 * }} data
 * @returns {Promise<object>} The newly created order
 */
async function createOrder(data) {
  const { customerId, items, paymentMethodId, shippingAddress } = data;

  const now = new Date().toISOString();
  const orderId = uuidv4();
  const totalAmount = computeTotal(items);

  const order = {
    id: orderId,
    customerId,
    status: STATUS.PENDING,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    totalAmount,
    paymentMethodId,
    paymentChargeId: null,
    shippingAddress: {
      line1: shippingAddress.line1,
      line2: shippingAddress.line2 || null,
      city: shippingAddress.city,
      postcode: shippingAddress.postcode,
      country: shippingAddress.country,
    },
    cancellationReason: null,
    createdAt: now,
    updatedAt: now,
  };

  ordersStore.set(orderId, order);

  publishEvent('order.placed', {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
    paymentMethodId: order.paymentMethodId,
    placedAt: order.createdAt,
  });

  return order;
}

/**
 * Get a single order by ID.
 *
 * @param {string} orderId
 * @returns {Promise<object>}
 * @throws {{ status: 404, message: string }}
 */
async function getOrderById(orderId) {
  const order = ordersStore.get(orderId);
  if (!order) {
    const err = new Error(`Order not found: ${orderId}`);
    err.status = 404;
    throw err;
  }
  return order;
}

/**
 * List all orders for a given customer.
 *
 * @param {string} customerId
 * @returns {Promise<object[]>}
 */
async function listOrdersByCustomer(customerId) {
  const results = [];
  for (const order of ordersStore.values()) {
    if (order.customerId === customerId) {
      results.push(order);
    }
  }
  // Return newest first
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return results;
}

/**
 * Cancel an order and emit compensating event.
 *
 * Only orders in PENDING or CONFIRMED state may be cancelled.
 *
 * @param {string} orderId
 * @param {string} [reason]
 * @returns {Promise<object>} The updated order
 * @throws {{ status: 404 | 409, message: string }}
 */
async function cancelOrder(orderId, reason) {
  const order = await getOrderById(orderId);

  if (order.status === STATUS.CANCELLED) {
    const err = new Error('Order is already cancelled');
    err.status = 409;
    throw err;
  }

  if (order.status === STATUS.FULFILLED) {
    const err = new Error('Fulfilled orders cannot be cancelled');
    err.status = 409;
    throw err;
  }

  order.status = STATUS.CANCELLED;
  order.cancellationReason = reason || 'Cancelled by customer';
  order.updatedAt = new Date().toISOString();

  ordersStore.set(orderId, order);

  publishEvent('order.cancelled', {
    orderId: order.id,
    customerId: order.customerId,
    reason: order.cancellationReason,
    cancelledAt: order.updatedAt,
  });

  return order;
}

// ---------------------------------------------------------------------------
// Event consumer handlers
// ---------------------------------------------------------------------------

/**
 * Handle payment.charged event.
 * Advances the order to CONFIRMED state and emits order.confirmed.
 *
 * @param {{ orderId: string, chargeId: string }} payload
 * @returns {Promise<object>} Updated order
 */
async function handlePaymentCharged({ orderId, chargeId }) {
  let order;
  try {
    order = await getOrderById(orderId);
  } catch {
    console.warn(`[handlePaymentCharged] Unknown orderId: ${orderId}`);
    return null;
  }

  if (order.status !== STATUS.PENDING) {
    console.warn(
      `[handlePaymentCharged] Order ${orderId} is not PENDING (status=${order.status}), skipping`
    );
    return order;
  }

  const now = new Date().toISOString();
  order.status = STATUS.CONFIRMED;
  order.paymentChargeId = chargeId;
  order.updatedAt = now;

  ordersStore.set(orderId, order);

  publishEvent('order.confirmed', {
    orderId: order.id,
    customerId: order.customerId,
    paymentChargeId: order.paymentChargeId,
    confirmedAt: now,
  });

  return order;
}

/**
 * Handle payment.failed event.
 * Cancels the order and emits order.cancelled.
 *
 * @param {{ orderId: string, failureReason?: string }} payload
 * @returns {Promise<object|null>} Updated order or null if not found
 */
async function handlePaymentFailed({ orderId, failureReason }) {
  let order;
  try {
    order = await getOrderById(orderId);
  } catch {
    console.warn(`[handlePaymentFailed] Unknown orderId: ${orderId}`);
    return null;
  }

  if (order.status !== STATUS.PENDING) {
    console.warn(
      `[handlePaymentFailed] Order ${orderId} is not PENDING (status=${order.status}), skipping`
    );
    return order;
  }

  const reason = failureReason || 'Payment failed';
  const now = new Date().toISOString();

  order.status = STATUS.CANCELLED;
  order.cancellationReason = reason;
  order.updatedAt = now;

  ordersStore.set(orderId, order);

  publishEvent('order.cancelled', {
    orderId: order.id,
    customerId: order.customerId,
    reason: order.cancellationReason,
    cancelledAt: now,
  });

  return order;
}

/**
 * Handle shipment.dispatched event.
 * Advances the order to FULFILLED state and emits order.fulfilled.
 *
 * @param {{ orderId: string, shipmentId: string, dispatchedAt?: string }} payload
 * @returns {Promise<object|null>} Updated order or null if not found
 */
async function handleShipmentDispatched({ orderId, shipmentId, dispatchedAt }) {
  let order;
  try {
    order = await getOrderById(orderId);
  } catch {
    console.warn(`[handleShipmentDispatched] Unknown orderId: ${orderId}`);
    return null;
  }

  if (order.status !== STATUS.CONFIRMED) {
    console.warn(
      `[handleShipmentDispatched] Order ${orderId} is not CONFIRMED (status=${order.status}), skipping`
    );
    return order;
  }

  const now = dispatchedAt || new Date().toISOString();
  order.status = STATUS.FULFILLED;
  order.updatedAt = now;

  ordersStore.set(orderId, order);

  publishEvent('order.fulfilled', {
    orderId: order.id,
    customerId: order.customerId,
    shipmentId,
    fulfilledAt: now,
  });

  return order;
}

module.exports = {
  STATUS,
  createOrder,
  getOrderById,
  listOrdersByCustomer,
  cancelOrder,
  handlePaymentCharged,
  handlePaymentFailed,
  handleShipmentDispatched,
};
