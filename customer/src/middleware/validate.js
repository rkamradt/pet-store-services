'use strict';

const { validationResult } = require('express-validator');

/**
 * Inspects the result of express-validator checks accumulated on the request.
 * Throws a structured error with status 400 if any validation failures exist.
 *
 * @param {import('express').Request} req
 * @throws {{ status: number, message: string, errors: object[] }}
 */
function validateResult(req) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const err = new Error('Validation failed');
    err.status = 400;
    err.errors = result.array();
    throw err;
  }
}

module.exports = { validateResult };
