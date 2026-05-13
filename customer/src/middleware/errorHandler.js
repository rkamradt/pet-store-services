'use strict';

/**
 * Central Express error handler.
 * Must be registered LAST with app.use() so that it catches errors forwarded
 * by next(err) from any route or middleware above it.
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
    console.error(`[customer] Unhandled error (${status}):`, err);
  }

  res.status(status).json({
    error: message,
    details,
  });
}

module.exports = errorHandler;
