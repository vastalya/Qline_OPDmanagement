const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        userAgent: {
            type: String,
            default: '',
        },
        ipAddress: {
            type: String,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
refreshTokenSchema.index({ userId: 1 });

// TTL index - MongoDB will automatically delete documents after expiresAt
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
