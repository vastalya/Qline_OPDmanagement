/**
 * Qline Workers — Standalone or embedded process entrypoint
 * All workers now use MongoDB job queue (Redis/BullMQ removed).
 */

require('../config/loadEnv');

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const connectDB = require('../config/db');

// Connect to MongoDB
connectDB();

// Start all workers
const { startEmailWorker } = require('./emailWorker');
const { startReminderWorker } = require('./reminderWorker');
const { startAnalyticsWorker } = require('./analyticsWorker');
const { startNotificationWorker } = require('./notificationWorker');

startEmailWorker();
startReminderWorker();
startAnalyticsWorker();
startNotificationWorker();

logger.info('🏭 Qline Workers started (MongoDB-backed, no Redis/BullMQ)');

process.on('SIGTERM', async () => {
    logger.info('Worker SIGTERM received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('Worker SIGINT received, shutting down gracefully...');
    await mongoose.connection.close();
    process.exit(0);
});
