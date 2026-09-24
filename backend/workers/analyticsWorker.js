/**
 * Analytics Worker — MongoDB-based (Redis/BullMQ removed)
 * Polls the MongoDB job queue and processes analytics calculation jobs.
 */
const { claimNextJob, completeJob, failJob } = require('../models/JobQueue');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

async function processAnalyticsJob(job) {
    const { doctorId, date } = job.data;
    logger.info(`[AnalyticsWorker] Calculating analytics for doctor ${doctorId} on ${date}`);

    try {
        const result = await analyticsService.calculateDailyAnalytics(doctorId, date);
        await completeJob(job._id, { result });
        logger.info(`[AnalyticsWorker] Analytics calculation complete`);
    } catch (error) {
        await failJob(job._id, error);
        logger.error(`[AnalyticsWorker] Failed: ${error.message}`);
    }
}

let analyticsWorkerRunning = false;

function startAnalyticsWorker() {
    if (analyticsWorkerRunning) return;
    analyticsWorkerRunning = true;
    logger.info('📊 Analytics worker started (MongoDB-backed)');

    const poll = async () => {
        try {
            const job = await claimNextJob('analytics');
            if (job) {
                await processAnalyticsJob(job);
                setImmediate(poll);
                return;
            }
        } catch (err) {
            logger.error('[AnalyticsWorker] Poll error:', err.message);
        }
        setTimeout(poll, 10000); // Analytics less time-critical
    };

    poll();
}

module.exports = { startAnalyticsWorker };
