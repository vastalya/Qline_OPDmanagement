/**
 * Async handler wrapper to eliminate try-catch blocks in controllers
 * Automatically catches errors and forwards them to the error handler middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
