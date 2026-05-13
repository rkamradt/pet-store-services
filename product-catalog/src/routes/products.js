'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const productService = require('../services/products');

const router = Router();

// ─── Validation rule sets ────────────────────────────────────────────────────

const createRules = [
  body('name')
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name is required'),
  body('description')
    .isString().withMessage('description must be a string')
    .trim()
    .notEmpty().withMessage('description is required'),
  body('category')
    .isString().withMessage('category must be a string')
    .trim()
    .notEmpty().withMessage('category is required'),
  body('price')
    .isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('currency')
    .optional()
    .isISO4217().withMessage('currency must be a valid ISO 4217 code'),
  body('imageUrl')
    .optional()
    .isURL().withMessage('imageUrl must be a valid URL'),
  body('tags')
    .optional()
    .isArray().withMessage('tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('each tag must be a string'),
];

const updateRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('name')
    .optional()
    .isString().withMessage('name must be a string')
    .trim()
    .notEmpty().withMessage('name cannot be blank'),
  body('description')
    .optional()
    .isString().withMessage('description must be a string')
    .trim()
    .notEmpty().withMessage('description cannot be blank'),
  body('category')
    .optional()
    .isString().withMessage('category must be a string')
    .trim()
    .notEmpty().withMessage('category cannot be blank'),
  body('price')
    .optional()
    .isFloat({ gt: 0 }).withMessage('price must be a positive number'),
  body('currency')
    .optional()
    .isISO4217().withMessage('currency must be a valid ISO 4217 code'),
  body('imageUrl')
    .optional()
    .isURL().withMessage('imageUrl must be a valid URL'),
  body('tags')
    .optional()
    .isArray().withMessage('tags must be an array'),
  body('tags.*')
    .optional()
    .isString().withMessage('each tag must be a string'),
];

const idRule = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];

const listRules = [
  query('category')
    .optional()
    .isString().withMessage('category must be a string'),
];

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /products
 * List all products with optional filtering by category.
 */
router.get('/products', listRules, async (req, res, next) => {
  try {
    validateResult(req);
    const { category } = req.query;
    const products = await productService.listProducts({ category });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /products/:id
 * Get a single product by ID.
 */
router.get('/products/:id', idRule, async (req, res, next) => {
  try {
    validateResult(req);
    const product = await productService.getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /products
 * Create a new product.
 */
router.post('/products', createRules, async (req, res, next) => {
  try {
    validateResult(req);
    const product = await productService.createProduct(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /products/:id
 * Update an existing product.
 */
router.put('/products/:id', updateRules, async (req, res, next) => {
  try {
    validateResult(req);
    const product = await productService.updateProduct(req.params.id, req.body);
    res.json(product);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /products/:id
 * Remove a product from the catalog.
 */
router.delete('/products/:id', idRule, async (req, res, next) => {
  try {
    validateResult(req);
    await productService.deleteProduct(req.params.id);
    res.json({ message: `Product ${req.params.id} has been removed from the catalog.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
