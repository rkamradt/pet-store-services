'use strict';

const { validationResult } = require('express-validator');

/**
 * Reads the validation result accumulated by express-validator chains on the
 * current request.  If any validation errors are present the function throws a
 * structured error object that the central error-handler middleware will turn
 * into a 400 response.  When there are no errors the function returns cleanly
 * so the calling route handler can proceed.
 *
 * @param {import('express').Request} req - The Express request object.
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
