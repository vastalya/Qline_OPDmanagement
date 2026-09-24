/**
 * Notification Queue — MongoDB-based (Redis/BullMQ removed)
 */
const { addJob } = require('../models/JobQueue');
const logger = require('../utils/logger');

const notificationQueue = {
    name: 'notifications',

    async add(type, data, options = {}) {
        try {
            const job = await addJob('notifications', type, data, { maxAttempts: options.attempts || 3 });
            logger.debug(`Notification job queued: ${type} for user ${data.userId}`);
            return job;
        } catch (error) {
            logger.error('Failed to queue notification job:', error.message);
            throw error;
        }
    }
};

module.exports = notificationQueue;
