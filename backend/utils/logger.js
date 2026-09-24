const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// Determine log level from environment
const logLevel = process.env.LOG_LEVEL || 'info';

// Custom format for masking sensitive data
const maskSensitiveData = winston.format((info) => {
    // Don't log medical data unless explicitly enabled
    if (info.message && typeof info.message === 'object') {
        const masked = { ...info.message };

        // Mask medical fields
        if (masked.diagnosis) masked.diagnosis = '[REDACTED]';
        if (masked.notes) masked.notes = '[REDACTED]';
        if (masked.medications) masked.medications = '[REDACTED]';
        if (masked.labTests) masked.labTests = '[REDACTED]';
        if (masked.vitals) masked.vitals = '[REDACTED]';
        if (masked.followUp) masked.followUp = '[REDACTED]';

        // Mask passwords
        if (masked.password) masked.password = '[REDACTED]';
        if (masked.newPassword) masked.newPassword = '[REDACTED]';
        if (masked.currentPassword) masked.currentPassword = '[REDACTED]';

        info.message = masked;
    }

    return info;
});

// Create the logger
const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        maskSensitiveData(),
        winston.format.json()
    ),
    defaultMeta: { service: 'qline-backend' },
    transports: [
        // Error log with daily rotation
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            level: 'error',
            maxSize: '20m',
            maxFiles: '14d', // Keep for 14 days
            zippedArchive: true
        }),

        // Combined log with daily rotation
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d', // Keep for 30 days
            zippedArchive: true
        })
    ]
});

// In development, also log to console with colorized output
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

module.exports = logger;
