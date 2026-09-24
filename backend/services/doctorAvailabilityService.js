const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const notificationService = require('./notificationService');
const { normalizeDate } = require('../utils/dateUtils');
const { findNextAvailableSlot } = require('./slotService');
const { withOptionalTransaction } = require('../utils/transactionManager');
const { syncDoctorSchedule } = require('./doctorScheduleService');

const REBOOKABLE_STATUSES = ['waiting', 'booked'];
const withSession = (session) => (session ? { session } : {});

const getDayAfter = (dateInput) => {
    const nextDay = normalizeDate(dateInput);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return nextDay;
};

const getEndOfInactiveRangeExclusive = (inactiveUntil) => {
    const end = normalizeDate(inactiveUntil);
    end.setUTCDate(end.getUTCDate() + 1);
    return end;
};

const emitQueueRefreshes = async (doctorId, dates, io) => {
    if (!io) {
        return;
    }

    const queueService = require('./queueService');
    await Promise.all(
        [...new Set(dates.map((date) => normalizeDate(date).toISOString()))].map((dateValue) => (
            queueService.emitQueueUpdated(doctorId, new Date(dateValue), io)
        ))
    );
};

const updateAvailability = async ({
    doctorId,
    isActive,
    inactiveFrom,
    inactiveUntil,
    inactiveReason,
    handlingMode = 'reschedule',
    io,
}) => {
    const queuedNotifications = [];

    const result = await withOptionalTransaction(async ({ session }) => {
        const doctor = await Doctor.findById(doctorId)
            .populate('userId', 'name')
            .session(session || null);

        if (!doctor) {
            throw new Error('Doctor profile not found');
        }

        if (isActive) {
            doctor.isActive = true;
            doctor.inactiveFrom = null;
            doctor.inactiveUntil = null;
            doctor.inactiveReason = '';
            await doctor.save(withSession(session));
            await syncDoctorSchedule(doctor, session);

            return {
                doctor,
                handledAppointments: 0,
                rescheduledAppointments: 0,
                cancelledAppointments: 0,
                affectedDates: [],
            };
        }

        const fromDate = normalizeDate(inactiveFrom);
        const untilDate = normalizeDate(inactiveUntil);

        doctor.isActive = false;
        doctor.inactiveFrom = fromDate;
        doctor.inactiveUntil = untilDate;
        doctor.inactiveReason = inactiveReason || '';
        await doctor.save(withSession(session));
        await syncDoctorSchedule(doctor, session);

        const affectedAppointments = await Appointment.find({
            doctorId,
            status: { $in: REBOOKABLE_STATUSES },
            slotStart: {
                $gte: fromDate,
                $lt: getEndOfInactiveRangeExclusive(untilDate),
            },
        })
            .sort({ slotStart: 1, createdAt: 1 })
            .session(session || null);

        let rescheduledAppointments = 0;
        let cancelledAppointments = 0;
        const affectedDates = [];
        const doctorName = doctor.userId?.name || null;
        const searchStart = getDayAfter(untilDate);

        for (const appointment of affectedAppointments) {
            const previousSlotStart = new Date(appointment.slotStart);
            const previousDate = normalizeDate(appointment.date);
            affectedDates.push(previousDate);
            const queueService = require('./queueService');
            const oldQueue = await queueService.createQueueIfMissing(doctorId, previousDate, session);
            oldQueue.appointmentCount = Math.max(0, (oldQueue.appointmentCount || 0) - 1);
            oldQueue.waitingList = (oldQueue.waitingList || []).filter(
                (entry) => entry.appointmentId?.toString() !== appointment._id.toString()
            );
            await oldQueue.save(withSession(session));

            if (handlingMode === 'reschedule') {
                const nextSlot = await findNextAvailableSlot(doctorId, searchStart, {
                    session,
                    doctorDoc: doctor,
                    searchWindowDays: 45,
                });

                if (nextSlot) {
                    const newDate = normalizeDate(nextSlot.date);
                    const newQueue = await queueService.createQueueIfMissing(doctorId, newDate, session);
                    newQueue.appointmentCount = (newQueue.appointmentCount || 0) + 1;
                    newQueue.lastTokenNumber = (newQueue.lastTokenNumber || 0) + 1;
                    appointment.date = newDate;
                    appointment.slotStart = new Date(nextSlot.slotStart);
                    appointment.slotEnd = new Date(nextSlot.slotEnd);
                    appointment.tokenNumber = newQueue.lastTokenNumber;
                    appointment.status = 'waiting';
                    appointment.consultationStartTime = undefined;
                    appointment.consultationEndTime = undefined;
                    appointment.consultationDuration = undefined;
                    await appointment.save(withSession(session));

                    newQueue.waitingList.push({
                        appointmentId: appointment._id,
                        tokenNumber: appointment.tokenNumber,
                        status: 'waiting',
                    });
                    newQueue.status = 'active';
                    await newQueue.save(withSession(session));

                    queuedNotifications.push({
                        type: 'rescheduled',
                        appointmentId: appointment._id,
                        patientId: appointment.patientId,
                        doctorId,
                        doctorName,
                        previousSlotStart,
                        newSlotStart: appointment.slotStart,
                        reason: doctor.inactiveReason,
                    });
                    affectedDates.push(newDate);
                    rescheduledAppointments += 1;
                    continue;
                }
            }

            appointment.status = 'cancelled';
            await appointment.save(withSession(session));
            queuedNotifications.push({
                type: 'cancelled',
                appointmentId: appointment._id,
                patientId: appointment.patientId,
                doctorId,
                doctorName,
                previousSlotStart,
                reason: doctor.inactiveReason,
            });
            cancelledAppointments += 1;
        }

        return {
            doctor,
            handledAppointments: affectedAppointments.length,
            rescheduledAppointments,
            cancelledAppointments,
            affectedDates,
        };
    });

    await Promise.allSettled(
        queuedNotifications.map((event) => (
            event.type === 'rescheduled'
                ? notificationService.sendAppointmentRescheduledNotification({
                    patientId: event.patientId,
                    appointmentId: event.appointmentId,
                    doctorId: event.doctorId,
                    doctorName: event.doctorName,
                    previousSlotStart: event.previousSlotStart,
                    newSlotStart: event.newSlotStart,
                    reason: event.reason,
                }, io)
                : notificationService.sendDoctorUnavailableNotification({
                    patientId: event.patientId,
                    appointmentId: event.appointmentId,
                    doctorId: event.doctorId,
                    doctorName: event.doctorName,
                    slotStart: event.previousSlotStart,
                    reason: event.reason,
                    cancelled: true,
                }, io)
        ))
    );

    await emitQueueRefreshes(doctorId, result.affectedDates || [], io);

    if (io) {
        io.to(`doctor:${doctorId}`).emit('doctor:availability-updated', {
            doctorId,
            isActive,
            inactiveFrom: isActive ? null : normalizeDate(inactiveFrom),
            inactiveUntil: isActive ? null : normalizeDate(inactiveUntil),
            inactiveReason: isActive ? '' : inactiveReason || '',
        });
    }

    return result;
};

module.exports = {
    updateAvailability,
};
