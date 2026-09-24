const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const {
    validateTimeFormat,
    validateBreakSlots,
    normalizeWorkingDays,
    normalizeDate,
} = require('../utils/dateUtils');
const {
    buildScheduleSnapshot,
    generateSlots,
    getDoctorAvailabilityForDate,
    getNormalizedWorkingDays,
    findNextAvailableSlot,
} = require('../services/slotService');
const { updateAvailability } = require('../services/doctorAvailabilityService');
const estimationService = require('../services/estimationService');
const { syncDoctorSchedule } = require('../services/doctorScheduleService');
const { autoCarryForwardPastAppointmentsForDoctor } = require('../services/appointmentCarryForwardService');
const cacheManager = require('../utils/cacheManager');
const logger = require('../utils/logger');
const { withOptionalTransaction } = require('../utils/transactionManager');

const withSession = (session) => (session ? { session } : {});

const serializeDoctorSchedule = (doctor) => {
    const todayAvailability = getDoctorAvailabilityForDate(doctor, new Date());

    return {
        id: doctor._id,
        department: doctor.department,
        workingHours: doctor.workingHours,
        breakSlots: doctor.breakSlots || [],
        workingDays: getNormalizedWorkingDays(doctor),
        defaultConsultTime: doctor.defaultConsultTime,
        maxPatientsPerDay: doctor.maxPatientsPerDay,
        isConfigured: doctor.isConfigured,
        isActive: doctor.isActive !== false,
        inactiveFrom: doctor.inactiveFrom || null,
        inactiveUntil: doctor.inactiveUntil || null,
        inactiveReason: doctor.inactiveReason || '',
        availabilityStatus: {
            isAvailableToday: todayAvailability.available,
            reasonCode: todayAvailability.reasonCode,
            message: todayAvailability.message,
        },
    };
};

const buildWaitTimeSummary = async (doctor) => {
    const today = normalizeDate(new Date());
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const waitingCount = await Appointment.countDocuments({
        doctorId: doctor._id,
        slotStart: { $gte: today, $lt: tomorrow },
        status: { $in: ['waiting', 'booked'] },
    });

    const avgTime = await estimationService.getAverageConsultTime(doctor._id);
    const estimatedWaitTime = avgTime * waitingCount;
    const nextAvailableSlot = await findNextAvailableSlot(doctor._id, new Date(), {
        doctorDoc: doctor,
        searchWindowDays: 14,
    });

    return {
        estimatedWaitMinutes: Math.round(estimatedWaitTime),
        patientsInQueue: waitingCount,
        averageConsultationTime: avgTime,
        description: `${Math.round(estimatedWaitTime)} min wait, ${waitingCount} in queue`,
        nextAvailableSlot: nextAvailableSlot?.slotStart || null,
    };
};

/**
 * @desc    Configure doctor's schedule
 * @route   POST /api/doctors/configure
 * @access  Private (Doctor only)
 */
const configureSchedule = asyncHandler(async (req, res) => {
    const {
        department,
        workingHours,
        breakSlots = [],
        defaultConsultTime,
        maxPatientsPerDay,
        workingDays,
    } = req.body;

    if (!workingHours || !validateTimeFormat(workingHours.start) || !validateTimeFormat(workingHours.end)) {
        res.status(400);
        throw new Error('Invalid time format. Use HH:MM format');
    }

    if (workingHours.start >= workingHours.end) {
        res.status(400);
        throw new Error('Working hours end time must be after start time');
    }

    for (const breakSlot of breakSlots) {
        if (!validateTimeFormat(breakSlot.start) || !validateTimeFormat(breakSlot.end)) {
            res.status(400);
            throw new Error('Invalid break time format. Use HH:MM format');
        }
    }
    validateBreakSlots(breakSlots, workingHours);

    if (defaultConsultTime < 5 || defaultConsultTime > 120) {
        res.status(400);
        throw new Error('Consultation time must be between 5 and 120 minutes');
    }

    if (maxPatientsPerDay < 1 || maxPatientsPerDay > 200) {
        res.status(400);
        throw new Error('Max patients per day must be between 1 and 200');
    }

    const normalizedWorkingDayList = normalizeWorkingDays(workingDays || []);
    if ((workingDays && workingDays.length > 0) && normalizedWorkingDayList.length === 0) {
        res.status(400);
        throw new Error('At least one valid working day is required');
    }

    const doctor = await withOptionalTransaction(async ({ session }) => {
        let doctorDoc = await Doctor.findOne({ userId: req.user.userId }, null, withSession(session));

        if (doctorDoc) {
            doctorDoc.department = department || doctorDoc.department;
            doctorDoc.workingHours = workingHours;
            doctorDoc.breakSlots = breakSlots;
            doctorDoc.workingDays = normalizedWorkingDayList.length > 0
                ? normalizedWorkingDayList
                : getNormalizedWorkingDays(doctorDoc);
            doctorDoc.defaultConsultTime = defaultConsultTime;
            doctorDoc.maxPatientsPerDay = maxPatientsPerDay;
            doctorDoc.isConfigured = true;
            await doctorDoc.save(withSession(session));
        } else {
            doctorDoc = new Doctor({
                userId: req.user.userId,
                department,
                workingHours,
                breakSlots,
                workingDays: normalizedWorkingDayList.length > 0
                    ? normalizedWorkingDayList
                    : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                defaultConsultTime,
                maxPatientsPerDay,
                isConfigured: true,
            });
            await doctorDoc.save(withSession(session));
        }

        await syncDoctorSchedule(doctorDoc, session);
        return doctorDoc;
    });

    await cacheManager.invalidateByTag(`doctor:${doctor._id}:slots`);
    logger.info(`Cache invalidated for doctor ${doctor._id} after schedule update`);

    res.status(200).json({
        success: true,
        doctor: serializeDoctorSchedule(doctor),
    });
});

/**
 * @desc    Update doctor active/inactive availability window
 * @route   PATCH /api/doctors/availability
 * @access  Private (Doctor only)
 */
const updateAvailabilityStatus = asyncHandler(async (req, res) => {
    const {
        isActive,
        inactiveFrom,
        inactiveUntil,
        inactiveReason,
        handlingMode = 'reschedule',
    } = req.body;

    const doctor = await Doctor.findOne({ userId: req.user.userId }).select('_id').lean();
    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    if (typeof isActive !== 'boolean') {
        res.status(400);
        throw new Error('isActive must be provided as a boolean');
    }

    if (!isActive) {
        if (!inactiveFrom || !inactiveUntil) {
            res.status(400);
            throw new Error('Unavailable from and until dates are required');
        }

        const fromDate = new Date(inactiveFrom);
        const untilDate = new Date(inactiveUntil);
        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(untilDate.getTime())) {
            res.status(400);
            throw new Error('Inactive dates must be valid ISO 8601 dates');
        }

        if (normalizeDate(fromDate) > normalizeDate(untilDate)) {
            res.status(400);
            throw new Error('Unavailable until date must be on or after unavailable from date');
        }
    }

    const result = await updateAvailability({
        doctorId: doctor._id,
        isActive,
        inactiveFrom,
        inactiveUntil,
        inactiveReason,
        handlingMode,
        io: req.app.get('io'),
    });

    await cacheManager.invalidateByTag(`doctor:${doctor._id}:slots`);
    res.status(200).json({
        success: true,
        doctor: serializeDoctorSchedule(result.doctor),
        handledAppointments: result.handledAppointments,
        rescheduledAppointments: result.rescheduledAppointments,
        cancelledAppointments: result.cancelledAppointments,
    });
});

/**
 * @desc    Get logged-in doctor's schedule configuration
 * @route   GET /api/doctors/my-schedule
 * @access  Private (Doctor only)
 */
const getMySchedule = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ userId: req.user.userId });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    const carryForward = await autoCarryForwardPastAppointmentsForDoctor({
        doctor,
        io: req.app.get('io'),
    });

    res.status(200).json({
        success: true,
        doctor: serializeDoctorSchedule(doctor),
        autoReassignedAppointments: carryForward.reassignedCount,
    });
});

/**
 * @desc    Get available slots for a doctor on a specific date
 * @route   GET /api/doctors/:id/slots?date=YYYY-MM-DD
 * @access  Public
 */
const getAvailableSlots = asyncHandler(async (req, res) => {
    const { id: doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
        res.status(400);
        throw new Error('Date query parameter is required');
    }

    const dateObj = new Date(date);
    if (Number.isNaN(dateObj.getTime())) {
        res.status(400);
        throw new Error('Invalid date format');
    }

    const result = await generateSlots(doctorId, dateObj);

    res.status(200).json({
        success: true,
        date,
        doctorId,
        slots: result.slots,
        availability: result.availability,
        schedule: result.schedule,
    });
});

/**
 * @desc    Get today's appointments for logged-in doctor
 * @route   GET /api/doctors/today-appointments
 * @access  Private (Doctor only)
 */
const getTodayAppointments = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findOne({ userId: req.user.userId });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    await autoCarryForwardPastAppointmentsForDoctor({
        doctor,
        io: req.app.get('io'),
    });

    const today = normalizeDate(new Date());

    const appointments = await Appointment.find({
        doctorId: doctor._id,
        date: today,
    })
        .populate('patientId', 'name email')
        .sort({ slotStart: 1 })
        .lean();

    res.status(200).json({
        success: true,
        date: today,
        count: appointments.length,
        appointments,
    });
});

/**
 * @desc    Search/list doctors
 * @route   GET /api/doctors
 * @access  Public
 */
const searchDoctors = asyncHandler(async (req, res) => {
    const { q, department, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    let userIds;
    if (q) {
        const matchedUsers = await User.find(
            { name: { $regex: q, $options: 'i' } },
            '_id'
        ).lean();
        userIds = matchedUsers.map((user) => user._id);
    }

    const filter = {};
    if (userIds) {
        filter.userId = { $in: userIds };
    }
    if (department) {
        filter.department = department;
    }

    const total = await Doctor.countDocuments(filter);
    const doctors = await Doctor.find(filter)
        .populate('userId', 'name email')
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

    const pages = Math.ceil(total / limitNum);

    const doctorsWithDetails = await Promise.all(
        doctors.map(async (doctor) => ({
            ...doctor,
            user: doctor.userId,
            schedule: buildScheduleSnapshot(doctor),
            availabilityStatus: getDoctorAvailabilityForDate(doctor, new Date()),
            waitingTime: await buildWaitTimeSummary(doctor),
            nextAvailableSlot: (await findNextAvailableSlot(doctor._id, new Date(), {
                doctorDoc: doctor,
                searchWindowDays: 14,
            }))?.slotStart || null,
        }))
    );

    res.status(200).json({
        success: true,
        data: doctorsWithDetails,
        total,
        page: pageNum,
        pages,
    });
});

/**
 * @desc    Get a single doctor profile by ID
 * @route   GET /api/doctors/:id
 * @access  Public
 */
const getDoctorById = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.params.id)
        .populate('userId', 'name email')
        .lean();

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor not found');
    }

    res.status(200).json({
        success: true,
        data: {
            ...doctor,
            user: doctor.userId,
            schedule: buildScheduleSnapshot(doctor),
            availabilityStatus: getDoctorAvailabilityForDate(doctor, new Date()),
            waitingTime: await buildWaitTimeSummary(doctor),
            nextAvailableSlot: (await findNextAvailableSlot(doctor._id, new Date(), {
                doctorDoc: doctor,
                searchWindowDays: 14,
            }))?.slotStart || null,
        },
    });
});

module.exports = {
    configureSchedule,
    updateAvailabilityStatus,
    getMySchedule,
    getAvailableSlots,
    getTodayAppointments,
    searchDoctors,
    getDoctorById,
};
