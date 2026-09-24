/**
 * Analytics Queue — MongoDB-based (Redis/BullMQ removed)
 */
const { addJob } = require('../models/JobQueue');
const logger = require('../utils/logger');

const analyticsQueue = {
    name: 'analytics',

    async add(type, data, options = {}) {
        try {
            const job = await addJob('analytics', type, data, { maxAttempts: options.attempts || 3 });
            logger.debug(`Analytics job queued: ${type}`);
            return job;
        } catch (error) {
            logger.error('Failed to queue analytics job:', error.message);
            throw error;
        }
    }
};

module.exports = analyticsQueue;
