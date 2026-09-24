const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    cancelAppointment,
    setPriority,
    getWaitInfo,
    getAppointmentById,
    rescheduleAppointment,
    reassignAppointmentToNextAvailable,
} = require('../controllers/appointmentController');

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
 * @route   POST /api/appointments/book
 * @desc    Book an appointment slot
 * @access  Private (Patient only)
 */
router.post(
    '/book',
    verifyToken,
    requireRole(['patient']),
    validate([
        body('doctorId')
            .isMongoId()
            .withMessage('Valid doctor ID is required'),
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be in valid ISO 8601 format'),
        body('slotStart')
            .notEmpty()
            .withMessage('Slot start time is required')
            .isISO8601()
            .withMessage('Slot start must be a valid ISO 8601 datetime'),
        body('slotEnd')
            .notEmpty()
            .withMessage('Slot end time is required')
            .isISO8601()
            .withMessage('Slot end must be a valid ISO 8601 datetime'),
    ]),
    bookAppointment
);

/**
 * @route   GET /api/appointments/my-appointments
 * @desc    Get patient's appointments
 * @access  Private (Patient only)
 */
router.get(
    '/my-appointments',
    verifyToken,
    requireRole(['patient']),
    getMyAppointments
);

/**
 * @route   GET /api/appointments/doctor-appointments
 * @desc    Get doctor's appointments for a specific date
 * @access  Private (Doctor only)
 */
router.get(
    '/doctor-appointments',
    verifyToken,
    requireRole(['doctor']),
    validate([
        query('date')
            .notEmpty()
            .withMessage('Date query parameter is required')
            .isISO8601()
            .withMessage('Date must be in valid ISO 8601 format (YYYY-MM-DD)'),
    ]),
    getDoctorAppointments
);

/**
 * @route   DELETE /api/appointments/:id/cancel
 * @desc    Cancel an appointment
 * @access  Private (Patient or Doctor who owns the appointment)
 */
router.delete(
    '/:id/cancel',
    verifyToken,
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
    ]),
    cancelAppointment
);

/**
 * @route   PATCH /api/appointments/:id/reschedule
 * @desc    Reschedule an appointment
 * @access  Private (owner patient or treating doctor)
 */
router.patch(
    '/:id/reschedule',
    verifyToken,
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
        body('date')
            .notEmpty()
            .withMessage('Date is required')
            .isISO8601()
            .withMessage('Date must be in valid ISO 8601 format'),
        body('slotStart')
            .notEmpty()
            .withMessage('Slot start time is required')
            .isISO8601()
            .withMessage('Slot start must be a valid ISO 8601 datetime'),
        body('slotEnd')
            .notEmpty()
            .withMessage('Slot end time is required')
            .isISO8601()
            .withMessage('Slot end must be a valid ISO 8601 datetime'),
    ]),
    rescheduleAppointment
);

router.post(
    '/:id/reassign-next-available',
    verifyToken,
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
    ]),
    reassignAppointmentToNextAvailable
);

/**
 * @route   PATCH /api/appointments/:id/priority
 * @desc    Set priority for appointment (emergency/senior/standard)
 * @access  Private (Doctor only)
 */
router.patch(
    '/:id/priority',
    verifyToken,
    requireRole(['doctor']),
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
        body('priority')
            .isIn(['emergency', 'senior', 'standard'])
            .withMessage('Priority must be emergency, senior, or standard'),
        body('priorityNote').optional().isString().isLength({ max: 200 })
    ]),
    setPriority
);

/**
 * @route   GET /api/appointments/:id/wait-info
 * @desc    Get live wait time estimate for patient
 * @access  Private (Patient - own appointments only)
 */
router.get(
    '/:id/wait-info',
    verifyToken,
    requireRole(['patient']),
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
    ]),
    getWaitInfo
);

/**
 * @route   GET /api/appointments/:id
 * @desc    Get a single appointment by ID
 * @access  Private (owner patient or doctor)
 */
router.get(
    '/:id',
    verifyToken,
    validate([
        param('id').isMongoId().withMessage('Invalid appointment ID'),
    ]),
    getAppointmentById
);

module.exports = router;

