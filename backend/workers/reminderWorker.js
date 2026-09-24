/**
 * Reminder Worker — MongoDB-based (Redis/BullMQ removed)
 * Polls the MongoDB job queue and processes appointment reminder jobs.
 */
const { claimNextJob, completeJob, failJob } = require('../models/JobQueue');
const notificationService = require('../services/notificationService');
const Appointment = require('../models/Appointment');
const logger = require('../utils/logger');

async function processReminderJob(job) {
    const { appointmentId } = job.data;
    logger.debug(`[ReminderWorker] Processing reminder for appointment ${appointmentId}`);

    try {
        const appointment = await Appointment.findById(appointmentId)
            .populate('patientId')
            .populate({ path: 'doctorId', populate: { path: 'userId' } });

        if (!appointment) {
            await completeJob(job._id, { skipped: true, reason: 'not_found' });
            return;
        }

        if (['cancelled', 'completed'].includes(appointment.status)) {
            await completeJob(job._id, { skipped: true, reason: `status_${appointment.status}` });
            return;
        }

        if (appointment.reminderSent) {
            await completeJob(job._id, { skipped: true, reason: 'already_sent' });
            return;
        }

        await notificationService.sendAppointmentReminderNotification(appointment);

        appointment.reminderSent = true;
        await appointment.save();

        await completeJob(job._id, { success: true });
        logger.info(`[ReminderWorker] Reminder sent for appointment ${appointmentId}`);

    } catch (error) {
        await failJob(job._id, error);
        logger.error(`[ReminderWorker] Failed: ${error.message}`);
    }
}

let reminderWorkerRunning = false;

function startReminderWorker() {
    if (reminderWorkerRunning) return;
    reminderWorkerRunning = true;
    logger.info('⏰ Reminder worker started (MongoDB-backed)');

    const poll = async () => {
        try {
            const job = await claimNextJob('reminders');
            if (job) {
                await processReminderJob(job);
                setImmediate(poll);
                return;
            }
        } catch (err) {
            logger.error('[ReminderWorker] Poll error:', err.message);
        }
        setTimeout(poll, 5000);
    };

    poll();
}

module.exports = { startReminderWorker };
