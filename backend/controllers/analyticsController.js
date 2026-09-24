const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');
const Doctor = require('../models/Doctor');

/**
 * Get real-time dashboard stats (doctor only)
 * GET /api/analytics/dashboard
 */
exports.getDashboard = asyncHandler(async (req, res) => {
    const userId = req.user.userId;

    // Find doctor profile for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
        return res.status(403).json({
            success: false,
            error: 'Doctor profile not found. Only doctors can access analytics dashboard'
        });
    }

    const stats = await analyticsService.getDashboardStats(doctor._id);

    res.json({
        success: true,
        stats
    });
});

/**
 * Get analytics for date range (doctor only)
 * GET /api/analytics/range
 */
exports.getAnalyticsRange = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    // Find doctor profile for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
        return res.status(403).json({
            success: false,
            error: 'Doctor profile not found. Only doctors can access analytics'
        });
    }

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: 'startDate and endDate are required'
        });
    }

    const analytics = await analyticsService.getAnalytics(
        doctor._id,
        new Date(startDate),
        new Date(endDate)
    );

    res.json({
        success: true,
        analytics
    });
});

/**
 * Get wait time analysis (doctor only)
 * GET /api/analytics/wait-times
 */
exports.getWaitTimeAnalysis = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    // Find doctor profile for this user
    const doctor = await Doctor.findOne({ userId });
    if (!doctor) {
        return res.status(403).json({
            success: false,
            error: 'Doctor profile not found. Only doctors can access analytics'
        });
    }

    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: 'startDate and endDate are required'
        });
    }

    const analysis = await analyticsService.getWaitTimeAnalysis(
        doctor._id,
        new Date(startDate),
        new Date(endDate)
    );

    res.json({
        success: true,
        analysis
    });
});
