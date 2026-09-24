const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        slotStart: {
            type: Date,
            required: true,
        },
        slotEnd: {
            type: Date,
            required: true,
        },
        tokenNumber: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ['booked', 'waiting', 'in_progress', 'in_consultation', 'completed', 'cancelled', 'no_show'],
            default: 'waiting',
        },
        reminderSent: {
            type: Boolean,
            default: false
        },
        consultationStartTime: Date,
        consultationEndTime: Date,
        consultationDuration: Number, // in minutes
        // Phase 5.2: Priority Queue
        priority: {
            type: String,
            enum: ['emergency', 'senior', 'standard'],
            default: 'standard',
            index: true
        },
        priorityNote: {
            type: String, // Optional reason (e.g., "Chest pain", "Age 75+")
            maxLength: 200
        }
    },
    {
        timestamps: true,
    }
);

// CRITICAL: Compound unique index with partial filter - DB-level slot lock
// Allows rebooking cancelled slots while preventing double booking of active slots
appointmentSchema.index(
    { doctorId: 1, date: 1, slotStart: 1 },
    {
        unique: true,
        partialFilterExpression: { status: { $ne: 'cancelled' } }
    }
);

// Performance indexes
appointmentSchema.index({ doctorId: 1, date: 1 });
appointmentSchema.index({ patientId: 1 });
appointmentSchema.index({ slotStart: 1 });
// Optimize status-based queries (for slot generation)
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
// CRITICAL: Composite index for efficient queue queries (Phase 3)
// Enables fast sorted retrieval of waiting patients
appointmentSchema.index({
    doctorId: 1,
    date: 1,
    status: 1,
    tokenNumber: 1
});

// Phase 5.2: Priority-aware queue ordering
// emergency < senior < standard, then by tokenNumber
appointmentSchema.index({
    doctorId: 1,
    date: 1,
    status: 1,
    priority: 1,
    tokenNumber: 1
});

module.exports = mongoose.model('Appointment', appointmentSchema);
