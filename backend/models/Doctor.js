const mongoose = require('mongoose');

const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const doctorSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        department: {
            type: String,
            required: [true, 'Department is required'],
        },
        defaultConsultTime: {
            type: Number, // in minutes
            default: 15,
            min: [5, 'Consultation time must be at least 5 minutes'],
        },
        maxPatientsPerDay: {
            type: Number,
            default: 50,
            min: [1, 'Must allow at least 1 patient per day'],
        },
        averageConsultTime: {
            type: Number,
            default: 15,
        },
        workingHours: {
            start: {
                type: String, // Format: "HH:MM"
                required: true,
            },
            end: {
                type: String, // Format: "HH:MM"
                required: true,
            },
        },
        breakSlots: [
            {
                start: String, // Format: "HH:MM"
                end: String, // Format: "HH:MM"
                reason: {
                    type: String,
                    trim: true,
                    default: '',
                },
            },
        ],
        workingDays: {
            type: [String],
            default: DEFAULT_WORKING_DAYS,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        inactiveFrom: {
            type: Date,
            default: null,
        },
        inactiveUntil: {
            type: Date,
            default: null,
        },
        inactiveReason: {
            type: String,
            trim: true,
            default: '',
        },
        leaveUntil: {
            type: Date,
            default: null
        },
        timezone: {
            type: String,
            default: 'UTC',
            // Common values: 'UTC', 'America/New_York', 'Asia/Kolkata', etc.
            // Defines how to interpret workingHours times
        },
        isConfigured: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
doctorSchema.index({ userId: 1 });
doctorSchema.index({ isActive: 1, inactiveFrom: 1, inactiveUntil: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
