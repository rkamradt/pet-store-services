'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validateResult } = require('../middleware/validate');
const customerService = require('../services/customers');

const router = Router();

// ---------------------------------------------------------------------------
// Validation rule sets
// ---------------------------------------------------------------------------

const customerCreateRules = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('firstName is required'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('lastName is required'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('email is required')
    .isEmail()
    .withMessage('email must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('phone must be a valid phone number'),
  body('address').optional().isObject().withMessage('address must be an object'),
  body('address.line1').optional().trim().notEmpty().withMessage('address.line1 must not be blank'),
  body('address.city').optional().trim().notEmpty().withMessage('address.city must not be blank'),
  body('address.postcode').optional().trim().notEmpty().withMessage('address.postcode must not be blank'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('address.country must be a 2-letter ISO country code'),
  body('preferences').optional().isObject().withMessage('preferences must be an object'),
  body('preferences.marketingEmailsOptIn')
    .optional()
    .isBoolean()
    .withMessage('preferences.marketingEmailsOptIn must be a boolean'),
  body('preferences.smsAlertsOptIn')
    .optional()
    .isBoolean()
    .withMessage('preferences.smsAlertsOptIn must be a boolean'),
  body('preferences.favouriteCategories')
    .optional()
    .isArray()
    .withMessage('preferences.favouriteCategories must be an array'),
];

const customerUpdateRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('firstName').optional().trim().notEmpty().withMessage('firstName must not be blank'),
  body('lastName').optional().trim().notEmpty().withMessage('lastName must not be blank'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('email must be a valid email address'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('phone must be a valid phone number'),
  body('address').optional().isObject().withMessage('address must be an object'),
  body('address.line1').optional().trim().notEmpty().withMessage('address.line1 must not be blank'),
  body('address.city').optional().trim().notEmpty().withMessage('address.city must not be blank'),
  body('address.postcode').optional().trim().notEmpty().withMessage('address.postcode must not be blank'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 })
    .withMessage('address.country must be a 2-letter ISO country code'),
  body('preferences').optional().isObject().withMessage('preferences must be an object'),
  body('preferences.marketingEmailsOptIn')
    .optional()
    .isBoolean()
    .withMessage('preferences.marketingEmailsOptIn must be a boolean'),
  body('preferences.smsAlertsOptIn')
    .optional()
    .isBoolean()
    .withMessage('preferences.smsAlertsOptIn must be a boolean'),
  body('preferences.favouriteCategories')
    .optional()
    .isArray()
    .withMessage('preferences.favouriteCategories must be an array'),
];

const petCreateRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  body('name').trim().notEmpty().withMessage('name is required'),
  body('species').trim().notEmpty().withMessage('species is required'),
  body('breed').optional().trim().notEmpty().withMessage('breed must not be blank'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('dateOfBirth must be a valid ISO 8601 date'),
  body('notes').optional().trim(),
];

const petUpdateRules = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
  param('petId').isUUID().withMessage('petId must be a valid UUID'),
  body('name').optional().trim().notEmpty().withMessage('name must not be blank'),
  body('species').optional().trim().notEmpty().withMessage('species must not be blank'),
  body('breed').optional().trim().notEmpty().withMessage('breed must not be blank'),
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('dateOfBirth must be a valid ISO 8601 date'),
  body('notes').optional().trim(),
];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * POST /customers
 * Register a new customer account.
 */
router.post('/customers', customerCreateRules, async (req, res, next) => {
  try {
    validateResult(req);
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /customers/:id
 * Get a customer profile by ID.
 */
router.get(
  '/customers/:id',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const customer = await customerService.getCustomerById(req.params.id);
      res.json(customer);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /customers/:id
 * Update customer account details.
 */
router.put('/customers/:id', customerUpdateRules, async (req, res, next) => {
  try {
    validateResult(req);
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /customers/:id/pets
 * Add a pet profile to a customer account.
 */
router.post('/customers/:id/pets', petCreateRules, async (req, res, next) => {
  try {
    validateResult(req);
    const pet = await customerService.addPet(req.params.id, req.body);
    res.status(201).json(pet);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /customers/:id/pets
 * List all pet profiles for a customer.
 */
router.get(
  '/customers/:id/pets',
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  async (req, res, next) => {
    try {
      validateResult(req);
      const pets = await customerService.listPets(req.params.id);
      res.json(pets);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PUT /customers/:id/pets/:petId
 * Update a pet profile.
 */
router.put('/customers/:id/pets/:petId', petUpdateRules, async (req, res, next) => {
  try {
    validateResult(req);
    const pet = await customerService.updatePet(req.params.id, req.params.petId, req.body);
    res.json(pet);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /customers/:id/pets/:petId
 * Remove a pet profile.
 */
router.delete(
  '/customers/:id/pets/:petId',
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    param('petId').isUUID().withMessage('petId must be a valid UUID'),
  ],
  async (req, res, next) => {
    try {
      validateResult(req);
      await customerService.deletePet(req.params.id, req.params.petId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
