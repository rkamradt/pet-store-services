'use strict';

/**
 * Central Express error-handling middleware.
 *
 * Must be mounted LAST (after all routes) so that errors thrown or passed via
 * next(err) from any route handler are caught here.
 *
 * @param {Error & { status?: number; errors?: object[] }} err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Log unexpected server errors so they are visible in container logs.
  if (status >= 500) {
    console.error('[error]', err);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    details: err.errors || [],
  });
}

module.exports = errorHandler;
