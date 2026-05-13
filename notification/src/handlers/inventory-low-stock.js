const { notifyInventoryLowStock } = require('../services/notification');

/**
 * Handler for topic: inventory.low-stock
 *
 * Expected payload shape:
 * {
 *   productId: string,
 *   productName: string,
 *   currentStock: number,
 *   reorderThreshold: number
 * }
 *
 * This notification goes to the internal operations team, not to a customer,
 * so no Customer service call is required.
 *
 * @param {object} payload
 * @returns {null} — this handler produces no outbound Kafka events
 */
async function handle(payload) {
  const { productId, productName, currentStock, reorderThreshold } = payload;

  if (!productId) {
    console.warn('[inventory-low-stock] missing productId, skipping notification');
    return null;
  }

  notifyInventoryLowStock({
    productId,
    productName: productName || `Product ${productId}`,
    currentStock: currentStock ?? 0,
    reorderThreshold: reorderThreshold ?? 0,
  });

  return null;
}

module.exports = { handle };
