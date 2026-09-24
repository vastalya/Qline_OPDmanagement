const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit Middleware
 * Logs all admin actions with before/after snapshots
 */
const auditMiddleware = (action, entityType) => {
    return async (req, res, next) => {
        // Store original json method
        const originalJson = res.json;

        // Capture request body (before state)
        const requestBody = { ...req.body };
        const requestParams = { ...req.params };
        const requestQuery = { ...req.query };

        // Override res.json to capture response
        res.json = function (data) {
            // Log audit trail
            (async () => {
                try {
                    const auditData = {
                        userId: req.user?.userId,
                        action,
                        entityType,
                        entityId: requestParams.id || data?._id || data?.id,
                        changes: {
                            before: requestBody,
                            after: data
                        },
                        ipAddress: req.ip || req.connection.remoteAddress,
                        userAgent: req.get('user-agent'),
                        status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failure',
                        errorMessage: data?.error || null
                    };

                    await AuditLog.create(auditData);
                    logger.info(`Audit: ${req.user?.userId} ${action} ${entityType} ${auditData.status}`);
                } catch (error) {
                    logger.error('Error creating audit log:', error);
                }
            })();

            // Call original json method
            return originalJson.call(this, data);
        };

        next();
    };
};

module.exports = auditMiddleware;
