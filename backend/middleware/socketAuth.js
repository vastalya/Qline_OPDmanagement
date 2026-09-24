const jwt = require('jsonwebtoken');

/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from socket handshake and attaches user to socket
 */
const socketAuth = (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication token required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // Attach user to socket (includes userId, role, email)
        next();
    } catch (error) {
        next(new Error('Invalid or expired token'));
    }
};

module.exports = socketAuth;
