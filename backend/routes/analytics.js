const express = require('express');
const router = express.Router();
const { query } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All analytics routes require authentication and doctor role
router.use(authMiddleware.verifyToken);
router.use(roleCheck.requireRole(['doctor']));

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get real-time dashboard stats
 * @access  Private (Doctor)
 */
router.get('/dashboard', analyticsController.getDashboard);

/**
 * @route   GET /api/analytics/range
 * @desc    Get analytics for date range
 * @access  Private (Doctor)
 */
router.get(
    '/range',
    [
        query('startDate').isISO8601().withMessage('Valid start date required'),
        query('endDate').isISO8601().withMessage('Valid end date required')
    ],
    analyticsController.getAnalyticsRange
);

/**
 * @route   GET /api/analytics/wait-times
 * @desc    Get wait time analysis
 * @access  Private (Doctor)
 */
router.get(
    '/wait-times',
    [
        query('startDate').isISO8601().withMessage('Valid start date required'),
        query('endDate').isISO8601().withMessage('Valid end date required')
    ],
    analyticsController.getWaitTimeAnalysis
);

module.exports = router;
