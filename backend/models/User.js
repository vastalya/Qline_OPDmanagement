const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                'Please enter a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default in queries
        },
        role: {
            type: String,
            enum: ['patient', 'doctor', 'admin'],
            required: [true, 'Role is required'],
        },
        status: {
            type: String,
            enum: ['active', 'suspended'],
            default: 'active',
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        city: {
            type: String,
            trim: true,
        },
        state: {
            type: String,
            trim: true,
        },
        zipCode: {
            type: String,
            trim: true,
        },
        dateOfBirth: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other', ''],
            default: '',
        },
        emergencyContactName: {
            type: String,
            trim: true,
        },
        emergencyContactPhone: {
            type: String,
            trim: true,
        },
        emailVerified: {
            type: Boolean,
            default: false,
        },
        emailVerificationToken: {
            type: String,
            select: false,
        },
        emailVerificationExpires: {
            type: Date,
            select: false,
        },
        passwordResetToken: {
            type: String,
            select: false,
        },
        passwordResetExpires: {
            type: Date,
            select: false,
        },
        settings: {
            account: {
                alternateEmail: { type: String, trim: true, lowercase: true },
                locale: { type: String, default: 'en-US' },
                displayName: { type: String, trim: true },
            },
            notifications: {
                globalMute: { type: Boolean, default: false },
                preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
            },
            preferences: {
                timezone: { type: String, default: 'UTC' },
                dateFormat: { type: String, default: 'MM/DD/YYYY' },
                timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
                language: { type: String, default: 'en-US' },
                reducedMotion: { type: Boolean, default: false },
                highContrast: { type: Boolean, default: false },
                fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
            },
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
