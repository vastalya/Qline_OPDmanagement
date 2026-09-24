const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 * Applied to all /api/* routes
 * Using memory store (can be upgraded to Redis later)
 * Much more lenient in development
 */
const isDev = process.env.NODE_ENV === 'development';
exports.apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || (isDev ? 60 * 60 * 1000 : 15 * 60 * 1000), // 1 hour (dev) or 15 min (prod)
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || (isDev ? 10000 : 100), // 10k requests (dev) or 100 (prod)
    skip: (req) => {
        // Skip rate limiting for auth routes in development
        if (isDev && req.path.includes('/auth/')) {
            return true;
        }
        return false;
    },
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            error: 'Too many requests from this IP, please try again later.'
        });
    }
});

/**
 * Strict rate limiter for sensitive endpoints
 * More lenient in development mode for testing
 */
exports.strictLimiter = rateLimit({
    windowMs: isDev ? 60 * 60 * 1000 : 15 * 60 * 1000, // 1 hour (dev) or 15 min (prod)
    max: isDev ? 100 : 5, // 100 attempts (dev) or 5 (prod)
    skipSuccessfulRequests: false,
    skip: (req) => isDev, // Skip strict rate limiting entirely in dev mode
    message: {
        success: false,
        error: 'Too many login attempts, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Strict rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
        res.status(429).json({
            success: false,
            error: 'Too many attempts from this IP, please try again after 15 minutes.'
        });
    }
});

/**
 * Booking rate limiter
 */
exports.bookingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many booking attempts, please slow down.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn(`Booking rate limit exceeded for user: ${req.user?.userId}, IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            error: 'Too many booking attempts, please try again in a few minutes.'
        });
    }
});

logger.info('✅ Rate limiters initialized (using memory store)');
