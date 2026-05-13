'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const shipmentsService = require('../services/shipments');

const router = Router();

// ---------------------------------------------------------------------------
// POST /shipments — Create a new shipment for a confirmed order
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    body('orderId')
      .isString()
      .notEmpty()
      .withMessage('orderId is required'),
    body('customerId')
      .isString()
      .notEmpty()
      .withMessage('customerId is required'),
    body('address')
      .isObject()
      .withMessage('address must be an object'),
    body('address.line1')
      .isString()
      .notEmpty()
      .withMessage('address.line1 is required'),
    body('address.line2')
      .optional()
      .isString(),
    body('address.city')
      .isString()
      .notEmpty()
      .withMessage('address.city is required'),
    body('address.postcode')
      .isString()
      .notEmpty()
      .withMessage('address.postcode is required'),
    body('address.country')
      .isString()
      .notEmpty()
      .withMessage('address.country is required'),
    body('items')
      .isArray({ min: 1 })
      .withMessage('items must be a non-empty array'),
    body('items.*.productId')
      .isString()
      .notEmpty()
      .withMessage('Each item must have a productId'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Each item must have a quantity of at least 1'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const shipment = await shipmentsService.createShipment(req.body);
      res.status(201).json(shipment);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /shipments/:id — Get shipment details and current tracking status
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const shipment = await shipmentsService.getShipmentById(req.params.id);
      res.json(shipment);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /shipments/:id/dispatch — Mark a shipment as dispatched
// ---------------------------------------------------------------------------
router.put(
  '/:id/dispatch',
  [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
    body('trackingNumber')
      .isString()
      .notEmpty()
      .withMessage('trackingNumber is required'),
    body('carrier')
      .isString()
      .notEmpty()
      .withMessage('carrier is required'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const shipment = await shipmentsService.dispatchShipment(req.params.id, req.body);
      res.json(shipment);
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// PUT /shipments/:id/deliver — Mark a shipment as delivered
// ---------------------------------------------------------------------------
router.put(
  '/:id/deliver',
  [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      const shipment = await shipmentsService.deliverShipment(req.params.id);
      res.json(shipment);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
