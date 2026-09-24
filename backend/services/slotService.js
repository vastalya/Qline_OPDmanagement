const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const {
    normalizeDate,
    parseTimeString,
    addMinutes,
    hasOverlap,
    getWeekdayName,
    normalizeWorkingDays,
    isDateWithinRange,
} = require('../utils/dateUtils');

const ACTIVE_APPOINTMENT_STATUSES = ['booked', 'waiting', 'in_progress', 'in_consultation'];

const isDoctorConfigured = (doctor) => (
    Boolean(
        doctor &&
        doctor.workingHours &&
        doctor.workingHours.start &&
        doctor.workingHours.end &&
        doctor.defaultConsultTime &&
        doctor.maxPatientsPerDay &&
        doctor.isConfigured
    )
);

const getNormalizedWorkingDays = (doctor) => {
    const workingDays = normalizeWorkingDays(doctor?.workingDays);
    return workingDays.length > 0 ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
};

const isDoctorInactiveOnDate = (doctor, date) => {
    if (!doctor) {
        return false;
    }

    if (doctor.inactiveFrom && doctor.inactiveUntil) {
        return isDateWithinRange(date, doctor.inactiveFrom, doctor.inactiveUntil);
    }

    return doctor.isActive === false;
};

const getDoctorAvailabilityForDate = (doctor, date) => {
    const normalizedDate = normalizeDate(date);
    const dayName = getWeekdayName(normalizedDate);

    if (!doctor) {
        return {
            available: false,
            reasonCode: 'doctor_not_found',
            message: 'Doctor not found',
            normalizedDate,
            dayName,
        };
    }

    if (!isDoctorConfigured(doctor)) {
        return {
            available: false,
            reasonCode: 'schedule_not_configured',
            message: 'Doctor has not fully configured their schedule',
            normalizedDate,
            dayName,
        };
    }

    const workingDays = getNormalizedWorkingDays(doctor);
    const isWorkingDay = workingDays.includes(dayName);

    if (!isWorkingDay) {
        return {
            available: false,
            reasonCode: 'non_working_day',
            message: `Doctor does not work on ${dayName}`,
            normalizedDate,
            dayName,
            workingDays,
            isWorkingDay: false,
        };
    }

    if (isDoctorInactiveOnDate(doctor, normalizedDate)) {
        return {
            available: false,
            reasonCode: 'doctor_inactive',
            message: doctor.inactiveReason
                ? `Doctor is unavailable: ${doctor.inactiveReason}`
                : 'Doctor is unavailable on the selected date',
            normalizedDate,
            dayName,
            workingDays,
            isWorkingDay: true,
            isInactive: true,
            inactiveFrom: doctor.inactiveFrom || null,
            inactiveUntil: doctor.inactiveUntil || null,
            inactiveReason: doctor.inactiveReason || '',
        };
    }

    return {
        available: true,
        reasonCode: 'available',
        message: 'Doctor is available on the selected date',
        normalizedDate,
        dayName,
        workingDays,
        isWorkingDay: true,
        isInactive: false,
        inactiveFrom: doctor.inactiveFrom || null,
        inactiveUntil: doctor.inactiveUntil || null,
        inactiveReason: doctor.inactiveReason || '',
    };
};

const buildBreakRanges = (doctor, normalizedDate) => (
    (doctor.breakSlots || []).map((slot) => ({
        ...slot,
        start: parseTimeString(slot.start, normalizedDate),
        end: parseTimeString(slot.end, normalizedDate),
    }))
);

const getDoctorById = async (doctorId, options = {}) => {
    if (options.doctorDoc) {
        return options.doctorDoc;
    }

    const query = Doctor.findById(doctorId);
    if (options.session) {
        query.session(options.session);
    }
    return query.exec();
};

const buildScheduleSnapshot = (doctor) => ({
    doctorId: doctor?._id || null,
    workingDays: getNormalizedWorkingDays(doctor),
    workingHours: doctor?.workingHours || null,
    consultationDuration: doctor?.defaultConsultTime || null,
    maxPatientsPerDay: doctor?.maxPatientsPerDay || null,
    breakSlots: doctor?.breakSlots || [],
    isActive: doctor?.isActive !== false,
    inactiveFrom: doctor?.inactiveFrom || null,
    inactiveUntil: doctor?.inactiveUntil || null,
    inactiveReason: doctor?.inactiveReason || '',
});

/**
 * Generate available time slots for a doctor on a specific date.
 * Returns schedule metadata so callers can explain why a day is unavailable.
 */
const generateSlots = async (doctorId, date, options = {}) => {
    const doctor = await getDoctorById(doctorId, options);
    const availability = getDoctorAvailabilityForDate(doctor, date);

    if (!doctor) {
        throw new Error('Doctor not found');
    }

    if (!isDoctorConfigured(doctor)) {
        throw new Error('Doctor has not fully configured their schedule');
    }

    if (!availability.available) {
        return {
            slots: [],
            availability,
            schedule: buildScheduleSnapshot(doctor),
        };
    }

    const normalizedDate = availability.normalizedDate;
    const workStart = parseTimeString(doctor.workingHours.start, normalizedDate);
    const workEnd = parseTimeString(doctor.workingHours.end, normalizedDate);
    const breaks = buildBreakRanges(doctor, normalizedDate);
    const slots = [];
    let currentTime = new Date(workStart);

    while (currentTime < workEnd) {
        const slotEnd = addMinutes(currentTime, doctor.defaultConsultTime);
        if (slotEnd > workEnd) {
            break;
        }

        const overlappingBreak = breaks.find((br) =>
            hasOverlap(currentTime, slotEnd, br.start, br.end)
        );

        if (!overlappingBreak) {
            slots.push({
                slotStart: new Date(currentTime).toISOString(),
                slotEnd: new Date(slotEnd).toISOString(),
                status: 'available',
                reasonCode: 'available',
            });
        }

        currentTime = slotEnd;
    }

    const appointmentQuery = Appointment.find({
        doctorId,
        date: normalizedDate,
        status: { $in: ACTIVE_APPOINTMENT_STATUSES },
    }).select('slotStart status');

    if (options.session) {
        appointmentQuery.session(options.session);
    }

    const existingAppointments = await appointmentQuery.lean();
    const bookedStartTimes = new Set(
        existingAppointments.map((appointment) => new Date(appointment.slotStart).toISOString())
    );
    const appointmentCount = existingAppointments.length;
    const remainingCapacity = Math.max(0, doctor.maxPatientsPerDay - appointmentCount);

    const hydratedSlots = slots.map((slot) => {
        if (bookedStartTimes.has(slot.slotStart)) {
            return {
                ...slot,
                status: 'booked',
                reasonCode: 'slot_booked',
            };
        }

        if (appointmentCount >= doctor.maxPatientsPerDay) {
            return {
                ...slot,
                status: 'unavailable',
                reasonCode: 'daily_limit_reached',
            };
        }

        return slot;
    });

    return {
        slots: hydratedSlots,
        availability: {
            ...availability,
            appointmentCount,
            remainingCapacity,
        },
        schedule: buildScheduleSnapshot(doctor),
    };
};

/**
 * Check if a specific slot is available for booking.
 */
const checkSlotAvailability = async (doctorId, date, slotStart, slotEnd, options = {}) => {
    const doctor = await getDoctorById(doctorId, options);

    if (!doctor || !isDoctorConfigured(doctor)) {
        return {
            available: false,
            message: 'Doctor has not fully configured their schedule',
            reasonCode: 'schedule_not_configured',
        };
    }

    const normalizedDate = normalizeDate(date);
    const slotDay = normalizeDate(slotStart);
    if (slotDay.getTime() !== normalizedDate.getTime()) {
        return {
            available: false,
            message: 'Slot date does not match booking date',
            reasonCode: 'slot_date_mismatch',
        };
    }

    const result = await generateSlots(doctorId, normalizedDate, {
        ...options,
        doctorDoc: doctor,
    });

    if (!result.availability.available) {
        return {
            available: false,
            message: result.availability.message,
            reasonCode: result.availability.reasonCode,
            schedule: result.schedule,
        };
    }

    const matchingSlot = result.slots.find((slot) =>
        new Date(slot.slotStart).getTime() === new Date(slotStart).getTime() &&
        new Date(slot.slotEnd).getTime() === new Date(slotEnd).getTime()
    );

    if (!matchingSlot) {
        return {
            available: false,
            message: 'Selected slot is not part of the doctor schedule',
            reasonCode: 'slot_not_generated',
            schedule: result.schedule,
        };
    }

    if (matchingSlot.status !== 'available') {
        const messageByReason = {
            slot_booked: 'This slot is already booked',
            daily_limit_reached: 'Doctor has reached maximum appointments for this day',
        };

        return {
            available: false,
            message: messageByReason[matchingSlot.reasonCode] || 'This slot is not available',
            reasonCode: matchingSlot.reasonCode,
            schedule: result.schedule,
        };
    }

    return {
        available: true,
        message: 'Slot is available',
        reasonCode: 'available',
        normalizedDate,
        doctor,
        schedule: result.schedule,
    };
};

/**
 * Find the next bookable slot from a starting date.
 */
const findNextAvailableSlot = async (doctorId, startDate, options = {}) => {
    const doctor = await getDoctorById(doctorId, options);
    if (!doctor || !isDoctorConfigured(doctor)) {
        return null;
    }

    const searchWindowDays = options.searchWindowDays || 30;
    const start = new Date(startDate);

    for (let index = 0; index < searchWindowDays; index += 1) {
        const candidateDate = new Date(start.getTime());
        candidateDate.setUTCDate(candidateDate.getUTCDate() + index);

        const slotResult = await generateSlots(doctorId, candidateDate, {
            ...options,
            doctorDoc: doctor,
        });

        if (!slotResult.availability.available) {
            continue;
        }

        const firstAvailableSlot = slotResult.slots.find((slot) => {
            if (slot.status !== 'available') {
                return false;
            }

            if (index === 0 && new Date(slot.slotStart) < start) {
                return false;
            }

            return true;
        });

        if (firstAvailableSlot) {
            return {
                ...firstAvailableSlot,
                date: slotResult.availability.normalizedDate,
                schedule: slotResult.schedule,
            };
        }
    }

    return null;
};

module.exports = {
    ACTIVE_APPOINTMENT_STATUSES,
    isDoctorConfigured,
    getNormalizedWorkingDays,
    isDoctorInactiveOnDate,
    getDoctorAvailabilityForDate,
    buildScheduleSnapshot,
    generateSlots,
    checkSlotAvailability,
    findNextAvailableSlot,
};
