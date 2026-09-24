/**
 * Email Queue — MongoDB-based (Redis/BullMQ removed)
 */
const { addJob } = require('../models/JobQueue');
const logger = require('../utils/logger');

const emailQueue = {
    name: 'email',

    async add(type, data, options = {}) {
        try {
            const job = await addJob('email', type, data, { maxAttempts: options.attempts || 3 });
            logger.debug(`Email job queued: ${type} → ${data.to}`);
            return job;
        } catch (error) {
            logger.error('Failed to queue email job:', error.message);
            throw error;
        }
    }
};

module.exports = emailQueue;
