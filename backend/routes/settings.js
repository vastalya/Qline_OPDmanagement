const express = require('express');
const { body } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const settingsController = require('../controllers/settingsController');

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

router.put(
    '/account',
    validate([
        body('alternateEmail').optional({ nullable: true }).isEmail().withMessage('Alternate email must be valid'),
        body('locale').optional().isString(),
        body('displayName').optional().isString(),
    ]),
    settingsController.updateAccountSettings
);

router.put(
    '/notifications',
    validate([
        body('preferences').optional().isObject().withMessage('Preferences must be an object'),
        body('globalMute').optional().isBoolean().withMessage('globalMute must be boolean'),
    ]),
    settingsController.updateNotificationSettings
);

router.put(
    '/preferences',
    validate([
        body('timezone').optional().isString(),
        body('dateFormat').optional().isString(),
        body('timeFormat').optional().isIn(['12h', '24h']),
        body('language').optional().isString(),
        body('reducedMotion').optional().isBoolean(),
        body('highContrast').optional().isBoolean(),
        body('fontSize').optional().isIn(['small', 'medium', 'large']),
    ]),
    settingsController.updatePreferenceSettings
);

router.post(
    '/security/change-password',
    validate([
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ]),
    settingsController.changePassword
);

router.post('/security/logout-all', settingsController.logoutAllSessions);
router.post(
    '/security/logout-session',
    validate([
        body('sessionId').isMongoId().withMessage('Valid sessionId is required'),
    ]),
    settingsController.logoutSession
);
router.get('/security/sessions', settingsController.getSecuritySessions);

module.exports = router;
