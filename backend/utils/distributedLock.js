/**
 * Distributed Lock Stub — Redis/Redlock removed.
 * Uses a simple in-process Map for single-instance locking.
 * In a multi-instance deployment, use MongoDB TTL-indexed lock documents.
 */
const logger = require('./logger');

const activeLocks = new Map();

exports.acquireLock = async (resource, ttl = 5 * 60 * 1000) => {
    if (activeLocks.has(resource)) {
        const expiry = activeLocks.get(resource);
        if (Date.now() < expiry) {
            logger.debug(`Lock already held: ${resource}`);
            return null;
        }
        // Expired lock — clean it up
        activeLocks.delete(resource);
    }
    activeLocks.set(resource, Date.now() + ttl);
    logger.debug(`Lock acquired: ${resource}`);
    return { resource };
};

exports.releaseLock = async (lock) => {
    if (!lock) return;
    activeLocks.delete(lock.resource);
    logger.debug(`Lock released: ${lock.resource}`);
};

exports.withLock = async (resource, fn, ttl = 5 * 60 * 1000) => {
    const lock = await exports.acquireLock(resource, ttl);
    if (!lock) {
        return { skipped: true, reason: 'lock_held' };
    }
    try {
        const result = await fn();
        return { skipped: false, result };
    } finally {
        await exports.releaseLock(lock);
    }
};
