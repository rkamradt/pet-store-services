'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * In-memory store for inventory records.
 *
 * Each record has the shape:
 * {
 *   productId:        string   — references a product in the ProductCatalog
 *   stockLevel:       number   — current units available
 *   reorderThreshold: number   — alert threshold (low-stock event fires when stockLevel <= this)
 *   lastUpdatedAt:    string   — ISO-8601 timestamp of the last stock change
 *   lastUpdatedBy:    string   — free-text reason / source of the last change
 * }
 *
 * Seeded with a handful of realistic product UUIDs so the service is usable
 * out of the box during development.
 */
const inventoryStore = new Map([
  [
    'prod-001',
    {
      productId: 'prod-001',
      stockLevel: 120,
      reorderThreshold: 20,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'seed',
    },
  ],
  [
    'prod-002',
    {
      productId: 'prod-002',
      stockLevel: 8,
      reorderThreshold: 15,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'seed',
    },
  ],
  [
    'prod-003',
    {
      productId: 'prod-003',
      stockLevel: 55,
      reorderThreshold: 10,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'seed',
    },
  ],
]);

/** Default reorder threshold applied when a new inventory record is created. */
const DEFAULT_REORDER_THRESHOLD = parseInt(process.env.REORDER_THRESHOLD || '10', 10);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Emit an inventory.updated event (stub — replace with real broker publish).
 */
function emitInventoryUpdated(productId, previousStockLevel, newStockLevel, reason) {
  const event = {
    eventId: uuidv4(),
    topic: 'inventory.updated',
    timestamp: new Date().toISOString(),
    productId,
    previousStockLevel,
    newStockLevel,
    reason,
  };
  console.log(`[inventory] EVENT ${event.topic}:`, JSON.stringify(event));
  // TODO: publish to message broker
}

/**
 * Emit an inventory.low-stock event (stub — replace with real broker publish).
 */
function emitInventoryLowStock(productId, stockLevel, reorderThreshold) {
  const event = {
    eventId: uuidv4(),
    topic: 'inventory.low-stock',
    timestamp: new Date().toISOString(),
    productId,
    stockLevel,
    reorderThreshold,
  };
  console.log(`[inventory] EVENT ${event.topic}:`, JSON.stringify(event));
  // TODO: publish to message broker
}

/**
 * Retrieve an existing record, or create a new one with zero stock.
 */
function getOrCreateRecord(productId) {
  if (!inventoryStore.has(productId)) {
    inventoryStore.set(productId, {
      productId,
      stockLevel: 0,
      reorderThreshold: DEFAULT_REORDER_THRESHOLD,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: 'auto-created',
    });
  }
  return inventoryStore.get(productId);
}

// ---------------------------------------------------------------------------
// Exported service functions (no HTTP knowledge)
// ---------------------------------------------------------------------------

/**
 * Return the current inventory record for a product.
 *
 * @param {string} productId
 * @returns {Promise<object>}
 * @throws {{ status: 404, message: string }}
 */
async function getStockLevel(productId) {
  const record = inventoryStore.get(productId);
  if (!record) {
    const err = new Error(`Inventory record not found for productId: ${productId}`);
    err.status = 404;
    throw err;
  }
  return { ...record };
}

/**
 * Manually set the stock level for a product.
 * Creates a new inventory record if one does not already exist.
 * Emits inventory.updated (and inventory.low-stock if threshold is breached).
 *
 * @param {string} productId
 * @param {number} newStockLevel — must be integer >= 0
 * @param {string} reason
 * @returns {Promise<object>} updated inventory record
 */
async function adjustStockLevel(productId, newStockLevel, reason) {
  const record = getOrCreateRecord(productId);
  const previousStockLevel = record.stockLevel;

  record.stockLevel = newStockLevel;
  record.lastUpdatedAt = new Date().toISOString();
  record.lastUpdatedBy = reason;

  emitInventoryUpdated(productId, previousStockLevel, newStockLevel, reason);

  if (newStockLevel <= record.reorderThreshold) {
    emitInventoryLowStock(productId, newStockLevel, record.reorderThreshold);
  }

  return { ...record };
}

/**
 * Return all inventory records whose stock level is at or below their
 * individual reorder threshold.
 *
 * @returns {Promise<object[]>}
 */
async function getLowStockItems() {
  const lowStock = [];
  for (const record of inventoryStore.values()) {
    if (record.stockLevel <= record.reorderThreshold) {
      lowStock.push({ ...record });
    }
  }
  return lowStock;
}

/**
 * Decrement stock for each line item in a placed order.
 * Called by the order.placed event consumer.
 * Clamps stock to 0 if the decrement would produce a negative value.
 *
 * @param {string} orderId
 * @param {{ productId: string, quantity: number }[]} lineItems
 * @returns {Promise<void>}
 */
async function decrementStockForOrder(orderId, lineItems) {
  for (const { productId, quantity } of lineItems) {
    const record = getOrCreateRecord(productId);
    const previousStockLevel = record.stockLevel;
    const newStockLevel = Math.max(0, record.stockLevel - quantity);

    record.stockLevel = newStockLevel;
    record.lastUpdatedAt = new Date().toISOString();
    record.lastUpdatedBy = `order.placed orderId=${orderId}`;

    emitInventoryUpdated(
      productId,
      previousStockLevel,
      newStockLevel,
      `Stock decremented by ${quantity} for orderId=${orderId}`
    );

    if (newStockLevel <= record.reorderThreshold) {
      emitInventoryLowStock(productId, newStockLevel, record.reorderThreshold);
    }
  }
}

/**
 * Restore stock for each line item in a cancelled order.
 * Called by the order.cancelled event consumer.
 *
 * @param {string} orderId
 * @param {{ productId: string, quantity: number }[]} lineItems
 * @returns {Promise<void>}
 */
async function restoreStockForOrder(orderId, lineItems) {
  for (const { productId, quantity } of lineItems) {
    const record = getOrCreateRecord(productId);
    const previousStockLevel = record.stockLevel;
    const newStockLevel = record.stockLevel + quantity;

    record.stockLevel = newStockLevel;
    record.lastUpdatedAt = new Date().toISOString();
    record.lastUpdatedBy = `order.cancelled orderId=${orderId}`;

    emitInventoryUpdated(
      productId,
      previousStockLevel,
      newStockLevel,
      `Stock restored by ${quantity} for cancelled orderId=${orderId}`
    );
  }
}

module.exports = {
  getStockLevel,
  adjustStockLevel,
  getLowStockItems,
  decrementStockForOrder,
  restoreStockForOrder,
};
