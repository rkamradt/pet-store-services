'use strict';

/**
 * Central Express error handler.
 * Must be mounted AFTER all routes (4-argument signature required by Express).
 *
 * @param {Error & { status?: number, errors?: object[] }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status === 500) {
    console.error('[product-catalog] Unhandled error:', err);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.errors || [],
  });
}

module.exports = errorHandler;
