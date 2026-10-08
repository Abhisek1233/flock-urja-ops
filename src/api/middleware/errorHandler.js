/**
 * Global Express error handling middleware ensuring consistent JSON error responses:
 * {
 *   "error": {
 *     "code": "STRING_ERROR_CODE",
 *     "message": "Human readable description",
 *     "details": ...
 *   }
 * }
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || (status === 404 ? 'NOT_FOUND' : status === 400 ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR');
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || null;

  if (status >= 500) {
    console.error(`[API Error] ${req.method} ${req.originalUrl} -`, err);
  }

  res.status(status).json({
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

module.exports = { errorHandler };
