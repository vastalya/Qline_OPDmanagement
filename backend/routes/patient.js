const express = require('express');
const { param, query } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const patientController = require('../controllers/patientController');

const router = express.Router();

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const { validationResult } = require('express-validator');
        const errors = validationResult(req);
        if (errors.isEmpty()) return next();
        res.status(400).json({
            success: false,
            errors: errors.array().map((err) => err.msg),
        });
    };
};

router.use(verifyToken);
router.use(requireRole(['patient']));

router.get('/doctors', patientController.getPatientDoctors);

router.get(
    '/medical-records',
    validate([
        query('doctorId').optional().isMongoId().withMessage('doctorId must be valid'),
        query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('month must be YYYY-MM'),
    ]),
    patientController.getPatientMedicalRecords
);

router.get(
    '/medical-records/:id',
    validate([param('id').isMongoId().withMessage('Invalid record id')]),
    patientController.getPatientMedicalRecordById
);

module.exports = router;
