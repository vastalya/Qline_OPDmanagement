const User = require('../models/User');
const Doctor = require('../models/Doctor');
const asyncHandler = require('../utils/asyncHandler');
const { withOptionalTransaction } = require('../utils/transactionManager');

const withSession = (session) => (session ? { session } : {});

/**
 * Get current user's profile
 * GET /api/profile
 */
exports.getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.userId).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let doctorProfile = null;
    if (user.role === 'doctor') {
        doctorProfile = await Doctor.findOne({ userId: req.user.userId }).lean();
    }

    res.json({ success: true, user, doctorProfile });
});

/**
 * Update current user's profile
 * PUT /api/profile
 */
exports.updateProfile = asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'address', 'dateOfBirth', 'gender', 'emergencyContact'];
    const updates = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await withOptionalTransaction(async ({ session }) => {
        const updatedUser = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, runValidators: true, ...withSession(session) }
        ).select('-password');

        if (!updatedUser) {
            res.status(404);
            throw new Error('User not found');
        }

        // Update doctor professional fields if applicable
        if (updatedUser.role === 'doctor') {
            const doctorFields = {};
            if (req.body.bio !== undefined) doctorFields.bio = req.body.bio;
            if (req.body.specialization !== undefined) doctorFields.specialization = req.body.specialization;
            if (req.body.department !== undefined) doctorFields.department = req.body.department;
            if (Object.keys(doctorFields).length > 0) {
                await Doctor.updateOne({ userId: req.user.userId }, { $set: doctorFields }, withSession(session));
            }
        }

        return updatedUser;
    });

    res.json({ success: true, user });
});
