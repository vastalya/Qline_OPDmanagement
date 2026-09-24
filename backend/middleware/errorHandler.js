/**
 * Centralized error handling middleware
 * Must be placed after all routes
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message;

    // MongoDB duplicate key error
    if (err.code === 11000) {
        statusCode = 400;
        const field = Object.keys(err.keyPattern)[0];
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    }

    // MongoDB validation error
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((val) => val.message)
            .join(', ');
    }

    if (err.name === 'CastError') {
        statusCode = 400;
        message = `Invalid ${err.path || 'request parameter'}`;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    const mongoMessage = err?.message || '';
    if (
        mongoMessage.includes('WriteConflict') ||
        mongoMessage.includes('NoSuchTransaction') ||
        mongoMessage.includes('TransientTransactionError') ||
        mongoMessage.includes('Cannot use a session that has ended')
    ) {
        statusCode = 503;
        message = 'Database operation could not be completed. Please retry.';
    }

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;
