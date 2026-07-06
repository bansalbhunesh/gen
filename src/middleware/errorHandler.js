/**
 * Central error handling and 404 fallback.
 *
 * Guarantees a consistent JSON error shape and — importantly for security —
 * never leaks stack traces or internal messages for unexpected errors in
 * production. Known errors carry a `status`; everything else becomes a generic
 * 500.
 */
import logger from '../utils/logger.js';
import config from '../config.js';

/** 404 handler for unmatched routes. */
export function notFound(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

/**
 * Express error-handling middleware (must keep the 4-arg signature).
 * @param {Error & { status?: number, expose?: boolean }} err
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err.status) ? err.status : 500;

  if (status >= 500) {
    logger.error('Unhandled request error', { path: req.path, error: err.message });
  }

  // Client errors (4xx) carry safe, actionable messages. Server errors expose a
  // generic message unless we're explicitly in a non-production environment.
  const message =
    status < 500
      ? err.message
      : config.isProduction
        ? 'Internal server error'
        : err.message;

  res.status(status).json({ error: message });
}

export default { notFound, errorHandler };
