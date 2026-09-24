/**
 * Reminder Queue — MongoDB-based (Redis/BullMQ removed)
 */
const { addJob } = require('../models/JobQueue');
const logger = require('../utils/logger');

const reminderQueue = {
    name: 'reminders',

    async add(type, data, options = {}) {
        try {
            const job = await addJob('reminders', type, data, {
                maxAttempts: options.attempts || 2,
                delay: options.delay || 0
            });
            logger.debug(`Reminder job queued: ${type}`);
            return job;
        } catch (error) {
            logger.error('Failed to queue reminder job:', error.message);
            throw error;
        }
    }
};

module.exports = reminderQueue;
