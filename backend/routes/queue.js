const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const queueController = require('../controllers/queueController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// Validation middleware (same pattern as other routes)
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));

        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({
            success: false,
            errors: errors.array().map((err) => err.msg),
        });
    };
};

/**
 * @route   POST /api/queue/call-next
 * @desc    Call next patient in queue
 * @access  Private (Doctor only)
 * @headers X-Action-ID: <uuid> (required for idempotency)
 */
router.post(
    '/call-next',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.callNextPatient
);

/**
 * @route   POST /api/queue/mark-completed
 * @desc    Mark current patient as completed
 * @access  Private (Doctor only)
 * @headers X-Action-ID: <uuid> (required for idempotency)
 */
router.post(
    '/mark-completed',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.markCompleted
);

/**
 * @route   POST /api/queue/mark-no-show
 * @desc    Mark current patient as no-show
 * @access  Private (Doctor only)
 * @headers X-Action-ID: <uuid> (required for idempotency)
 */
router.post(
    '/mark-no-show',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.markNoShow
);

/**
 * @route   POST /api/queue/pause
 * @desc    Pause queue (break time)
 * @access  Private (Doctor only)
 */
router.post(
    '/pause',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.pauseQueue
);

/**
 * @route   POST /api/queue/resume
 * @desc    Resume paused queue
 * @access  Private (Doctor only)
 */
router.post(
    '/resume',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.resumeQueue
);

/**
 * @route   GET /api/queue/current-state
 * @desc    Get current queue state
 * @access  Private (Doctor only)
 */
router.get(
    '/current-state',
    verifyToken,
    requireRole(['doctor']),
    validate([
        query('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be a valid ISO 8601 date')
    ]),
    queueController.getCurrentState
);

module.exports = router;
