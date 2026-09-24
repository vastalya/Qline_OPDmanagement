require('./config/loadEnv');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Config and utilities
const logger = require('./utils/logger');
const Sentry = require('./config/sentry');
const { apiLimiter, strictLimiter } = require('./middleware/rateLimiter');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const socketAuth = require('./middleware/socketAuth');
const setupSocket = require('./sockets/queueSocket');
const { verifyAndInitializeData } = require('./utils/dataPersistenceCheck');

// Import routes
const authRoutes = require('./routes/auth');
const doctorRoutes = require('./routes/doctor');
const appointmentRoutes = require('./routes/appointment');
const queueRoutes = require('./routes/queue');
const notificationRoutes = require('./routes/notification');
const medicalRecordRoutes = require('./routes/medicalRecord');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const profileRoutes = require('./routes/profile');
const settingsRoutes = require('./routes/settings');
const patientRoutes = require('./routes/patient');
const supportRoutes = require('./routes/support');
const errorRoutes = require('./routes/error');

// Initialize Express
const app = express();
const server = http.createServer(app);

// Respect reverse proxies (Render, Nginx, etc.) for client IPs and secure cookies.
app.set('trust proxy', 1);

// Sentry request handler (production only)
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
}

// Initialize Socket.IO (no Redis adapter — single server)
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Socket.IO Authentication Middleware
io.use(socketAuth);

// Expose io globally so workers running in the same process can emit events
global.io = io;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', apiLimiter);

// Make io accessible in routes
app.set('io', io);

// Root route
app.get('/', (req, res) => {
    res.json({
        message: 'Qline API - OPD Queue Management System',
        version: '2.0.0',
        status: 'running',
        database: 'MongoDB (no Redis/Docker)',
        availableEndpoints: {
            health: '/health',
            auth: '/api/auth',
            doctors: '/api/doctors',
            appointments: '/api/appointments',
            queue: '/api/queue',
            notifications: '/api/notifications',
            medicalRecords: '/api/medical-records',
            analytics: '/api/analytics',
            admin: '/api/admin',
            profile: '/api/profile',
            settings: '/api/settings',
            patient: '/api/patient',
            support: '/api/support',
            errors: '/api/errors'
        }
    });
});

// Routes
app.use('/api/auth', strictLimiter, authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/errors', errorRoutes);

// Health check (MongoDB only)
app.get('/health', async (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            mongodb: 'checking'
        }
    };

    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.db.admin().ping();
            health.services.mongodb = 'connected';
        } else {
            health.services.mongodb = 'disconnected';
            health.status = 'degraded';
        }
    } catch (error) {
        health.services.mongodb = 'error';
        health.status = 'degraded';
        logger.error('MongoDB health check failed:', error);
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

// 404 handler
app.use((req, res, next) => {
    res.status(404);
    next(new Error(`Route not found: ${req.originalUrl}`));
});

// Sentry error handler (after routes, before custom error handler)
if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

// Error handler (must be last)
app.use(errorHandler);

// Setup Socket.IO
setupSocket(io);

// Schedule analytics jobs via cron (MongoDB-based, no Redis)
const analyticsService = require('./services/analyticsService');
analyticsService.scheduleDailyAnalytics().catch(err =>
    logger.error('Failed to schedule analytics:', err)
);

// Start embedded workers (always in development; opt-in for production)
const shouldRunEmbeddedWorkers =
    process.env.RUN_WORKERS_IN_API === 'true' ||
    (!process.env.RUN_WORKERS_IN_API && (process.env.NODE_ENV || 'development') !== 'production');

if (shouldRunEmbeddedWorkers) {
    const { startEmailWorker } = require('./workers/emailWorker');
    const { startReminderWorker } = require('./workers/reminderWorker');
    const { startAnalyticsWorker } = require('./workers/analyticsWorker');
    const { startNotificationWorker } = require('./workers/notificationWorker');

    startEmailWorker();
    startReminderWorker();
    startAnalyticsWorker();
    startNotificationWorker();

    logger.info('✅ Embedded MongoDB-backed workers started');
} else {
    logger.info('ℹ️  Embedded workers disabled (expecting standalone worker process)');
}

// Cache warmer (now only memory cache — no Redis)
const { warmCache } = require('./utils/cacheWarmer');
const { ensureIndexes } = require('./utils/dbOptimizer');

Promise.all([warmCache(), ensureIndexes()])
    .then(() => logger.info('✨ System ready (indexes ensured, cache warmed)'))
    .catch(err => logger.error('Startup tasks failed (non-fatal):', err.message));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', async () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🗄️  Database: MongoDB (no Redis, no Docker)`);

    try {
        await verifyAndInitializeData();
    } catch (error) {
        logger.error('Error during data verification:', error);
    }
});

server.on('error', (err) => {
    logger.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
        logger.info('HTTP server closed');
        await mongoose.connection.close();
        process.exit(0);
    });
});

module.exports = { app, server, io };
