const ConsultationHistory = require('../models/ConsultationHistory');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const cacheManager = require('../utils/cacheManager');
const logger = require('../utils/logger');

const CACHE_TTL_ESTIMATES = 600;
const WAITING_STATUSES = ['waiting', 'booked'];
const ACTIVE_CONSULTATION_STATUSES = ['in_consultation', 'in_progress'];
const CLOSED_STATUSES = ['completed', 'cancelled', 'no_show'];

const getFallbackConsultTime = async (doctorId) => {
    const doctor = await Doctor.findById(doctorId).select('defaultConsultTime averageConsultTime').lean();
    return doctor?.averageConsultTime || doctor?.defaultConsultTime || 15;
};

exports.getAverageConsultTime = async (doctorId) => {
    const cacheKey = `estimate:consultTime:${doctorId}`;
    const cached = await cacheManager.get(cacheKey);
    if (cached !== null) {
        return cached;
    }

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const stats = await ConsultationHistory.aggregate([
            {
                $match: {
                    doctorId,
                    startTime: { $gte: thirtyDaysAgo },
                    consultationDuration: { $gte: 1, $lte: 120 },
                },
            },
            {
                $group: {
                    _id: '$doctorId',
                    averageDuration: { $avg: '$consultationDuration' },
                    sampleSize: { $sum: 1 },
                },
            },
        ]);

        const average = stats[0]?.sampleSize >= 1
            ? Math.round(stats[0].averageDuration)
            : await getFallbackConsultTime(doctorId);

        await cacheManager.set(cacheKey, average, {
            ttl: CACHE_TTL_ESTIMATES,
            tags: [`doctor:${doctorId}`],
        });

        return average;
    } catch (error) {
        logger.error('Error calculating average consultation time:', error);
        return getFallbackConsultTime(doctorId);
    }
};

exports.estimateWaitTime = async (doctorId, patientsAhead) => {
    try {
        const avgConsult = await exports.getAverageConsultTime(doctorId);
        return Math.max(0, Math.round(Math.max(0, patientsAhead) * avgConsult));
    } catch (error) {
        logger.error('Error estimating wait time:', error);
        const fallback = await getFallbackConsultTime(doctorId);
        return Math.max(0, patientsAhead * fallback);
    }
};

exports.getPatientWaitInfo = async (appointmentId) => {
    try {
        const appointment = await Appointment.findById(appointmentId)
            .select('doctorId date status tokenNumber')
            .lean();

        if (!appointment) {
            throw new Error('Appointment not found');
        }

        if (CLOSED_STATUSES.includes(appointment.status)) {
            return {
                position: 0,
                patientsAhead: 0,
                estimatedWait: 0,
                currentToken: null,
                status: appointment.status,
            };
        }

        if (ACTIVE_CONSULTATION_STATUSES.includes(appointment.status)) {
            return {
                position: 1,
                patientsAhead: 0,
                estimatedWait: 0,
                currentToken: appointment.tokenNumber,
                status: 'in_consultation',
                message: 'Your turn now!',
            };
        }

        const [currentAppointment, waitingAppointments] = await Promise.all([
            Appointment.findOne({
                doctorId: appointment.doctorId,
                date: appointment.date,
                status: { $in: ACTIVE_CONSULTATION_STATUSES },
            })
                .select('tokenNumber')
                .lean(),
            Appointment.find({
                doctorId: appointment.doctorId,
                date: appointment.date,
                status: { $in: WAITING_STATUSES },
            })
                .select('_id tokenNumber')
                .sort({ tokenNumber: 1 })
                .lean(),
        ]);

        const waitingBeforeMe = waitingAppointments.filter((item) => (
            item.tokenNumber < appointment.tokenNumber &&
            item._id.toString() !== appointmentId.toString()
        )).length;

        const patientsAhead = waitingBeforeMe + (currentAppointment ? 1 : 0);
        const estimatedWait = await exports.estimateWaitTime(appointment.doctorId, patientsAhead);

        return {
            position: waitingBeforeMe + 1,
            patientsAhead,
            estimatedWait,
            currentToken: currentAppointment?.tokenNumber || null,
            yourToken: appointment.tokenNumber,
            status: appointment.status === 'booked' ? 'waiting' : appointment.status,
        };
    } catch (error) {
        logger.error('Error getting patient wait info:', error);
        throw error;
    }
};
