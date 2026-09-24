const cacheManager = require('./cacheManager');
const Doctor = require('../models/Doctor');
const DailyQueue = require('../models/DailyQueue');
const logger = require('./logger');
const { normalizeDate } = require('./dateUtils');

/**
 * Cache Warmer
 * Pre-populates cache with critical data on startup
 */
exports.warmCache = async () => {
    // Only warm if configured
    if (process.env.CACHE_WARM_ON_STARTUP !== 'true') {
        logger.info('❄️ Cache warming disabled');
        return;
    }

    logger.info('🔥 Starting cache warming...');
    const startTime = Date.now();

    try {
        // 1. Warm Popular Doctors (Top 50)
        // In real app, order by popularity. Here simple limit.
        const doctors = await Doctor.find()
            .select('userId specialization department workingHours consultationFees defaultConsultTime rating reviews')
            .populate('userId', 'name email avatar')
            .limit(50)
            .lean();

        for (const doctor of doctors) {
            // Cache full profile
            await cacheManager.set(
                `doctor:${doctor._id}`, // Key
                doctor,
                { ttl: 3600, tags: ['doctors'] } // 1 hour TTL
            );

            // Cache by User ID too
            await cacheManager.set(
                `doctor:user:${doctor.userId._id}`,
                doctor,
                { ttl: 3600, tags: ['doctors'] }
            );
        }

        // 2. Warm Today's Queues
        const today = normalizeDate(new Date());

        const queues = await DailyQueue.find({ date: today })
            .select('doctorId date status currentToken appointmentCount waitTime estimatedDelay')
            .lean();

        for (const queue of queues) {
            await cacheManager.set(
                `queue:${queue.doctorId}:${today.toISOString().split('T')[0]}`,
                queue,
                { ttl: 300, tags: ['queues', `doctor:${queue.doctorId}`] } // 5 min TTL
            );
        }

        const duration = Date.now() - startTime;
        logger.info(`✅ Cache warmed in ${duration}ms: ${doctors.length} doctors, ${queues.length} queues`);

    } catch (error) {
        logger.error('❌ Cache warming failed:', error);
    }
};
