const mongoose = require('mongoose');

const doctorScheduleSchema = new mongoose.Schema(
    {
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true,
            unique: true,
        },
        workingDays: {
            type: [String],
            default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        },
        startTime: {
            type: String,
            required: true,
            default: '09:00',
        },
        endTime: {
            type: String,
            required: true,
            default: '17:00',
        },
        consultationDuration: {
            type: Number,
            required: true,
            default: 15,
        },
        maxPatientsPerDay: {
            type: Number,
            required: true,
            default: 30,
        },
        breakSlots: [
            {
                start: String,
                end: String,
                reason: {
                    type: String,
                    default: '',
                },
            },
        ],
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
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('DoctorSchedule', doctorScheduleSchema);
