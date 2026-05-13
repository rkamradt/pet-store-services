'use strict';

const { Router } = require('express');
const { param, body } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const inventoryService = require('../services/inventory');

const router = Router();

/**
 * GET /inventory/low-stock
 * List all products whose stock level is at or below the reorder threshold.
 *
 * NOTE: This route MUST be declared before /inventory/:productId so that
 * Express does not treat the literal string "low-stock" as a productId param.
 */
router.get('/low-stock', async (req, res, next) => {
  try {
    const items = await inventoryService.getLowStockItems();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /inventory/:productId
 * Get current stock level for a product.
 */
router.get(
  '/:productId',
  [
    param('productId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('productId must be a non-empty string'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const item = await inventoryService.getStockLevel(req.params.productId);
      res.json(item);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /inventory/:productId
 * Manually adjust the stock level for a product.
 *
 * Body: { stockLevel: number (integer >= 0), reason?: string }
 */
router.put(
  '/:productId',
  [
    param('productId')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('productId must be a non-empty string'),

    body('stockLevel')
      .exists({ checkNull: true })
      .withMessage('stockLevel is required')
      .isInt({ min: 0 })
      .withMessage('stockLevel must be an integer >= 0'),

    body('reason')
      .optional()
      .isString()
      .trim()
      .withMessage('reason must be a string'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const { stockLevel, reason } = req.body;
      const updated = await inventoryService.adjustStockLevel(
        req.params.productId,
        parseInt(stockLevel, 10),
        reason || 'Manual adjustment'
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
