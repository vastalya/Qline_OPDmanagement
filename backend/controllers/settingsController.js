const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const asyncHandler = require('../utils/asyncHandler');
const { withOptionalTransaction } = require('../utils/transactionManager');

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'qline_rt';
const withSession = (session) => (session ? { session } : {});

const getRefreshCookieOptions = () => {
    const isProd = (process.env.NODE_ENV || 'development') === 'production';
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'strict' : 'lax',
        path: '/',
    };
};

const deriveDevice = (userAgent = '') => {
    if (!userAgent) return 'Unknown device';
    if (userAgent.includes('Windows')) return 'Windows device';
    if (userAgent.includes('Macintosh')) return 'Mac device';
    if (userAgent.includes('Android')) return 'Android device';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS device';
    if (userAgent.includes('Linux')) return 'Linux device';
    return 'Browser session';
};

exports.updateAccountSettings = asyncHandler(async (req, res) => {
    const { alternateEmail, locale, displayName } = req.body || {};

    const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
            $set: {
                'settings.account.alternateEmail': alternateEmail || '',
                'settings.account.locale': locale || 'en-US',
                'settings.account.displayName': displayName || '',
            },
        },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json({
        success: true,
        message: 'Account settings updated',
        account: user.settings?.account || {},
    });
});

exports.updateNotificationSettings = asyncHandler(async (req, res) => {
    const { preferences = {}, globalMute = false } = req.body || {};

    const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
            $set: {
                'settings.notifications.preferences': preferences,
                'settings.notifications.globalMute': !!globalMute,
            },
        },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json({
        success: true,
        message: 'Notification settings updated',
        notifications: user.settings?.notifications || {},
    });
});

exports.updatePreferenceSettings = asyncHandler(async (req, res) => {
    const {
        timezone = 'UTC',
        dateFormat = 'MM/DD/YYYY',
        timeFormat = '12h',
        language = 'en-US',
        reducedMotion = false,
        highContrast = false,
        fontSize = 'medium',
    } = req.body || {};

    const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
            $set: {
                'settings.preferences.timezone': timezone,
                'settings.preferences.dateFormat': dateFormat,
                'settings.preferences.timeFormat': timeFormat,
                'settings.preferences.language': language,
                'settings.preferences.reducedMotion': !!reducedMotion,
                'settings.preferences.highContrast': !!highContrast,
                'settings.preferences.fontSize': fontSize,
            },
        },
        { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.json({
        success: true,
        message: 'Preferences updated',
        preferences: user.settings?.preferences || {},
    });
});

exports.changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Current password and new password are required');
    }

    await withOptionalTransaction(async ({ session }) => {
        const user = await User.findById(req.user.userId, null, withSession(session)).select('+password');
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

        await RefreshToken.deleteMany({ userId: user._id }, withSession(session));
    });

    res.json({
        success: true,
        message: 'Password changed successfully',
    });
});

exports.logoutAllSessions = asyncHandler(async (req, res) => {
    await RefreshToken.deleteMany({ userId: req.user.userId });
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());
    res.json({
        success: true,
        message: 'Logged out from all devices',
    });
});

exports.logoutSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.body || {};

    if (!sessionId) {
        res.status(400);
        throw new Error('sessionId is required');
    }

    const result = await RefreshToken.deleteOne({
        _id: sessionId,
        userId: req.user.userId,
    });

    if (result.deletedCount === 0) {
        res.status(404);
        throw new Error('Session not found');
    }

    res.json({
        success: true,
        message: 'Session signed out successfully',
    });
});

exports.getSecuritySessions = asyncHandler(async (req, res) => {
    const sessions = await RefreshToken.find({ userId: req.user.userId })
        .sort({ updatedAt: -1 })
        .lean();

    const mapped = sessions.map((s, idx) => ({
        id: s._id,
        device: deriveDevice(s.userAgent),
        ip: s.ipAddress || 'Unknown IP',
        lastActive: s.updatedAt || s.createdAt,
        current: idx === 0,
    }));

    res.json({
        success: true,
        sessions: mapped,
    });
});
