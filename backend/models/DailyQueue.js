const mongoose = require('mongoose');

const dailyQueueSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        currentToken: {
            type: Number,
            default: 0,
        },
        // Atomic counter for daily capacity enforcement
        appointmentCount: {
            type: Number,
            default: 0,
            min: 0, // Prevent negative counts
        },
        // Sequential token assignment (never decrements)
        lastTokenNumber: {
            type: Number,
            default: 0,
        },
        waitingList: [
            {
                appointmentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Appointment',
                },
                tokenNumber: Number,
                status: {
                    type: String,
                    enum: ['waiting', 'in_progress', 'in_consultation', 'completed', 'cancelled', 'no_show'],
                    default: 'waiting',
                },
            },
        ],
        // Queue status for pause/resume/close functionality
        status: {
            type: String,
            enum: ['active', 'paused', 'closed'],
            default: 'active',
        },
        // Rate limiting - last action timestamp
        lastActionAt: {
            type: Date,
            default: null,
        },
        // Per-action-type idempotency (prevents cross-action ID collision)
        lastCallNextId: {
            type: String,
            default: null,
        },
        lastCompleteId: {
            type: String,
            default: null,
        },
        lastNoShowId: {
            type: String,
            default: null,
        },
        // Cached responses for idempotent replay
        lastCallNextResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        lastCompleteResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        lastNoShowResponse: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// CRITICAL: Compound unique index for doctor and date
// Prevents duplicate queue creation when multiple transactions run simultaneously
dailyQueueSchema.index({ doctorId: 1, date: 1 }, { unique: true });

// TTL index to auto-delete old queues after 30 days
// Prevents indefinite DB growth
dailyQueueSchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model('DailyQueue', dailyQueueSchema);
