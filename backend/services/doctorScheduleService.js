const DoctorSchedule = require('../models/DoctorSchedule');
const { normalizeWorkingDays } = require('../utils/dateUtils');

const DEFAULT_WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const syncDoctorSchedule = async (doctor, session = null) => {
    if (!doctor?._id) {
        return null;
    }

    const payload = {
        doctorId: doctor._id,
        workingDays: normalizeWorkingDays(doctor.workingDays || []).length
            ? normalizeWorkingDays(doctor.workingDays || [])
            : DEFAULT_WORKING_DAYS,
        startTime: doctor.workingHours?.start || '09:00',
        endTime: doctor.workingHours?.end || '17:00',
        consultationDuration: doctor.defaultConsultTime || 15,
        maxPatientsPerDay: doctor.maxPatientsPerDay || 30,
        breakSlots: doctor.breakSlots || [],
        isActive: doctor.isActive !== false,
        inactiveFrom: doctor.inactiveFrom || null,
        inactiveUntil: doctor.inactiveUntil || null,
        inactiveReason: doctor.inactiveReason || '',
    };

    const options = {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
    };

    if (session) {
        options.session = session;
    }

    return DoctorSchedule.findOneAndUpdate(
        { doctorId: doctor._id },
        { $set: payload },
        options
    );
};

module.exports = {
    syncDoctorSchedule,
};
