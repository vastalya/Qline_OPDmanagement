const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const asyncHandler = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { syncDoctorSchedule } = require('../services/doctorScheduleService');
const { withOptionalTransaction } = require('../utils/transactionManager');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'qline_rt';
const withSession = (session) => (session ? { session } : {});

const normalizeEmail = (email) => {
    return typeof email === 'string' ? email.trim().toLowerCase() : email;
};

const normalizeRequestEmail = (req) => {
    const normalizedEmail = normalizeEmail(req.body?.email);

    if (typeof normalizedEmail === 'string' && req.body) {
        req.body.email = normalizedEmail;
    }

    return normalizedEmail;
};

const getRefreshCookieOptions = (expiresAt = null) => {
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        path: '/',
        ...(expiresAt ? { expires: expiresAt } : {}),
    };
};

const clearRefreshCookie = (res) => {
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
};

const setRefreshCookie = (res, refreshToken, expiresAt) => {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(expiresAt));
};

const getRefreshExpiryDate = () => {
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7); // 7 days
    return refreshExpiry;
};

const getIncomingRefreshToken = (req) =>
    req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || '';

/**
 * Generate access token
 */
const generateAccessToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRY || process.env.JWT_EXPIRES_IN || '15m',
    });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId, role) => {
    return jwt.sign({ userId, role }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRY,
    });
};

const createEmailVerificationToken = (user) => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    return rawToken;
};

const queueVerificationEmail = async (user, rawToken) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const verifyUrl = `${baseUrl}/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

        const html = `
            <p>Hello ${user.name},</p>
            <p>Please verify your email to activate your account.</p>
            <p><a href="${verifyUrl}">Verify Email</a></p>
            <p>This link expires in 24 hours.</p>
        `;

        await notificationService.sendEmail(
            user.email,
            'Verify your email - Qline',
            html,
            `Verify your email: ${verifyUrl}`
        );
    } catch (error) {
        // Email delivery should not block auth flow
        console.warn('Failed to queue verification email:', error.message);
    }
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
    const email = normalizeRequestEmail(req);
    const { name, firstName, lastName, password, role } = req.body;

    // Create user
    const user = await User.create({
        firstName,
        lastName,
        name: name || [firstName, lastName].filter(Boolean).join(' ').trim() || 'User',
        email,
        password,
        role,
    });

    const verificationToken = createEmailVerificationToken(user);
    await user.save({ validateBeforeSave: false });
    await queueVerificationEmail(user, verificationToken);

    if (role === 'doctor') {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.create({
            userId: user._id,
            department: 'Pending...',
            workingHours: { start: '09:00', end: '17:00' },
            isConfigured: false,
        });
        await syncDoctorSchedule(doctor);
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    // Hash refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Calculate expiry date
    const refreshExpiry = getRefreshExpiryDate();

    // Store hashed refresh token
    await RefreshToken.create({
        userId: user._id,
        token: hashedRefreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    setRefreshCookie(res, refreshToken, refreshExpiry);

    res.status(201).json({
        success: true,
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
        },
    });
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const email = normalizeRequestEmail(req);
    const { password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        res.status(401);
        throw new Error('Invalid credentials');
    }

    if (user.status === 'suspended') {
        res.status(403);
        throw new Error('Account is suspended');
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        res.status(401);
        throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    // Hash refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Calculate expiry date
    const refreshExpiry = getRefreshExpiryDate();

    // Delete old refresh tokens for this user
    await RefreshToken.deleteMany({ userId: user._id });

    // Store new hashed refresh token
    await RefreshToken.create({
        userId: user._id,
        token: hashedRefreshToken,
        expiresAt: refreshExpiry,
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.connection?.remoteAddress || '',
    });

    setRefreshCookie(res, refreshToken, refreshExpiry);

    res.status(200).json({
        success: true,
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
        },
    });
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const refresh = asyncHandler(async (req, res) => {
    const refreshToken = getIncomingRefreshToken(req);

    if (!refreshToken) {
        res.status(401);
        throw new Error('Refresh token required');
    }

    // Verify refresh token
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        res.status(401);
        throw new Error('Invalid refresh token');
    }

    // Find all refresh tokens for this user
    const storedTokens = await RefreshToken.find({ userId: decoded.userId });

    if (storedTokens.length === 0) {
        res.status(401);
        throw new Error('Refresh token not found');
    }

    // Compare the provided token with stored hashed tokens
    let validToken = null;
    for (const storedToken of storedTokens) {
        const isValid = await bcrypt.compare(refreshToken, storedToken.token);
        if (isValid) {
            validToken = storedToken;
            break;
        }
    }

    if (!validToken) {
        res.status(401);
        throw new Error('Invalid refresh token');
    }

    // Check if token is expired
    if (new Date() > validToken.expiresAt) {
        await RefreshToken.deleteOne({ _id: validToken._id });
        clearRefreshCookie(res);
        res.status(401);
        throw new Error('Refresh token expired');
    }

    const user = await User.findById(decoded.userId).select('name firstName lastName email role emailVerified status');
    if (!user) {
        await RefreshToken.deleteOne({ _id: validToken._id });
        clearRefreshCookie(res);
        res.status(401);
        throw new Error('User not found');
    }

    if (user.status === 'suspended') {
        clearRefreshCookie(res);
        res.status(403);
        throw new Error('Account is suspended');
    }

    // Rotate refresh token on each refresh for better session security.
    const rotatedRefreshToken = generateRefreshToken(user._id, user.role);
    const rotatedHash = await bcrypt.hash(rotatedRefreshToken, 10);
    const refreshExpiry = getRefreshExpiryDate();

    validToken.token = rotatedHash;
    validToken.expiresAt = refreshExpiry;
    validToken.userAgent = req.headers['user-agent'] || validToken.userAgent || '';
    validToken.ipAddress = req.ip || req.connection?.remoteAddress || validToken.ipAddress || '';
    await validToken.save();

    setRefreshCookie(res, rotatedRefreshToken, refreshExpiry);

    // Generate new access token
    const accessToken = generateAccessToken(user._id, user.role);

    res.status(200).json({
        success: true,
        accessToken,
        user: {
            id: user._id,
            name: user.name,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            role: user.role,
            emailVerified: user.emailVerified,
        },
    });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Public
 */
const logout = asyncHandler(async (req, res) => {
    const refreshToken = getIncomingRefreshToken(req);

    // Verify and decode token
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        // Token invalid or expired, but we'll still try to delete it
    }

    if (decoded && refreshToken) {
        // Find and delete matching refresh tokens
        const storedTokens = await RefreshToken.find({ userId: decoded.userId });

        for (const storedToken of storedTokens) {
            const isMatch = await bcrypt.compare(refreshToken, storedToken.token);
            if (isMatch) {
                await RefreshToken.deleteOne({ _id: storedToken._id });
                break;
            }
        }
    }

    clearRefreshCookie(res);

    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
    const email = normalizeRequestEmail(req);

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
        // Don't reveal if email exists for security
        return res.status(200).json({
            success: true,
            message: 'If an account exists with this email, a reset link has been sent.',
        });
    }

    // Generate reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET + user.password, // Make token invalid if password changes
        { expiresIn: '15m' }
    );

    // Save token hash and expiry to user
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save({ validateBeforeSave: false });

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const html = `
        <p>Hello ${user.name || 'User'},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
    `;

    const text = `Reset your password: ${resetUrl} (expires in 15 minutes)`;

    // Email delivery failures should not reveal account state to clients.
    try {
        await notificationService.sendEmail(
            user.email,
            'Reset your password - Qline',
            html,
            text,
            { type: 'password_reset', userId: user._id.toString() }
        );
    } catch (error) {
        console.warn('Failed to dispatch password reset email:', error.message);
    }

    res.status(200).json({
        success: true,
        message: 'Password reset link sent to email',
    });
});

/**
 * @route   GET /api/auth/reset-password/validate
 * @desc    Validate reset token
 * @access  Public
 */
const validateResetToken = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        res.status(400);
        throw new Error('Reset token is required');
    }

    // Find user with this reset token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Reset token has expired or is invalid');
    }

    res.status(200).json({
        success: true,
        message: 'Token is valid',
    });
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
        res.status(400);
        throw new Error('Token and password are required');
    }

    // Find user with valid reset token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Reset token has expired or is invalid');
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
    });
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    await withOptionalTransaction(async ({ session }) => {
        const user = await User.findById(userId, null, withSession(session)).select('+password');
        if (!user) {
            res.status(404);
            throw new Error('User not found');
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            res.status(401);
            throw new Error('Current password is incorrect');
        }

        if (currentPassword === newPassword) {
            res.status(400);
            throw new Error('New password must be different from current password');
        }

        user.password = newPassword;
        await user.save(withSession(session));

        // Invalidate existing refresh tokens to force re-login on other sessions.
        await RefreshToken.deleteMany({ userId: user._id }, withSession(session));
    });

    res.status(200).json({
        success: true,
        message: 'Password changed successfully',
    });
});

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify email using token
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
        res.status(400);
        throw new Error('Verification token is required');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { $gt: Date.now() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
        res.status(400);
        throw new Error('Verification token has expired or is invalid');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true,
        message: 'Email verified successfully',
    });
});

/**
 * @route   POST /api/auth/verify-email/resend
 * @desc    Resend verification email
 * @access  Public
 */
const resendVerificationEmail = asyncHandler(async (req, res) => {
    const email = normalizeRequestEmail(req);
    if (!email) {
        res.status(400);
        throw new Error('Email is required');
    }

    const user = await User.findOne({ email });
    if (!user) {
        return res.status(200).json({
            success: true,
            message: 'If the account exists, a verification email has been sent.',
        });
    }

    if (user.emailVerified) {
        return res.status(200).json({
            success: true,
            message: 'Email is already verified',
        });
    }

    const verificationToken = createEmailVerificationToken(user);
    await user.save({ validateBeforeSave: false });
    await queueVerificationEmail(user, verificationToken);

    res.status(200).json({
        success: true,
        message: 'Verification email sent',
    });
});

module.exports = {
    register,
    login,
    refresh,
    logout,
    forgotPassword,
    validateResetToken,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
};
