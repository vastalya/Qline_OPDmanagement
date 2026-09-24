const mongoose = require('mongoose');

/**
 * Queue Event Schema
 * Tracks all state transitions for appointments in the queue
 * Critical for accurate wait time and flow analytics
 */
const queueEventSchema = new mongoose.Schema({
    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
        index: true
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    queueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DailyQueue'
    },
    event: {
        type: String,
        enum: ['created', 'waiting', 'called', 'in_progress', 'in_consultation', 'completed', 'cancelled', 'no_show', 'rescheduled'],
        required: true
    },
    previousEvent: {
        type: String,
        enum: ['created', 'waiting', 'called', 'in_progress', 'in_consultation', 'completed', 'cancelled', 'no_show', 'rescheduled']
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    metadata: {
        tokenNumber: Number,
        position: Number,
        estimatedWaitTime: Number,
        actualWaitTime: Number, // In minutes
        delayReason: String
    }
}, {
    timestamps: true
});

// Compound indexes for efficient analytics queries
queueEventSchema.index({ doctorId: 1, timestamp: -1 }); // Doctor history
queueEventSchema.index({ queueId: 1, event: 1 }); // Queue status
queueEventSchema.index({ appointmentId: 1, timestamp: 1 }); // Appointment lifecycle
queueEventSchema.index({ event: 1, timestamp: -1 }); // Global event stream

module.exports = mongoose.model('QueueEvent', queueEventSchema);
