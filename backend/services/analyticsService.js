const QueueAnalytics = require('../models/QueueAnalytics');
const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');
const { normalizeDate } = require('../utils/dateUtils');
const logger = require('../utils/logger');

/**
 * Calculate and store daily analytics for a doctor
 */
exports.calculateDailyAnalytics = async (doctorId, date) => {
    try {
        const normalizedDate = normalizeDate(date);

        // Fetch all appointments for the day (lean = no mongoose overhead for reads)
        const appointments = await Appointment.find({
            doctorId,
            date: normalizedDate
        }).sort({ slotStart: 1 }).lean();

        if (appointments.length === 0) {
            logger.info(`No appointments found for doctor ${doctorId} on ${normalizedDate}`);
            return null;
        }

        // Calculate statistics
        const totalAppointments = appointments.length;
        const completedAppointments = appointments.filter(a => a.status === 'completed').length;
        const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
        const noShowAppointments = appointments.filter(a => a.status === 'no_show').length;

        // Calculate average wait time and consult time
        // This requires queue event history which we'll approximate
        const completedAppts = appointments.filter(a => a.status === 'completed');
        let totalConsultTime = 0;

        completedAppts.forEach(appt => {
            const consultTime = (new Date(appt.slotEnd) - new Date(appt.slotStart)) / (1000 * 60);
            totalConsultTime += consultTime;
        });

        const averageConsultTime = completedAppts.length > 0
            ? totalConsultTime / completedAppts.length
            : 0;

        // Calculate hourly stats
        const hourlyStats = {};
        appointments.forEach(appt => {
            const hour = new Date(appt.slotStart).getUTCHours();
            if (!hourlyStats[hour]) {
                hourlyStats[hour] = {
                    hour,
                    appointmentsScheduled: 0,
                    appointmentsCompleted: 0,
                    averageWaitTime: 0
                };
            }
            hourlyStats[hour].appointmentsScheduled++;
            if (appt.status === 'completed') {
                hourlyStats[hour].appointmentsCompleted++;
            }
        });

        // Find peak hour
        let peakHour = '09:00';
        let maxAppointments = 0;
        Object.values(hourlyStats).forEach(stat => {
            if (stat.appointmentsScheduled > maxAppointments) {
                maxAppointments = stat.appointmentsScheduled;
                peakHour = `${String(stat.hour).padStart(2, '0')}:00`;
            }
        });

        // Calculate efficiency rate
        const efficiencyRate = totalAppointments > 0
            ? (completedAppointments / totalAppointments) * 100
            : 0;

        // Create or update analytics
        const analytics = await QueueAnalytics.findOneAndUpdate(
            { doctorId, date: normalizedDate },
            {
                totalAppointments,
                completedAppointments,
                cancelledAppointments,
                noShowAppointments,
                averageWaitTime: 0, // Would need queue event history
                averageConsultTime: Math.round(averageConsultTime),
                totalWorkingTime: Math.round(totalConsultTime),
                peakHour,
                pausedDuration: 0, // Would need queue pause history
                patientsSeen: completedAppointments,
                efficiencyRate: Math.round(efficiencyRate * 100) / 100,
                hourlyStats: Object.values(hourlyStats)
            },
            { upsert: true, new: true }
        );

        logger.info(`Analytics calculated for doctor ${doctorId} on ${normalizedDate}`);
        return analytics;

    } catch (error) {
        logger.error('Error calculating daily analytics:', error);
        throw error;
    }
};

/**
 * Get analytics for a date range
 */
exports.getAnalytics = async (doctorId, startDate, endDate) => {
    try {
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);

        const analytics = await QueueAnalytics.find({
            doctorId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        // Calculate aggregated stats
        const aggregated = {
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            noShowAppointments: 0,
            averageWaitTime: 0,
            averageConsultTime: 0,
            totalWorkingTime: 0,
            averageEfficiencyRate: 0,
            days: analytics.length,
            analytics
        };

        analytics.forEach(day => {
            aggregated.totalAppointments += day.totalAppointments;
            aggregated.completedAppointments += day.completedAppointments;
            aggregated.cancelledAppointments += day.cancelledAppointments;
            aggregated.noShowAppointments += day.noShowAppointments;
            aggregated.averageWaitTime += day.averageWaitTime;
            aggregated.averageConsultTime += day.averageConsultTime;
            aggregated.totalWorkingTime += day.totalWorkingTime;
            aggregated.averageEfficiencyRate += day.efficiencyRate;
        });

        if (analytics.length > 0) {
            aggregated.averageWaitTime = Math.round(aggregated.averageWaitTime / analytics.length);
            aggregated.averageConsultTime = Math.round(aggregated.averageConsultTime / analytics.length);
            aggregated.averageEfficiencyRate = Math.round((aggregated.averageEfficiencyRate / analytics.length) * 100) / 100;
        }

        return aggregated;

    } catch (error) {
        logger.error('Error getting analytics range:', error);
        throw error;
    }
};

/**
 * Get real-time dashboard stats for today
 */
exports.getDashboardStats = async (doctorId) => {
    try {
        const today = normalizeDate(new Date());

        // Get today's appointments
        const appointments = await Appointment.find({
            doctorId,
            date: today
        });

        // Get today's queue
        const queue = await DailyQueue.findOne({
            doctorId,
            date: today
        });

        // Calculate real-time stats
        const stats = {
            today: {
                total: appointments.length,
                completed: appointments.filter(a => a.status === 'completed').length,
                waiting: appointments.filter(a => a.status === 'waiting').length,
                in_progress: appointments.filter(a => ['in_progress', 'in_consultation'].includes(a.status)).length,
                cancelled: appointments.filter(a => a.status === 'cancelled').length,
                no_show: appointments.filter(a => a.status === 'no_show').length
            },
            queue: {
                status: queue?.status || 'inactive',
                currentToken: queue?.currentToken || 0,
                waiting: queue?.waitingList?.filter(w => w.status === 'waiting').length || 0
            }
        };

        // Get this week's analytics
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());

        const weekAnalytics = await this.getAnalytics(doctorId, startOfWeek, today);

        stats.thisWeek = {
            totalAppointments: weekAnalytics.totalAppointments,
            completedAppointments: weekAnalytics.completedAppointments,
            efficiencyRate: weekAnalytics.averageEfficiencyRate
        };

        return stats;

    } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        throw error;
    }
};

/**
 * Get wait time analysis
 */
exports.getWaitTimeAnalysis = async (doctorId, startDate, endDate) => {
    try {
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);

        const analytics = await QueueAnalytics.find({
            doctorId,
            date: { $gte: start, $lte: end }
        }).sort({ date: 1 });

        // Aggregate hourly wait times
        const hourlyAnalysis = {};

        analytics.forEach(day => {
            day.hourlyStats.forEach(hourStat => {
                if (!hourlyAnalysis[hourStat.hour]) {
                    hourlyAnalysis[hourStat.hour] = {
                        hour: hourStat.hour,
                        totalAppointments: 0,
                        totalWaitTime: 0,
                        count: 0
                    };
                }
                hourlyAnalysis[hourStat.hour].totalAppointments += hourStat.appointmentsScheduled;
                hourlyAnalysis[hourStat.hour].totalWaitTime += hourStat.averageWaitTime;
                hourlyAnalysis[hourStat.hour].count++;
            });
        });

        // Calculate averages
        const hourlyWaitTimes = Object.values(hourlyAnalysis).map(h => ({
            hour: `${String(h.hour).padStart(2, '0')}:00`,
            averageWaitTime: h.count > 0 ? Math.round(h.totalWaitTime / h.count) : 0,
            totalAppointments: h.totalAppointments
        })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

        return {
            hourlyWaitTimes,
            period: {
                start: startDate,
                end: endDate
            }
        };

    } catch (error) {
        logger.error('Error getting wait time analysis:', error);
        throw error;
    }
};

/**
 * Schedule daily analytics calculation via cron job
 * Runs at midnight UTC every day to calculate previous day's analytics for all doctors
 */
exports.scheduleDailyAnalytics = async () => {
    try {
        const cron = require('node-cron');
        const Doctor = require('../models/Doctor');
        const analyticsQueue = require('../queues/analyticsQueue');

        // Schedule job at midnight UTC (0 0 * * *)
        cron.schedule('0 0 * * *', async () => {
            try {
                logger.info('📊 Starting daily analytics calculation...');

                const doctors = await Doctor.find({ isActive: true }).select('_id').lean();

                if (doctors.length === 0) {
                    logger.warn('No active doctors found for analytics calculation');
                    return;
                }

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                let successCount = 0;
                for (const doctor of doctors) {
                    try {
                        // Queue via MongoDB-backed analytics queue (no Redis)
                        await analyticsQueue.add('calculate-analytics', {
                            doctorId: doctor._id.toString(),
                            date: yesterday
                        }, { maxAttempts: 3 });
                        successCount++;
                    } catch (jobError) {
                        logger.error(`Failed to queue analytics for doctor ${doctor._id}:`, jobError.message);
                    }
                }

                logger.info(`📊 Queued analytics for ${successCount}/${doctors.length} doctors`);
            } catch (scheduleError) {
                logger.error('Error in scheduled analytics task:', scheduleError);
            }
        });

        logger.info('✅ Daily analytics scheduler initialized (runs at 00:00 UTC, MongoDB-backed)');
    } catch (error) {
        logger.error('Failed to schedule daily analytics:', error);
    }
};
