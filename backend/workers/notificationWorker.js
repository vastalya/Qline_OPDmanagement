/**
 * Notification Worker — MongoDB-based (Redis/BullMQ removed)
 * Polls the MongoDB job queue and processes notification jobs.
 */
const { claimNextJob, completeJob, failJob } = require('../models/JobQueue');
const logger = require('../utils/logger');

async function processNotificationJob(job) {
    const { userId, type, title, message, data } = job.data;
    logger.debug(`[NotificationWorker] Creating notification for user ${userId}`);

    try {
        const Notification = require('../models/Notification');
        const notification = await Notification.create({
            userId,
            type,
            title,
            message,
            data: data || {}
        });

        // Emit real-time event if Socket.IO is accessible
        if (global.io) {
            global.io.to(`user:${userId}`).emit('notification', {
                _id: notification._id,
                type,
                title,
                message,
                data,
                createdAt: notification.createdAt
            });
        }

        await completeJob(job._id, { notificationId: notification._id });
        logger.info(`[NotificationWorker] Notification created for ${userId} (${type})`);

    } catch (error) {
        await failJob(job._id, error);
        logger.error(`[NotificationWorker] Failed: ${error.message}`);
    }
}

let notificationWorkerRunning = false;

function startNotificationWorker() {
    if (notificationWorkerRunning) return;
    notificationWorkerRunning = true;
    logger.info('🔔 Notification worker started (MongoDB-backed)');

    const poll = async () => {
        try {
            const job = await claimNextJob('notifications');
            if (job) {
                await processNotificationJob(job);
                setImmediate(poll);
                return;
            }
        } catch (err) {
            logger.error('[NotificationWorker] Poll error:', err.message);
        }
        setTimeout(poll, 3000);
    };

    poll();
}

module.exports = { startNotificationWorker };
