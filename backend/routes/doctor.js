const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
    configureSchedule,
    updateAvailabilityStatus,
    getMySchedule,
    getAvailableSlots,
    getTodayAppointments,
    searchDoctors,
    getDoctorById,
} = require('../controllers/doctorController');

// Validation middleware
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
 * @route   POST /api/doctors/configure
 * @desc    Configure doctor schedule
 * @access  Private (Doctor only)
 */
router.post(
    '/configure',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('workingHours.start')
            .notEmpty()
            .withMessage('Working hours start time is required')
            .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
            .withMessage('Start time must be in HH:MM format'),
        body('workingHours.end')
            .notEmpty()
            .withMessage('Working hours end time is required')
            .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
            .withMessage('End time must be in HH:MM format'),
        body('defaultConsultTime')
            .isInt({ min: 5, max: 120 })
            .withMessage('Consultation time must be between 5 and 120 minutes'),
        body('maxPatientsPerDay')
            .isInt({ min: 1, max: 200 })
            .withMessage('Max patients per day must be between 1 and 200'),
        body('workingDays')
            .optional()
            .isArray({ min: 1 })
            .withMessage('Working days must be a non-empty array'),
        body('breakSlots')
            .optional()
            .isArray()
            .withMessage('Break slots must be an array'),
        body('department')
            .optional()
            .isString()
            .withMessage('Department must be a string'),
    ]),
    configureSchedule
);

/**
 * @route   PATCH /api/doctors/availability
 * @desc    Update doctor active/inactive status and unavailability window
 * @access  Private (Doctor only)
 */
router.patch(
    '/availability',
    verifyToken,
    requireRole(['doctor']),
    validate([
        body('isActive')
            .isBoolean()
            .withMessage('isActive must be a boolean'),
        body('inactiveFrom')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('inactiveFrom must be a valid ISO 8601 date'),
        body('inactiveUntil')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('inactiveUntil must be a valid ISO 8601 date'),
        body('inactiveReason')
            .optional()
            .isString()
            .withMessage('inactiveReason must be a string'),
        body('handlingMode')
            .optional()
            .isIn(['reschedule', 'cancel'])
            .withMessage('handlingMode must be either reschedule or cancel'),
    ]),
    updateAvailabilityStatus
);

/**
 * @route   GET /api/doctors/my-schedule
 * @desc    Get logged-in doctor's schedule
 * @access  Private (Doctor only)
 */
router.get(
    '/my-schedule',
    verifyToken,
    requireRole(['doctor']),
    getMySchedule
);

/**
 * @route   GET /api/doctors
 * @desc    Search / list doctors (public)
 * @access  Public
 */
router.get(
    '/',
    validate([
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    ]),
    searchDoctors
);

/**
 * @route   GET /api/doctors/today-appointments
 * @desc    Get today's appointments for logged-in doctor
 * @access  Private (Doctor only)
 * NOTE: must be registered BEFORE /:id to avoid route shadowing
 */
router.get(
    '/today-appointments',
    verifyToken,
    requireRole(['doctor']),
    getTodayAppointments
);

/**
 * @route   GET /api/doctors/:id/slots
 * @desc    Get available slots for a doctor on a specific date
 * @access  Public/Authenticated
 */
router.get(
    '/:id/slots',
    validate([
        param('id').isMongoId().withMessage('Invalid doctor ID'),
        query('date')
            .notEmpty()
            .withMessage('Date query parameter is required')
            .isISO8601()
            .withMessage('Date must be in valid ISO 8601 format (YYYY-MM-DD)'),
    ]),
    getAvailableSlots
);

/**
 * @route   GET /api/doctors/:id
 * @desc    Get a single doctor profile by ID
 * @access  Public
 */
router.get(
    '/:id',
    validate([
        param('id').isMongoId().withMessage('Invalid doctor ID'),
    ]),
    getDoctorById
);

module.exports = router;
