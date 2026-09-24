const express = require('express');
const router = express.Router();
const { query, param, body } = require('express-validator');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const auditMiddleware = require('../middleware/auditLog');

// All admin routes require authentication and admin role
router.use(authMiddleware.verifyToken);
router.use(roleCheck.requireRole(['admin']));

// Stats
router.get('/stats', adminController.getSystemStats);

// Users
router.get('/users', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('role').optional().isIn(['patient', 'doctor', 'admin']),
    query('search').optional().isString(),
], adminController.getUsers);

router.get('/users/:id', [param('id').isMongoId()], adminController.getUserById);

router.patch('/users/:id/status', [
    param('id').isMongoId().withMessage('Valid user ID required'),
    body('status').notEmpty().withMessage('Status is required')
], auditMiddleware('update_user_status', 'user'), adminController.updateUserStatus);

// Doctors
router.get('/doctors', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('department').optional().isString(),
], adminController.getDoctors);

router.get('/doctors/:id', [param('id').isMongoId()], adminController.getDoctorById);
router.post('/doctors', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], adminController.createDoctor);
router.patch('/doctors/:id', [param('id').isMongoId()], adminController.updateDoctor);
router.delete('/doctors/:id', [param('id').isMongoId()], adminController.deleteDoctor);

// Queues live monitor
router.get('/queues/live', adminController.getLiveQueues);

// Audit logs
router.get('/audit-logs', [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('userId').optional().isMongoId(),
    query('action').optional().isString(),
    query('entityType').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
], adminController.getAuditLogs);

// Analytics
router.get('/analytics', [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
], adminController.getAnalytics);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
