'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * In-memory store for shipment records.
 *
 * Each record shape:
 * {
 *   id:            string   — UUID primary key
 *   orderId:       string   — ID of the originating order
 *   customerId:    string   — ID of the customer who placed the order
 *   status:        'CREATED' | 'DISPATCHED' | 'DELIVERED'
 *   address: {
 *     line1:       string
 *     line2:       string | null
 *     city:        string
 *     postcode:    string
 *     country:     string
 *   }
 *   items: Array<{ productId: string, quantity: number }>
 *   trackingNumber: string | null
 *   carrier:        string | null
 *   createdAt:      string  — ISO 8601
 *   dispatchedAt:   string | null
 *   deliveredAt:    string | null
 * }
 */
const store = new Map();

// ---------------------------------------------------------------------------
// Event emission helper (stubbed — replace with a real message broker client)
// ---------------------------------------------------------------------------

/**
 * Publishes a domain event.  In this implementation we log the event to
 * stdout; swap the body for a real Kafka/RabbitMQ/SNS publish call when a
 * broker is available.
 *
 * @param {string} topic
 * @param {object} payload
 */
function emit(topic, payload) {
  console.info(`[event] topic=${topic}`, JSON.stringify(payload));
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Create a new shipment for a confirmed order.
 *
 * @param {{
 *   orderId:    string,
 *   customerId: string,
 *   address:    { line1: string, line2?: string, city: string, postcode: string, country: string },
 *   items:      Array<{ productId: string, quantity: number }>
 * }} data
 * @returns {Promise<object>} The newly created shipment record.
 */
async function createShipment(data) {
  const { orderId, customerId, address, items } = data;

  // Reject duplicate shipments for the same order.
  for (const shipment of store.values()) {
    if (shipment.orderId === orderId) {
      const err = new Error(`A shipment for order ${orderId} already exists`);
      err.status = 409;
      throw err;
    }
  }

  const now = new Date().toISOString();
  const shipment = {
    id: uuidv4(),
    orderId,
    customerId,
    status: 'CREATED',
    address: {
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      postcode: address.postcode,
      country: address.country,
    },
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    trackingNumber: null,
    carrier: null,
    createdAt: now,
    dispatchedAt: null,
    deliveredAt: null,
  };

  store.set(shipment.id, shipment);

  emit('shipment.created', {
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    customerId: shipment.customerId,
    address: shipment.address,
    items: shipment.items,
    status: shipment.status,
    createdAt: shipment.createdAt,
  });

  return shipment;
}

/**
 * Retrieve a single shipment by its ID.
 *
 * @param {string} id
 * @returns {Promise<object>} The shipment record.
 * @throws {Error} 404 if not found.
 */
async function getShipmentById(id) {
  const shipment = store.get(id);
  if (!shipment) {
    const err = new Error(`Shipment ${id} not found`);
    err.status = 404;
    throw err;
  }
  return shipment;
}

/**
 * Mark a shipment as dispatched.
 *
 * Allowed only when the shipment is in CREATED status.
 *
 * @param {string} id
 * @param {{ trackingNumber: string, carrier: string }} data
 * @returns {Promise<object>} The updated shipment record.
 * @throws {Error} 404 if not found; 409 if status transition is invalid.
 */
async function dispatchShipment(id, data) {
  const shipment = await getShipmentById(id);

  if (shipment.status !== 'CREATED') {
    const err = new Error(
      `Cannot dispatch shipment ${id} — current status is ${shipment.status}`
    );
    err.status = 409;
    throw err;
  }

  const now = new Date().toISOString();
  shipment.status = 'DISPATCHED';
  shipment.trackingNumber = data.trackingNumber;
  shipment.carrier = data.carrier;
  shipment.dispatchedAt = now;

  store.set(id, shipment);

  emit('shipment.dispatched', {
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    customerId: shipment.customerId,
    trackingNumber: shipment.trackingNumber,
    carrier: shipment.carrier,
    status: shipment.status,
    dispatchedAt: shipment.dispatchedAt,
  });

  return shipment;
}

/**
 * Mark a shipment as delivered.
 *
 * Allowed only when the shipment is in DISPATCHED status.
 *
 * @param {string} id
 * @returns {Promise<object>} The updated shipment record.
 * @throws {Error} 404 if not found; 409 if status transition is invalid.
 */
async function deliverShipment(id) {
  const shipment = await getShipmentById(id);

  if (shipment.status !== 'DISPATCHED') {
    const err = new Error(
      `Cannot deliver shipment ${id} — current status is ${shipment.status}`
    );
    err.status = 409;
    throw err;
  }

  const now = new Date().toISOString();
  shipment.status = 'DELIVERED';
  shipment.deliveredAt = now;

  store.set(id, shipment);

  emit('shipment.delivered', {
    shipmentId: shipment.id,
    orderId: shipment.orderId,
    customerId: shipment.customerId,
    status: shipment.status,
    deliveredAt: shipment.deliveredAt,
  });

  return shipment;
}

/**
 * Handle the order.confirmed domain event consumed from the message broker.
 *
 * Automatically creates a shipment when an order is confirmed so that the
 * warehouse can begin fulfilment without manual intervention.
 *
 * @param {{
 *   orderId:    string,
 *   customerId: string,
 *   address:    object,
 *   items:      Array<{ productId: string, quantity: number }>
 * }} event
 * @returns {Promise<object>} The newly created shipment record.
 */
async function handleOrderConfirmed(event) {
  console.info('[consumer] order.confirmed received for orderId=', event.orderId);
  return createShipment({
    orderId: event.orderId,
    customerId: event.customerId,
    address: event.address,
    items: event.items,
  });
}

module.exports = {
  createShipment,
  getShipmentById,
  dispatchShipment,
  deliverShipment,
  handleOrderConfirmed,
};
