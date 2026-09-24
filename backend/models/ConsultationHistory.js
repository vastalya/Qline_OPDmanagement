const mongoose = require('mongoose');

const consultationHistorySchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
            index: true,
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true,
            index: true,
        },
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        startTime: {
            type: Date,
            required: true,
        },
        endTime: {
            type: Date,
            required: true,
        },
        consultationDuration: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    {
        timestamps: true,
    }
);

consultationHistorySchema.index({ doctorId: 1, createdAt: -1 });
consultationHistorySchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('ConsultationHistory', consultationHistorySchema);
