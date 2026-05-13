'use strict';

/**
 * Centralised Express error-handling middleware.
 * Must be mounted after all routes (4-argument signature).
 *
 * @param {Error & { status?: number, errors?: object[] }} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.errors || [];

  if (status >= 500) {
    console.error(`[inventory] Unhandled error: ${message}`, err);
  }

  res.status(status).json({
    error: message,
    details,
  });
}

module.exports = errorHandler;
