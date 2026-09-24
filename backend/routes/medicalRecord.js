const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const medicalRecordController = require('../controllers/medicalRecordController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All medical record routes require authentication
router.use(authMiddleware.verifyToken);

router.get(
    '/doctor/patients',
    roleCheck.requireRole(['doctor']),
    medicalRecordController.getDoctorPatients
);

router.get(
    '/doctor/patients/:patientId/history',
    roleCheck.requireRole(['doctor']),
    [
        param('patientId').isMongoId().withMessage('Valid patient ID required')
    ],
    medicalRecordController.getDoctorPatientTimeline
);

router.get(
    '/doctor',
    roleCheck.requireRole(['doctor']),
    medicalRecordController.getDoctorRecords
);

/**
 * @route   POST /api/medical-records
 * @desc    Create medical record (doctor only)
 * @access  Private (Doctor)
 */
router.post(
    '/',
    roleCheck.requireRole(['doctor']),
    [
        body('appointmentId').isMongoId().withMessage('Valid appointment ID required'),
        body('chiefComplaint').trim().notEmpty().withMessage('Chief complaint is required'),
        body('symptoms').optional().isArray().withMessage('Symptoms must be an array'),
        body('diagnosis').optional().trim(),
        body('notes').optional().trim(),
        body('medications').optional().isArray().withMessage('Medications must be an array'),
        body('labTests').optional().isArray().withMessage('Lab tests must be an array'),
        body('vitals').optional().isObject().withMessage('Vitals must be an object'),
        body('followUp').optional().isObject().withMessage('Follow-up must be an object')
    ],
    medicalRecordController.createRecord
);

/**
 * @route   GET /api/medical-records/my-history
 * @desc    Get my medical history (patient only)
 * @access  Private (Patient)
 */
router.get(
    '/my-history',
    roleCheck.requireRole(['patient']),
    medicalRecordController.getMyHistory
);

/**
 * @route   GET /api/medical-records/patient/:patientId
 * @desc    Get patient medical history (doctor or patient themselves)
 * @access  Private
 */
router.get(
    '/patient/:patientId',
    [
        param('patientId').isMongoId().withMessage('Valid patient ID required')
    ],
    medicalRecordController.getPatientHistory
);

/**
 * @route   GET /api/medical-records/:id
 * @desc    Get single medical record
 * @access  Private (Doctor or Patient)
 */
router.get(
    '/:id',
    [
        param('id').isMongoId().withMessage('Valid record ID required')
    ],
    medicalRecordController.getRecord
);

/**
 * @route   PATCH /api/medical-records/:id
 * @desc    Update medical record (doctor only)
 * @access  Private (Doctor)
 */
router.patch(
    '/:id',
    roleCheck.requireRole(['doctor']),
    [
        param('id').isMongoId().withMessage('Valid record ID required')
    ],
    medicalRecordController.updateRecord
);

module.exports = router;
