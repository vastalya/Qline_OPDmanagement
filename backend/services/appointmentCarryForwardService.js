const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');
const notificationService = require('./notificationService');
const queueService = require('./queueService');
const { findNextAvailableSlot } = require('./slotService');
const { normalizeDate } = require('../utils/dateUtils');
const { withOptionalTransaction } = require('../utils/transactionManager');

const REASSIGNABLE_STATUSES = ['waiting', 'booked', 'in_consultation', 'in_progress'];
const withSession = (session) => (session ? { session } : {});

const emitQueueUpdates = async (doctorId, dates, io) => {
    if (!io) {
        return;
    }

    const uniqueDates = [...new Set(dates.map((date) => normalizeDate(date).toISOString()))];
    await Promise.all(
        uniqueDates.map((dateValue) => (
            queueService.emitQueueUpdated(doctorId, new Date(dateValue), io)
        ))
    );
};

const reassignSingleAppointment = async ({ appointmentId, doctor, io }) => {
    const result = await withOptionalTransaction(async ({ session }) => {
        const appointment = await Appointment.findById(appointmentId, null, withSession(session));
        if (!appointment) {
            return null;
        }

        const today = normalizeDate(new Date());
        if (
            !REASSIGNABLE_STATUSES.includes(appointment.status) ||
            normalizeDate(appointment.date).getTime() >= today.getTime()
        ) {
            return null;
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
            return null;
        }

        const previousDate = normalizeDate(appointment.date);
        const previousSlotStart = new Date(appointment.slotStart);
        const newDate = normalizeDate(nextSlot.date);

        const oldQueue = await queueService.createQueueIfMissing(appointment.doctorId, appointment.date, session);
        const newQueue = await queueService.createQueueIfMissing(appointment.doctorId, newDate, session);
        const sameQueue = oldQueue._id.toString() === newQueue._id.toString();
        const nextTokenNumber = (newQueue.lastTokenNumber || 0) + 1;

        const previousEvent = appointment.status === 'booked' ? 'waiting' : appointment.status;
        appointment.date = newDate;
        appointment.slotStart = new Date(nextSlot.slotStart);
        appointment.slotEnd = new Date(nextSlot.slotEnd);
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
            event: 'rescheduled',
            previousEvent,
            timestamp: new Date(),
            metadata: {
                tokenNumber: appointment.tokenNumber,
            },
        }], session);

        return {
            appointment: appointment.toObject(),
            previousDate,
            nextDate: newDate,
            previousSlotStart,
        };
    });

    if (!result) {
        return null;
    }

    await emitQueueUpdates(result.appointment.doctorId, [result.previousDate, result.nextDate], io);

    await notificationService.sendAppointmentRescheduledNotification({
        patientId: result.appointment.patientId,
        appointmentId: result.appointment._id,
        doctorId: result.appointment.doctorId,
        doctorName: doctor?.userId?.name || null,
        previousSlotStart: result.previousSlotStart,
        newSlotStart: result.appointment.slotStart,
        reason: 'Pending past appointment moved to the next available slot',
    }, io).catch(() => null);

    return result;
};

const autoCarryForwardPastAppointmentsForDoctor = async ({
    doctor,
    io,
    limit = 20,
}) => {
    if (!doctor?._id || !doctor?.isConfigured) {
        return {
            reassignedCount: 0,
            appointments: [],
        };
    }

    const today = normalizeDate(new Date());
    const staleAppointments = await Appointment.find({
        doctorId: doctor._id,
        date: { $lt: today },
        status: { $in: REASSIGNABLE_STATUSES },
    })
        .sort({ date: 1, tokenNumber: 1 })
        .select('_id')
        .limit(limit)
        .lean();

    const carried = [];
    for (const item of staleAppointments) {
        const moved = await reassignSingleAppointment({
            appointmentId: item._id,
            doctor,
            io,
        });
        if (moved) {
            carried.push(moved.appointment);
        }
    }

    return {
        reassignedCount: carried.length,
        appointments: carried,
    };
};

module.exports = {
    autoCarryForwardPastAppointmentsForDoctor,
};
