/**
 * Role-based access control middleware
 * Factory function that returns middleware checking for specific roles
 * 
 * @param {Array<string>} roles - Array of allowed roles
 * @returns {Function} Express middleware
 */
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            return next(new Error('Not authenticated'));
        }

        if (!roles.includes(req.user.role)) {
            res.status(403);
            return next(new Error('Access denied: insufficient permissions'));
        }

        next();
    };
};

module.exports = { requireRole };
