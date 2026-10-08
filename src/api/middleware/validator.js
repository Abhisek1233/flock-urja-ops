const { z } = require('zod');

/**
 * Middleware factory that validates request query parameters against a Zod schema.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const issues = result.error.issues.map(i => ({
        parameter: i.path.join('.'),
        message: i.message
      }));
      const err = new Error('Invalid query parameters');
      err.status = 400;
      err.code = 'INVALID_QUERY_PARAMS';
      err.details = issues;
      return next(err);
    }
    req.validatedQuery = result.data;
    next();
  };
}

/**
 * Middleware factory that validates request path parameters against a Zod schema.
 */
function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const issues = result.error.issues.map(i => ({
        parameter: i.path.join('.'),
        message: i.message
      }));
      const err = new Error('Invalid path parameters');
      err.status = 400;
      err.code = 'INVALID_PATH_PARAMS';
      err.details = issues;
      return next(err);
    }
    req.validatedParams = result.data;
    next();
  };
}

module.exports = {
  validateQuery,
  validateParams
};
