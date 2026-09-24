const logger = require('../utils/logger');

/**
 * IP Whitelist Middleware
 * Restricts access to specific IP addresses
 * Uses 'trust proxy' setting in Express if behind a proxy
 */
const ipWhitelist = (allowedIps = []) => {
    // If no IPs configured, allow all (or block all depending on security stance)
    // Here we warn but allow in development, block in production if empty
    if (!allowedIps || allowedIps.length === 0) {
        if (process.env.NODE_ENV === 'production') {
            logger.warn('⚠️  IP Whitelist middleware enabled but no IPs configured. Blocking all access.');
        }
        // In dev, we might proceed or return logic below
    }

    return (req, res, next) => {
        // Get client IP
        // x-forwarded-for: client, proxy1, proxy2
        const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

        // Check against allowed IPs
        // Supports basic string matching for now (CIDR support can be added if needed)
        const isAllowed = allowedIps.includes(clientIp) ||
            clientIp === '::1' ||
            clientIp === '127.0.0.1';

        if (isAllowed) {
            next();
        } else {
            logger.warn(`🚫 Access denied for IP: ${clientIp} on ${req.originalUrl}`);
            res.status(403).json({
                success: false,
                message: 'Access denied: Unlimited IP address'
            });
        }
    };
};

module.exports = ipWhitelist;
