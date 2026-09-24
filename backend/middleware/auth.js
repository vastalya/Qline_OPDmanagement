const jwt = require('jsonwebtoken');

/**
 * Verify JWT token from Authorization header
 * Attaches decoded user data to req.user
 */
const verifyToken = (req, res, next) => {
    let token;

    // Extract token from Authorization header
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401);
        return next(new Error('Not authorized, no token'));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401);
        next(error);
    }
};

module.exports = { verifyToken };
