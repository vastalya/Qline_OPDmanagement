const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');
const ConsultationHistory = require('../models/ConsultationHistory');
const asyncHandler = require('../utils/asyncHandler');
const { normalizeDate, isInPast, getSlotDuration } = require('../utils/dateUtils');
const notificationService = require('../services/notificationService');
const { checkSlotAvailability, findNextAvailableSlot } = require('../services/slotService');
const queueService = require('../services/queueService');
const { autoCarryForwardPastAppointmentsForDoctor } = require('../services/appointmentCarryForwardService');
const { withOptionalTransaction } = require('../utils/transactionManager');

const WAITING_STATUSES = ['waiting', 'booked'];
const ACTIVE_CONSULTATION_STATUSES = ['in_consultation', 'in_progress'];
const REBOOKABLE_STATUSES = ['waiting', 'booked', 'in_consultation', 'in_progress'];
const withSession = (session) => (session ? { session } : {});

const emitQueueUpdates = async (doctorId, dates, io) => {
    const uniqueDates = [...new Set(dates.map((date) => normalizeDate(date).toISOString()))];
    await Promise.all(
        uniqueDates.map((dateValue) => (
            queueService.emitQueueUpdated(doctorId, new Date(dateValue), io)
        ))
    );
};

const loadAuthorizedAppointmentForUser = async (appointmentId, userId, session = null) => {
    const appointment = await Appointment.findById(appointmentId, null, withSession(session));
    if (!appointment) {
        throw new Error('Appointment not found');
    }

    const doctor = await Doctor.findById(appointment.doctorId, null, withSession(session));
    const isPatient = appointment.patientId.toString() === userId;
    const isDoctor = doctor && doctor.userId.toString() === userId;

    if (!isPatient && !isDoctor) {
        throw new Error('Unauthorized to access this appointment');
    }

    return { appointment, doctor, isPatient, isDoctor };
};

const moveAppointmentToSlot = async ({
    appointment,
    doctor,
    newDate,
    slotStartDate,
    slotEndDate,
    session = null,
    queueEvent = 'rescheduled',
}) => {
    const previousDate = normalizeDate(appointment.date);
    const previousSlotStart = new Date(appointment.slotStart);

    const oldQueue = await queueService.createQueueIfMissing(appointment.doctorId, appointment.date, session);
    const newQueue = await queueService.createQueueIfMissing(appointment.doctorId, newDate, session);
    const sameQueue = oldQueue._id.toString() === newQueue._id.toString();
    const nextTokenNumber = (newQueue.lastTokenNumber || 0) + 1;

    const previousEvent = appointment.status === 'booked' ? 'waiting' : appointment.status;
    appointment.date = newDate;
    appointment.slotStart = slotStartDate;
    appointment.slotEnd = slotEndDate;
    appointment.tokenNumber = nextTokenNumber;
    appointment.status = 'waiting';
    appointment.consultationStartTime = undefined;
    appointment.consultationEndTime = undefined;
    appointment.consultationDuration = undefined;
    await appointment.save(withSession(session));

    if (sameQueue) {
        await DailyQueue.findByIdAndUpdate(
            newQueue._id,
            {
                $pull: { waitingList: { appointmentId: appointment._id } },
            },
            withSession(session)
        );
        await DailyQueue.findByIdAndUpdate(
            newQueue._id,
            {
                $inc: { lastTokenNumber: 1 },
                $set: { status: 'active' },
                $push: {
                    waitingList: {
                        appointmentId: appointment._id,
                        tokenNumber: appointment.tokenNumber,
                        status: 'waiting',
                    },
                },
            },
            withSession(session)
        );
    } else {
        await DailyQueue.findByIdAndUpdate(
            oldQueue._id,
            {
                $inc: { appointmentCount: -1 },
                $pull: { waitingList: { appointmentId: appointment._id } },
            },
            withSession(session)
        );

        await DailyQueue.findByIdAndUpdate(
            newQueue._id,
            {
                $inc: { appointmentCount: 1, lastTokenNumber: 1 },
                $set: { status: 'active' },
                $push: {
                    waitingList: {
                        appointmentId: appointment._id,
                        tokenNumber: appointment.tokenNumber,
                        status: 'waiting',
                    },
                },
            },
            withSession(session)
        );
    }

    await queueService.recordQueueEvents([{
        appointmentId: appointment._id,
        doctorId: appointment.doctorId,
        patientId: appointment.patientId,
        queueId: newQueue._id,
        event: queueEvent,
        previousEvent,
        timestamp: new Date(),
        metadata: {
            tokenNumber: appointment.tokenNumber,
        },
    }], session);

    return {
        appointment,
        previousDate,
        previousSlotStart,
        nextDate: newDate,
        doctor,
    };
};

/**
 * @desc    Book an appointment slot (Transaction-safe with conditional atomic increment)
 * @route   POST /api/appointments/book
 * @access  Private (Patient only)
 */
const bookAppointment = asyncHandler(async (req, res) => {
    const { doctorId, date, slotStart, slotEnd } = req.body;
    const patientId = req.user.userId;

    const dateObj = new Date(date);
    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(slotEnd);

    // 1. Fetch doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor || !doctor.workingHours || !doctor.defaultConsultTime || !doctor.maxPatientsPerDay || !doctor.isConfigured) {
        res.status(400);
        throw new Error('Doctor has not fully configured their schedule');
    }

    // 2. Normalize date
    const normalizedDate = normalizeDate(dateObj);

    // 3. Validate slot day matches
    const slotDay = normalizeDate(slotStartDate);
    if (slotDay.getTime() !== normalizedDate.getTime()) {
        res.status(400);
        throw new Error('Slot must be on the same day as booking date');
    }

    // 4. Validate time range
    if (slotEndDate <= slotStartDate) {
        res.status(400);
        throw new Error('Invalid slot time range');
    }

    // 5. Validate slot duration
    const duration = getSlotDuration(slotStartDate, slotEndDate);
    const expectedDuration = doctor.defaultConsultTime * 60 * 1000;
    if (Math.abs(duration - expectedDuration) > 1000) {
        res.status(400);
        throw new Error(`Slot duration must be exactly ${doctor.defaultConsultTime} minutes`);
    }

    // 6. Check not in past
    if (isInPast(slotStartDate)) {
        res.status(400);
        throw new Error('Cannot book appointments in the past');
    }

    // 7. Validate generated slot against working days, inactive periods, breaks, occupancy, and daily limit
    const slotCheck = await checkSlotAvailability(
        doctorId,
        normalizedDate,
        slotStartDate,
        slotEndDate,
        { doctorDoc: doctor }
    );
    if (!slotCheck.available) {
        res.status(slotCheck.reasonCode === 'slot_booked' ? 409 : 400);
        throw new Error(slotCheck.message);
    }

    // 8. Atomic increment queue count (upsert creates queue if not exists)
    const bookingResult = await withOptionalTransaction(async ({ session }) => {
        const queue = await queueService.createQueueIfMissing(doctorId, normalizedDate, session);

        if ((queue.appointmentCount || 0) >= doctor.maxPatientsPerDay) {
            res.status(400);
            throw new Error('Doctor has reached maximum appointments for this day');
        }

        queue.appointmentCount = (queue.appointmentCount || 0) + 1;
        queue.lastTokenNumber = (queue.lastTokenNumber || 0) + 1;
        const tokenNumber = queue.lastTokenNumber;

        let createdAppointment;
        try {
            createdAppointment = await Appointment.insertMany([{
                doctorId,
                patientId,
                date: normalizedDate,
                slotStart: slotStartDate,
                slotEnd: slotEndDate,
                tokenNumber,
                status: 'waiting',
            }], {
                ordered: true,
                ...withSession(session),
            });
        } catch (err) {
            if (err.code === 11000) {
                res.status(409);
                throw new Error('This slot is no longer available');
            }
            throw err;
        }

        const appointment = createdAppointment[0];
        queue.waitingList.push({
            appointmentId: appointment._id,
            tokenNumber,
            status: 'waiting',
        });
        queue.status = 'active';
        await queue.save(withSession(session));

        await queueService.recordQueueEvents([
            {
                appointmentId: appointment._id,
                doctorId,
                patientId,
                queueId: queue._id,
                event: 'created',
                timestamp: new Date(),
                metadata: { tokenNumber, estimatedWaitTime: 0 },
            },
            {
                appointmentId: appointment._id,
                doctorId,
                patientId,
                queueId: queue._id,
                event: 'waiting',
                previousEvent: 'created',
                timestamp: new Date(),
                metadata: { tokenNumber, position: queue.appointmentCount },
            },
        ], session);

        return {
            appointment,
            tokenNumber,
        };
    });

    // Notifications (best-effort)
    notificationService
        .sendAppointmentBookedNotification(bookingResult.appointment, req.app.get('io'))
        .catch(() => {});

    await queueService.emitQueueUpdated(doctorId, normalizedDate, req.app.get('io'));

    res.status(201).json({
        success: true,
        appointment: bookingResult.appointment,
        message: `Appointment booked successfully. Token number: ${bookingResult.tokenNumber}`,
    });
});

/**
 * @desc    Get patient's appointments (upcoming and past)
 * @route   GET /api/appointments/my-appointments
 * @access  Private (Patient only)
 */
const getMyAppointments = asyncHandler(async (req, res) => {
    const patientId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '10', 10)));

    const total = await Appointment.countDocuments({ patientId });
    const appointments = await Appointment.find({ patientId })
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .sort({ slotStart: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

    const pages = Math.ceil(total / limit);

    // Reshape so frontend can read appt.doctorId.name and appt.doctorId.department
    const shaped = appointments.map((a) => ({
        ...a,
        doctorId: a.doctorId
            ? { ...a.doctorId, name: a.doctorId.userId?.name }
            : null,
    }));

    res.status(200).json({
        success: true,
        data: shaped,
        total,
        page,
        pages,
    });
});

/**
 * @desc    Get doctor's appointments for a specific date
 * @route   GET /api/appointments/doctor-appointments?date=YYYY-MM-DD
 * @access  Private (Doctor only)
 */
const getDoctorAppointments = asyncHandler(async (req, res) => {
    const { date, status, page = 1, limit = 100 } = req.query;

    if (!date) {
        res.status(400);
        throw new Error('Date query parameter is required');
    }

    const doctor = await Doctor.findOne({ userId: req.user.userId });

    if (!doctor) {
        res.status(404);
        throw new Error('Doctor profile not found');
    }

    await autoCarryForwardPastAppointmentsForDoctor({
        doctor,
        io: req.app.get('io'),
    });

    const normalizedDate = normalizeDate(new Date(date));

    const filter = {
        doctorId: doctor._id,
        date: normalizedDate,
    };

    if (status) {
        filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const [appointments, total] = await Promise.all([
        Appointment.find(filter)
        .populate('patientId', 'name email')
        .sort({ slotStart: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
        Appointment.countDocuments(filter),
    ]);

    res.status(200).json({
        success: true,
        date: normalizedDate,
        count: appointments.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        appointments,
    });
});

/**
 * @desc    Cancel an appointment (Patient or Doctor)
 * @route   DELETE /api/appointments/:id/cancel
 * @access  Private (Patient or Doctor who owns the appointment)
 */
const cancelAppointment = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const userId = req.user.userId;
    const cancelled = await withOptionalTransaction(async ({ session }) => {
        const { appointment } = await loadAuthorizedAppointmentForUser(appointmentId, userId, session);

        if (appointment.status === 'cancelled') {
            throw new Error('Appointment already cancelled');
        }

        if (appointment.status === 'completed' || appointment.status === 'no_show') {
            throw new Error('Closed appointments cannot be cancelled');
        }

        const previousStatus = appointment.status === 'booked' ? 'waiting' : appointment.status;
        appointment.status = 'cancelled';
        await appointment.save(withSession(session));

        const queue = await queueService.createQueueIfMissing(appointment.doctorId, appointment.date, session);
        queue.appointmentCount = Math.max(0, (queue.appointmentCount || 0) - 1);
        queue.waitingList = (queue.waitingList || []).map((entry) => (
            entry.appointmentId?.toString() === appointmentId
                ? { ...entry.toObject?.() || entry, status: 'cancelled' }
                : entry
        ));
        await queue.save(withSession(session));

        await queueService.recordQueueEvents([{
            appointmentId: appointment._id,
            doctorId: appointment.doctorId,
            patientId: appointment.patientId,
            queueId: queue._id,
            event: 'cancelled',
            previousEvent: previousStatus,
            timestamp: new Date(),
            metadata: {
                tokenNumber: appointment.tokenNumber,
            },
        }], session);

        return appointment;
    });

    await queueService.emitQueueUpdated(cancelled.doctorId, cancelled.date, req.app.get('io'));

    res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
    });
});

/**
 * @desc    Reschedule an appointment
 * @route   PATCH /api/appointments/:id/reschedule
 * @access  Private (Patient owner or treating doctor)
 */
const rescheduleAppointment = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const { date, slotStart, slotEnd } = req.body;
    const userId = req.user.userId;

    const newDate = normalizeDate(new Date(date));
    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(slotEnd);

    if (slotEndDate <= slotStartDate) {
        res.status(400);
        throw new Error('Invalid slot time range');
    }

    if (isInPast(slotStartDate)) {
        res.status(400);
        throw new Error('Cannot reschedule to a past slot');
    }

    const result = await withOptionalTransaction(async ({ session }) => {
        const { appointment, doctor } = await loadAuthorizedAppointmentForUser(appointmentId, userId, session);

        if (!REBOOKABLE_STATUSES.includes(appointment.status)) {
            throw new Error('This appointment can no longer be rescheduled');
        }

        if (ACTIVE_CONSULTATION_STATUSES.includes(appointment.status)) {
            throw new Error('Appointments already in consultation cannot be rescheduled');
        }

        const slotCheck = await checkSlotAvailability(
            appointment.doctorId,
            newDate,
            slotStartDate,
            slotEndDate,
            { doctorDoc: doctor, session }
        );

        if (!slotCheck.available) {
            res.status(slotCheck.reasonCode === 'slot_booked' ? 409 : 400);
            throw new Error(slotCheck.message);
        }

        return moveAppointmentToSlot({
            appointment,
            doctor,
            newDate,
            slotStartDate,
            slotEndDate,
            session,
            queueEvent: 'rescheduled',
        });
    });

    await emitQueueUpdates(result.appointment.doctorId, [result.previousDate, result.nextDate], req.app.get('io'));

    res.status(200).json({
        success: true,
        message: 'Appointment rescheduled successfully',
        appointment: result.appointment,
    });
});

/**
 * @desc    Reassign an active appointment to the next available slot
 * @route   POST /api/appointments/:id/reassign-next-available
 * @access  Private (Patient owner or treating doctor)
 */
const reassignAppointmentToNextAvailable = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const userId = req.user.userId;

    const result = await withOptionalTransaction(async ({ session }) => {
        const { appointment, doctor } = await loadAuthorizedAppointmentForUser(appointmentId, userId, session);

        if (!REBOOKABLE_STATUSES.includes(appointment.status)) {
            throw new Error('This appointment can no longer be reassigned');
        }

        if (appointment.status === 'completed' || appointment.status === 'cancelled' || appointment.status === 'no_show') {
            throw new Error('Closed appointments cannot be reassigned');
        }

        const searchStart = new Date(Math.max(
            Date.now(),
            new Date(appointment.slotEnd || appointment.slotStart || appointment.date).getTime() + 60 * 1000
        ));

        const nextSlot = await findNextAvailableSlot(appointment.doctorId, searchStart, {
            session,
            doctorDoc: doctor,
            searchWindowDays: 45,
        });

        if (!nextSlot) {
            res.status(404);
            throw new Error('No future slot is available for reassignment');
        }

        return moveAppointmentToSlot({
            appointment,
            doctor,
            newDate: normalizeDate(nextSlot.date),
            slotStartDate: new Date(nextSlot.slotStart),
            slotEndDate: new Date(nextSlot.slotEnd),
            session,
            queueEvent: 'rescheduled',
        });
    });

    await emitQueueUpdates(result.appointment.doctorId, [result.previousDate, result.nextDate], req.app.get('io'));

    notificationService
        .sendAppointmentRescheduledNotification({
            patientId: result.appointment.patientId,
            appointmentId: result.appointment._id,
            doctorId: result.appointment.doctorId,
            doctorName: result.doctor?.userId?.name || null,
            previousSlotStart: result.previousSlotStart,
            newSlotStart: result.appointment.slotStart,
            reason: 'Appointment moved to the next available slot',
        }, req.app.get('io'))
        .catch(() => {});

    res.status(200).json({
        success: true,
        message: 'Appointment reassigned to the next available slot',
        appointment: result.appointment,
    });
});


/**
 * @desc    Set priority for an appointment (doctor only)
 * @route   PATCH /api/appointments/:id/priority
 * @access  Private (Doctor only)
 */
const setPriority = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const { priority, priorityNote } = req.body;
    const doctorUserId = req.user.userId;

    const validPriorities = ['emergency', 'senior', 'standard'];
    if (!validPriorities.includes(priority)) {
        res.status(400);
        throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    const doctor = await require('../models/Doctor').findOne({ userId: doctorUserId }).lean();
    if (!doctor) {
        res.status(403);
        throw new Error('Doctor profile not found');
    }

    const appointment = await Appointment.findOneAndUpdate(
        { _id: appointmentId, doctorId: doctor._id },
        { $set: { priority, priorityNote: priorityNote || '' } },
        { new: true }
    );

    if (!appointment) {
        res.status(404);
        throw new Error('Appointment not found or you do not have permission');
    }

    // Emit real-time update so queue display re-sorts
    const io = req.app.get('io');
    if (io) {
        io.to(`doctor:${doctor._id}:${appointment.date.toISOString().split('T')[0]}`).emit('queue:priority-updated', {
            appointmentId: appointment._id,
            tokenNumber: appointment.tokenNumber,
            priority,
            priorityNote
        });
    }

    res.status(200).json({
        success: true,
        message: `Appointment priority set to ${priority}`,
        appointment: {
            _id: appointment._id,
            tokenNumber: appointment.tokenNumber,
            priority: appointment.priority,
            priorityNote: appointment.priorityNote
        }
    });
});

/**
 * @desc    Get live wait time estimate for patient
 * @route   GET /api/appointments/:id/wait-info
 * @access  Private (Patient)
 */
const getWaitInfo = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const { estimationService } = require('../services/estimationService');

    // Verify ownership: allow patient to query their own appointment
    const appointment = await Appointment.findById(appointmentId)
        .select('patientId doctorId status')
        .lean();

    if (!appointment) {
        res.status(404);
        throw new Error('Appointment not found');
    }

    if (appointment.patientId.toString() !== req.user.userId) {
        res.status(403);
        throw new Error('Not authorized to view this appointment');
    }

    const waitInfo = await require('../services/estimationService').getPatientWaitInfo(appointmentId);

    res.status(200).json({
        success: true,
        ...waitInfo
    });
});

/**
 * @desc    Get a single appointment by ID
 * @route   GET /api/appointments/:id
 * @access  Private (patient who owns it or the associated doctor)
 */
const getAppointmentById = asyncHandler(async (req, res) => {
    const { id: appointmentId } = req.params;
    const { userId, role } = req.user;

    const appointment = await Appointment.findById(appointmentId)
        .populate('patientId', 'name email')
        .populate({ path: 'doctorId', populate: { path: 'userId', select: 'name' } })
        .lean();

    if (!appointment) {
        res.status(404);
        throw new Error('Appointment not found');
    }

    // Authorisation: patient owns it, or doctor is the treating doctor
    const isPatient = appointment.patientId?._id?.toString() === userId;
    const Doctor = require('../models/Doctor');
    let isDoctor = false;
    if (role === 'doctor') {
        const doc = await Doctor.findOne({ userId }).lean();
        isDoctor = doc && doc._id.toString() === appointment.doctorId?._id?.toString();
    }

    if (!isPatient && !isDoctor && role !== 'admin') {
        res.status(403);
        throw new Error('Not authorised to view this appointment');
    }

    // Reshape doctorId to include name
    const shaped = {
        ...appointment,
        doctorId: appointment.doctorId
            ? { ...appointment.doctorId, name: appointment.doctorId.userId?.name }
            : null,
    };

    res.status(200).json({ success: true, data: shaped });
});

module.exports = {
    bookAppointment,
    getMyAppointments,
    getDoctorAppointments,
    cancelAppointment,
    setPriority,
    getWaitInfo,
    getAppointmentById,
    rescheduleAppointment,
    reassignAppointmentToNextAvailable,
};

