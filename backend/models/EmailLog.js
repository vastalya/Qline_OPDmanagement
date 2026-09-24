const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
    {
        recipient: {
            type: String,
            required: true,
            index: true
        },
        subject: {
            type: String,
            required: true
        },
        htmlBody: {
            type: String
        },
        textBody: {
            type: String
        },
        status: {
            type: String,
            enum: ['pending', 'sent', 'failed', 'retrying'],
            default: 'pending',
            index: true
        },
        provider: {
            type: String,
            enum: ['sendgrid', 'smtp', 'none']
        },
        attempts: {
            type: Number,
            default: 0
        },
        maxAttempts: {
            type: Number,
            default: 3
        },
        lastAttemptAt: {
            type: Date
        },
        sentAt: {
            type: Date
        },
        error: {
            type: String
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed
        }
    },
    {
        timestamps: true
    }
);

// Indexes for efficient querying
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ recipient: 1, status: 1 });
emailLogSchema.index({ status: 1, attempts: 1, lastAttemptAt: 1 }); // For retry job

module.exports = mongoose.model('EmailLog', emailLogSchema);
