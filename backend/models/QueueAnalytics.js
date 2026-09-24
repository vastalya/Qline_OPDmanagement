const mongoose = require('mongoose');

const queueAnalyticsSchema = new mongoose.Schema({
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },

    // Daily statistics
    totalAppointments: {
        type: Number,
        default: 0
    },
    completedAppointments: {
        type: Number,
        default: 0
    },
    cancelledAppointments: {
        type: Number,
        default: 0
    },
    noShowAppointments: {
        type: Number,
        default: 0
    },

    // Time statistics (in minutes)
    averageWaitTime: {
        type: Number,
        default: 0
    },
    averageConsultTime: {
        type: Number,
        default: 0
    },
    totalWorkingTime: {
        type: Number,
        default: 0
    },

    // Queue flow
    peakHour: {
        type: String // Format: "HH:00"
    },
    pausedDuration: {
        type: Number,
        default: 0 // Total pause time in minutes
    },

    // Performance metrics
    patientsSeen: {
        type: Number,
        default: 0
    },
    efficiencyRate: {
        type: Number,
        default: 0 // completed / total (percentage)
    },

    // Hourly breakdown
    hourlyStats: [{
        hour: { type: Number }, // 0-23
        appointmentsScheduled: { type: Number },
        appointmentsCompleted: { type: Number },
        averageWaitTime: { type: Number }
    }],

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Composite index for efficient queries
queueAnalyticsSchema.index({ doctorId: 1, date: -1 });

// Unique constraint - one analytics record per doctor per day
queueAnalyticsSchema.index({ doctorId: 1, date: 1 }, { unique: true });

const QueueAnalytics = mongoose.model('QueueAnalytics', queueAnalyticsSchema);

module.exports = QueueAnalytics;
