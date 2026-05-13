'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const orderService = require('../services/orders');

const router = Router();

// ---------------------------------------------------------------------------
// Validation rule sets
// ---------------------------------------------------------------------------

const orderItemRules = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array'),
  body('items.*.productId')
    .isString()
    .notEmpty()
    .withMessage('Each item must have a non-empty productId'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Each item quantity must be an integer >= 1'),
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Each item unitPrice must be a number >= 0'),
];

const placeOrderRules = [
  body('customerId')
    .isString()
    .notEmpty()
    .withMessage('customerId is required'),
  body('paymentMethodId')
    .isString()
    .notEmpty()
    .withMessage('paymentMethodId is required'),
  body('shippingAddress')
    .isObject()
    .withMessage('shippingAddress must be an object'),
  body('shippingAddress.line1')
    .isString()
    .notEmpty()
    .withMessage('shippingAddress.line1 is required'),
  body('shippingAddress.city')
    .isString()
    .notEmpty()
    .withMessage('shippingAddress.city is required'),
  body('shippingAddress.postcode')
    .isString()
    .notEmpty()
    .withMessage('shippingAddress.postcode is required'),
  body('shippingAddress.country')
    .isString()
    .notEmpty()
    .withMessage('shippingAddress.country is required'),
  ...orderItemRules,
];

const cancelOrderRules = [
  param('id').isString().notEmpty().withMessage('id param is required'),
  body('reason')
    .optional()
    .isString()
    .withMessage('reason must be a string if provided'),
];

// ---------------------------------------------------------------------------
// IMPORTANT: static path /customer/:customerId must be declared before /:id
// so Express does not match "customer" as an :id value.
// ---------------------------------------------------------------------------

/**
 * GET /orders/customer/:customerId
 * List all orders for a specific customer.
 */
router.get('/orders/customer/:customerId', async (req, res, next) => {
  try {
    const { customerId } = req.params;
    if (!customerId) {
      const err = new Error('customerId param is required');
      err.status = 400;
      throw err;
    }
    const orders = await orderService.listOrdersByCustomer(customerId);
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /orders
 * Place a new order.
 */
router.post('/orders', placeOrderRules, async (req, res, next) => {
  try {
    validateResult(req);
    const { customerId, items, paymentMethodId, shippingAddress } = req.body;
    const order = await orderService.createOrder({
      customerId,
      items,
      paymentMethodId,
      shippingAddress,
    });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /orders/:id
 * Get order details and current status.
 */
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /orders/:id/cancel
 * Cancel an order and trigger compensating transactions.
 */
router.post('/orders/:id/cancel', cancelOrderRules, async (req, res, next) => {
  try {
    validateResult(req);
    const { id } = req.params;
    const { reason } = req.body;
    const order = await orderService.cancelOrder(id, reason);
    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
