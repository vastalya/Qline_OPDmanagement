const ErrorReport = require('../models/ErrorReport');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

exports.reportClientError = asyncHandler(async (req, res) => {
    const { url, userAgent, timestamp, ...context } = req.body || {};

    await ErrorReport.create({
        url: url || '',
        userAgent: userAgent || '',
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        userId: req.user?.userId || null,
        context,
    });

    logger.error('Client error report received', {
        url,
        userAgent,
        userId: req.user?.userId || null,
        timestamp,
    });

    res.status(201).json({
        success: true,
        message: 'Error report submitted',
    });
});
