const DailyQueue = require('../models/DailyQueue');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const QueueEvent = require('../models/QueueEvent');
const ConsultationHistory = require('../models/ConsultationHistory');
const notificationService = require('./notificationService');
const estimationService = require('./estimationService');
const cacheManager = require('../utils/cacheManager');
const { normalizeDate } = require('../utils/dateUtils');
const { withOptionalTransaction } = require('../utils/transactionManager');

const WAITING_STATUSES = ['waiting', 'booked'];
const ACTIVE_CONSULTATION_STATUSES = ['in_consultation', 'in_progress'];
const CLOSED_APPOINTMENT_STATUSES = ['completed', 'cancelled', 'no_show'];

const withSession = (session) => (session ? { session } : {});
const toRoomDate = (date) => normalizeDate(date).toISOString().split('T')[0];

const safePopulatePatient = (query) => query.populate('patientId', 'name email');

const buildQueueSeed = async (doctorId, date, session = null) => {
    const existingAppointments = await Appointment.find({
        doctorId,
        date,
        status: { $ne: 'cancelled' },
    }, null, withSession(session)).sort({ tokenNumber: 1 });

    return {
        doctorId,
        date,
        currentToken: null,
        appointmentCount: existingAppointments.length,
        lastTokenNumber: existingAppointments.at(-1)?.tokenNumber || 0,
        waitingList: existingAppointments.map((appointment) => ({
            appointmentId: appointment._id,
            tokenNumber: appointment.tokenNumber,
            status: ACTIVE_CONSULTATION_STATUSES.includes(appointment.status)
                ? 'in_consultation'
                : appointment.status === 'booked'
                    ? 'waiting'
                    : appointment.status,
        })),
        status: existingAppointments.length ? 'active' : 'closed',
    };
};

const createQueueIfMissing = async (doctorId, date, session = null) => {
    const normalizedDate = normalizeDate(date);
    let queue = await DailyQueue.findOne({ doctorId, date: normalizedDate }, null, withSession(session));

    if (!queue) {
        const seed = await buildQueueSeed(doctorId, normalizedDate, session);

        try {
            queue = await DailyQueue.findOneAndUpdate(
                { doctorId, date: normalizedDate },
                { $setOnInsert: seed },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                    ...withSession(session),
                }
            );
        } catch (error) {
            if (error?.code !== 11000) {
                throw error;
            }

            queue = await DailyQueue.findOne({ doctorId, date: normalizedDate }, null, withSession(session));
        }
    }

    if (!queue) {
        throw new Error('Failed to initialize daily queue');
    }

    return queue;
};

const recordQueueEvents = async (events, session = null) => {
    const payloads = Array.isArray(events) ? events : [events];

    if (payloads.length === 0) {
        return [];
    }

    return QueueEvent.insertMany(payloads, {
        ordered: true,
        ...withSession(session),
    });
};

const recordQueueEvent = async ({
    appointmentId,
    doctorId,
    patientId,
    queueId,
    event,
    previousEvent,
    metadata = {},
    session = null,
}) => {
    const payload = {
        appointmentId,
        doctorId,
        patientId,
        queueId,
        event,
        previousEvent,
        timestamp: new Date(),
        metadata,
    };

    const [eventDoc] = await recordQueueEvents([payload], session);
    return eventDoc;
};

const buildQueueStateInternal = async (doctorId, date, session = null) => {
    const normalizedDate = normalizeDate(date);
    const queue = await createQueueIfMissing(doctorId, normalizedDate, session);

    const appointments = await safePopulatePatient(
        Appointment.find({
            doctorId,
            date: normalizedDate,
        }, null, withSession(session)).sort({ tokenNumber: 1 })
    ).lean();

    const normalizedAppointments = appointments.map((appointment) => ({
        ...appointment,
        status: appointment.status === 'booked'
            ? 'waiting'
            : ACTIVE_CONSULTATION_STATUSES.includes(appointment.status)
                ? 'in_consultation'
                : appointment.status,
    }));

    const currentAppointment = normalizedAppointments.find((appointment) => appointment.status === 'in_consultation') || null;
    const waitingAppointments = normalizedAppointments.filter((appointment) => appointment.status === 'waiting');
    const nextPatient = waitingAppointments[0] || null;
    const activeQueue = normalizedAppointments.filter((appointment) => (
        appointment.status === 'waiting' || appointment.status === 'in_consultation'
    ));

    const averageConsultationTime = await estimationService.getAverageConsultTime(doctorId);
    const estimatedWaitMinutes = waitingAppointments.length * averageConsultationTime;
    const completedCount = normalizedAppointments.filter((appointment) => appointment.status === 'completed').length;
    const noShowCount = normalizedAppointments.filter((appointment) => appointment.status === 'no_show').length;
    const cancelledCount = normalizedAppointments.filter((appointment) => appointment.status === 'cancelled').length;

    queue.currentToken = currentAppointment?.tokenNumber ?? queue.currentToken ?? null;
    queue.appointmentCount = normalizedAppointments.filter((appointment) => appointment.status !== 'cancelled').length;
    queue.lastTokenNumber = normalizedAppointments.at(-1)?.tokenNumber || queue.lastTokenNumber || 0;
    queue.waitingList = normalizedAppointments.map((appointment) => ({
        appointmentId: appointment._id,
        tokenNumber: appointment.tokenNumber,
        status: appointment.status,
    }));

    if (activeQueue.length === 0) {
        queue.status = 'closed';
    } else if (queue.status === 'closed') {
        queue.status = 'active';
    }

    await queue.save(withSession(session));

    return {
        doctorId,
        date: normalizedDate,
        status: queue.status,
        currentToken: currentAppointment?.tokenNumber ?? queue.currentToken ?? null,
        currentPatient: currentAppointment
            ? {
                _id: currentAppointment._id,
                tokenNumber: currentAppointment.tokenNumber,
                patientId: currentAppointment.patientId,
                patientName: currentAppointment.patientId?.name || 'Patient',
                slotStart: currentAppointment.slotStart,
                status: currentAppointment.status,
            }
            : null,
        currentAppointment,
        nextPatient: nextPatient
            ? {
                _id: nextPatient._id,
                tokenNumber: nextPatient.tokenNumber,
                patientId: nextPatient.patientId,
                patientName: nextPatient.patientId?.name || 'Patient',
                slotStart: nextPatient.slotStart,
                status: nextPatient.status,
            }
            : null,
        queueList: activeQueue.map((appointment) => ({
            _id: appointment._id,
            tokenNumber: appointment.tokenNumber,
            patientId: appointment.patientId,
            patientName: appointment.patientId?.name || 'Patient',
            slotStart: appointment.slotStart,
            status: appointment.status,
            priority: appointment.priority || 'standard',
            priorityNote: appointment.priorityNote || '',
        })),
        waitingList: waitingAppointments.map((appointment) => ({
            tokenNumber: appointment.tokenNumber,
            patientName: appointment.patientId?.name || 'Patient',
            priority: appointment.priority || 'standard',
        })),
        appointments: normalizedAppointments,
        averageConsultationTime,
        estimatedWaitMinutes,
        waitingCount: waitingAppointments.length,
        patientsWaiting: waitingAppointments.length,
        counts: {
            waiting: waitingAppointments.length,
            inConsultation: currentAppointment ? 1 : 0,
            inProgress: currentAppointment ? 1 : 0,
            completed: completedCount,
            noShow: noShowCount,
            cancelled: cancelledCount,
            total: normalizedAppointments.length,
        },
    };
};

const emitQueueUpdated = async (doctorId, date, io) => {
    if (!io) {
        return null;
    }

    const state = await buildQueueStateInternal(doctorId, date);
    const roomDate = toRoomDate(date);
    io.to(`doctor:${doctorId}:${roomDate}`).emit('queue:updated', state);
    io.to(`doctor:${doctorId}:${roomDate}`).emit('queue:update', state);
    return state;
};

const updateIdempotency = async (queue, fields, session = null) => {
    Object.assign(queue, fields);
    await queue.save(withSession(session));
};

const promoteNextWaitingAppointment = async (doctorId, date, queue, session = null) => {
    const nextAppointment = await safePopulatePatient(
        Appointment.findOneAndUpdate(
            {
                doctorId,
                date,
                status: { $in: WAITING_STATUSES },
            },
            {
                $set: {
                    status: 'in_consultation',
                    consultationStartTime: new Date(),
                    consultationEndTime: null,
                    consultationDuration: null,
                },
            },
            {
                new: true,
                sort: { tokenNumber: 1 },
                ...withSession(session),
            }
        )
    );

    if (!nextAppointment) {
        queue.status = 'closed';
        return null;
    }

    queue.currentToken = nextAppointment.tokenNumber;
    queue.status = 'active';

    await recordQueueEvent({
        appointmentId: nextAppointment._id,
        doctorId,
        patientId: nextAppointment.patientId?._id || nextAppointment.patientId,
        queueId: queue._id,
        event: 'in_consultation',
        previousEvent: 'waiting',
        metadata: {
            tokenNumber: nextAppointment.tokenNumber,
        },
        session,
    });

    return nextAppointment;
};

const finalizeAppointment = async (appointment, doctorId, queue, finalStatus, session = null) => {
    const previousStatus = ACTIVE_CONSULTATION_STATUSES.includes(appointment.status)
        ? 'in_consultation'
        : appointment.status;

    appointment.status = finalStatus;
    appointment.consultationEndTime = new Date();

    if (finalStatus === 'completed') {
        const startTime = appointment.consultationStartTime || appointment.slotStart || new Date();
        const duration = Math.max(
            1,
            Math.round((appointment.consultationEndTime.getTime() - new Date(startTime).getTime()) / 60000)
        );

        appointment.consultationStartTime = startTime;
        appointment.consultationDuration = duration;

        await ConsultationHistory.findOneAndUpdate(
            { appointmentId: appointment._id },
            {
                appointmentId: appointment._id,
                doctorId,
                patientId: appointment.patientId,
                startTime,
                endTime: appointment.consultationEndTime,
                consultationDuration: duration,
            },
            {
                upsert: true,
                new: true,
                ...withSession(session),
            }
        );

        await cacheManager.delete(`estimate:consultTime:${doctorId}`);
        const averageConsultationTime = await estimationService.getAverageConsultTime(doctorId);
        await Doctor.findByIdAndUpdate(
            doctorId,
            { $set: { averageConsultTime: averageConsultationTime } },
            withSession(session)
        );
    }

    await appointment.save(withSession(session));

    await recordQueueEvent({
        appointmentId: appointment._id,
        doctorId,
        patientId: appointment.patientId,
        queueId: queue._id,
        event: finalStatus,
        previousEvent: previousStatus,
        metadata: {
            tokenNumber: appointment.tokenNumber,
            consultationDuration: appointment.consultationDuration || undefined,
        },
        session,
    });
};

const callNextPatient = async (doctorId, date, io, req) => {
    const normalizedDate = normalizeDate(date);
    const actionId = req?.headers?.['x-action-id'];

    const result = await withOptionalTransaction(async ({ session }) => {
        const queue = await createQueueIfMissing(doctorId, normalizedDate, session);

        if (queue.status === 'paused') {
            throw new Error('Queue is paused. Resume it before calling the next patient.');
        }

        if (actionId && queue.lastCallNextId === actionId && queue.lastCallNextResponse) {
            return queue.lastCallNextResponse;
        }

        const currentAppointment = await Appointment.findOne({
            doctorId,
            date: normalizedDate,
            status: { $in: ACTIVE_CONSULTATION_STATUSES },
        }, null, withSession(session));

        if (currentAppointment) {
            throw new Error('A patient is already in consultation');
        }

        const nextAppointment = await promoteNextWaitingAppointment(doctorId, normalizedDate, queue, session);

        let response;
        if (!nextAppointment) {
            response = {
                success: true,
                queueClosed: true,
                message: 'No patients waiting in the queue',
                currentToken: queue.currentToken ?? null,
            };
        } else {
            response = {
                success: true,
                currentToken: nextAppointment.tokenNumber,
                appointment: {
                    _id: nextAppointment._id,
                    patientId: nextAppointment.patientId?._id || nextAppointment.patientId,
                    patientName: nextAppointment.patientId?.name || 'Patient',
                    tokenNumber: nextAppointment.tokenNumber,
                    priority: nextAppointment.priority || 'standard',
                    priorityNote: nextAppointment.priorityNote || '',
                },
            };
        }

        if (actionId) {
            await updateIdempotency(queue, {
                lastCallNextId: actionId,
                lastCallNextResponse: response,
            }, session);
        } else {
            await queue.save(withSession(session));
        }

        return {
            ...response,
            __postCommit: {
                nextAppointmentId: nextAppointment?._id || null,
                nextPatientId: nextAppointment?.patientId?._id || nextAppointment?.patientId || null,
            },
        };
    });

    await emitQueueUpdated(doctorId, normalizedDate, io);

    if (result.__postCommit?.nextAppointmentId && result.__postCommit?.nextPatientId) {
        io?.to(`user:${result.__postCommit.nextPatientId}`).emit('appointment:status-changed', {
            appointmentId: result.__postCommit.nextAppointmentId,
            newStatus: 'in_consultation',
            doctorId,
            date: normalizedDate,
            timestamp: new Date(),
        });

        const nextAppointment = await Appointment.findById(result.__postCommit.nextAppointmentId)
            .populate('patientId', 'name email');
        if (nextAppointment) {
            notificationService.sendTokenCalledNotification(nextAppointment, io).catch(() => {});
        }
    }

    const { __postCommit, ...response } = result;
    return response;
};

const transitionCurrentAppointment = async (doctorId, date, io, req, finalStatus) => {
    const normalizedDate = normalizeDate(date);
    const actionId = req?.headers?.['x-action-id'];
    const idField = finalStatus === 'completed' ? 'lastCompleteId' : 'lastNoShowId';
    const responseField = finalStatus === 'completed' ? 'lastCompleteResponse' : 'lastNoShowResponse';

    const result = await withOptionalTransaction(async ({ session }) => {
        const queue = await createQueueIfMissing(doctorId, normalizedDate, session);

        if (actionId && queue[idField] === actionId && queue[responseField]) {
            return queue[responseField];
        }

        const currentAppointment = await Appointment.findOne({
            doctorId,
            date: normalizedDate,
            status: { $in: ACTIVE_CONSULTATION_STATUSES },
        }, null, withSession(session));

        if (!currentAppointment) {
            throw new Error('No patient is currently in consultation');
        }

        await finalizeAppointment(currentAppointment, doctorId, queue, finalStatus, session);
        const nextAppointment = await promoteNextWaitingAppointment(doctorId, normalizedDate, queue, session);

        const response = {
            success: true,
            [finalStatus === 'completed' ? 'completedToken' : 'noShowToken']: currentAppointment.tokenNumber,
            nextToken: nextAppointment?.tokenNumber || null,
            queueClosed: !nextAppointment,
        };

        if (actionId) {
            await updateIdempotency(queue, {
                [idField]: actionId,
                [responseField]: response,
            }, session);
        } else {
            await queue.save(withSession(session));
        }

        return {
            ...response,
            __postCommit: {
                finishedAppointmentId: currentAppointment._id,
                finishedPatientId: currentAppointment.patientId,
                nextAppointmentId: nextAppointment?._id || null,
                nextPatientId: nextAppointment?.patientId?._id || nextAppointment?.patientId || null,
            },
        };
    });

    await emitQueueUpdated(doctorId, normalizedDate, io);

    io?.to(`user:${result.__postCommit.finishedPatientId}`).emit('appointment:status-changed', {
        appointmentId: result.__postCommit.finishedAppointmentId,
        newStatus: finalStatus,
        doctorId,
        date: normalizedDate,
        timestamp: new Date(),
    });

    if (result.__postCommit.nextAppointmentId && result.__postCommit.nextPatientId) {
        io?.to(`user:${result.__postCommit.nextPatientId}`).emit('appointment:status-changed', {
            appointmentId: result.__postCommit.nextAppointmentId,
            newStatus: 'in_consultation',
            doctorId,
            date: normalizedDate,
            timestamp: new Date(),
        });

        const nextAppointment = await Appointment.findById(result.__postCommit.nextAppointmentId)
            .populate('patientId', 'name email');
        if (nextAppointment) {
            notificationService.sendTokenCalledNotification(nextAppointment, io).catch(() => {});
        }
    }

    const { __postCommit, ...response } = result;
    return response;
};

const markCompleted = async (doctorId, date, io, req) => transitionCurrentAppointment(
    doctorId,
    date,
    io,
    req,
    'completed'
);

const markNoShow = async (doctorId, date, io, req) => transitionCurrentAppointment(
    doctorId,
    date,
    io,
    req,
    'no_show'
);

const pauseQueue = async (doctorId, date, io) => {
    const normalizedDate = normalizeDate(date);

    await withOptionalTransaction(async ({ session }) => {
        const queue = await createQueueIfMissing(doctorId, normalizedDate, session);

        if (queue.status === 'closed') {
            throw new Error('Cannot pause a closed queue');
        }

        queue.status = 'paused';
        await queue.save(withSession(session));
    });

    await emitQueueUpdated(doctorId, normalizedDate, io);
    io?.to(`doctor:${doctorId}:${toRoomDate(normalizedDate)}`).emit('queue:paused', {
        doctorId,
        date: normalizedDate,
        status: 'paused',
        timestamp: new Date(),
    });

    return { success: true, message: 'Queue paused successfully' };
};

const resumeQueue = async (doctorId, date, io) => {
    const normalizedDate = normalizeDate(date);

    await withOptionalTransaction(async ({ session }) => {
        const queue = await createQueueIfMissing(doctorId, normalizedDate, session);

        if (queue.status === 'closed') {
            queue.status = 'active';
        } else {
            queue.status = 'active';
        }

        await queue.save(withSession(session));
    });

    await emitQueueUpdated(doctorId, normalizedDate, io);
    io?.to(`doctor:${doctorId}:${toRoomDate(normalizedDate)}`).emit('queue:resumed', {
        doctorId,
        date: normalizedDate,
        status: 'active',
        timestamp: new Date(),
    });

    return { success: true, message: 'Queue resumed successfully' };
};

const getQueueState = async (doctorId, date) => buildQueueStateInternal(doctorId, date);

module.exports = {
    WAITING_STATUSES,
    ACTIVE_CONSULTATION_STATUSES,
    CLOSED_APPOINTMENT_STATUSES,
    createQueueIfMissing,
    recordQueueEvents,
    recordQueueEvent,
    emitQueueUpdated,
    getQueueState,
    callNextPatient,
    markCompleted,
    markNoShow,
    pauseQueue,
    resumeQueue,
};
