const express = require('express');
const { body, query } = require('express-validator');
const { register, login, refresh, logout, forgotPassword, validateResetToken, resetPassword, changePassword, verifyEmail, resendVerificationEmail } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Validation middleware
const registerValidation = [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
    body('role')
        .isIn(['patient', 'doctor', 'admin'])
        .withMessage('Role must be patient, doctor, or admin'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const forgotPasswordValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
];

const resetPasswordValidation = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters'),
];

const verifyEmailValidation = [
    query('token').notEmpty().withMessage('Verification token is required'),
];

const resendVerificationValidation = [
    body('email').isEmail().withMessage('Valid email is required'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400);
        const errorMessages = errors.array().map((err) => err.msg).join(', ');
        return next(new Error(errorMessages));
    }

    next();
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
    '/register',
    registerValidation,
    handleValidationErrors,
    asyncHandler(register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
    '/login',
    loginValidation,
    handleValidationErrors,
    asyncHandler(login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post(
    '/refresh',
    asyncHandler(refresh)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Public
 */
router.post(
    '/logout',
    asyncHandler(logout)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
    '/forgot-password',
    forgotPasswordValidation,
    handleValidationErrors,
    asyncHandler(forgotPassword)
);

/**
 * @route   GET /api/auth/reset-password/validate
 * @desc    Validate reset token
 * @access  Public
 */
router.get('/reset-password/validate', asyncHandler(validateResetToken));

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
    '/reset-password',
    resetPasswordValidation,
    handleValidationErrors,
    asyncHandler(resetPassword)
);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.get(
    '/verify-email',
    verifyEmailValidation,
    handleValidationErrors,
    asyncHandler(verifyEmail)
);

/**
 * @route   POST /api/auth/verify-email/resend
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
    '/verify-email/resend',
    resendVerificationValidation,
    handleValidationErrors,
    asyncHandler(resendVerificationEmail)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post(
    '/change-password',
    verifyToken,
    changePasswordValidation,
    handleValidationErrors,
    asyncHandler(changePassword)
);

module.exports = router;
