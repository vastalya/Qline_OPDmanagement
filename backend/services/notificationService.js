/**
 * Notification Service — MongoDB-only (Redis/BullMQ removed)
 * All notifications are written directly to MongoDB.
 * Emails are queued via the MongoDB job queue.
 */
const Notification = require('../models/Notification');
const User = require('../models/User');
const EmailLog = require('../models/EmailLog');
const logger = require('../utils/logger');

let sgMail = null;
let smtpTransporter = null;

if (process.env.SENDGRID_API_KEY) {
    try {
        sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        logger.info('✅ SendGrid initialized');
    } catch (e) {
        logger.warn('SendGrid not installed:', e.message);
    }
}

if (process.env.SMTP_HOST) {
    try {
        const nodemailer = require('nodemailer');
        smtpTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        logger.info('✅ SMTP transporter initialized');
    } catch (e) {
        logger.warn('Nodemailer not installed:', e.message);
    }
}

/**
 * Create an in-app notification (direct MongoDB write)
 */
exports.createNotification = async (userId, type, title, message, data = {}) => {
    try {
        // Try to queue via MongoDB job queue first (non-blocking)
        try {
            const notificationQueue = require('../queues/notificationQueue');
            await notificationQueue.add('create-notification', {
                userId: userId.toString(),
                type,
                title,
                message,
                data
            });
            return { _id: null, userId, type, title, message, data, queued: true, createdAt: new Date() };
        } catch (queueError) {
            // Fallback: write directly to MongoDB
            logger.debug(`Notification queue unavailable, writing directly: ${queueError.message}`);
        }

        const notification = await Notification.create({ userId, type, title, message, data });

        // Emit real-time event if Socket.IO available
        if (global.io) {
            global.io.to(`user:${userId}`).emit('notification', {
                _id: notification._id,
                type,
                title,
                message,
                data,
                createdAt: notification.createdAt
            });
        }

        return notification;
    } catch (error) {
        logger.error('Error creating notification:', error);
        throw error;
    }
};

/**
 * Send email — queues via MongoDB job queue, falls back to direct send
 */
exports.sendEmail = async (to, subject, html, text = null, metadata = {}) => {
    // Create email log entry for tracking
    let emailLog;
    try {
        emailLog = await EmailLog.create({
            recipient: to,
            subject,
            htmlBody: html,
            textBody: text || subject,
            status: 'queued',
            metadata,
            maxAttempts: parseInt(process.env.EMAIL_MAX_RETRY_ATTEMPTS) || 3
        });
    } catch (logError) {
        logger.warn('Could not create EmailLog:', logError.message);
    }

    // Try to queue the email
    try {
        const emailQueue = require('../queues/emailQueue');
        await emailQueue.add('send-email', {
            to,
            subject,
            html,
            text: text || subject,
            emailLogId: emailLog?._id?.toString()
        });
        logger.debug(`Email queued to ${to}: ${subject}`);
        return { success: true, queued: true, emailLogId: emailLog?._id };
    } catch (queueError) {
        logger.warn(`Email queue error, sending directly: ${queueError.message}`);
    }

    // Direct send fallback
    const from = process.env.FROM_EMAIL || 'noreply@qline.com';

    if (sgMail) {
        try {
            await sgMail.send({ to, from, subject, text: text || subject, html });
            if (emailLog) {
                await EmailLog.findByIdAndUpdate(emailLog._id, { status: 'sent', sentAt: new Date(), provider: 'sendgrid', attempts: 1 });
            }
            return { success: true, provider: 'sendgrid-direct' };
        } catch (sgErr) {
            logger.warn('SendGrid direct send failed:', sgErr.message);
        }
    }

    if (smtpTransporter) {
        try {
            await smtpTransporter.sendMail({ from, to, subject, text: text || subject, html });
            if (emailLog) {
                await EmailLog.findByIdAndUpdate(emailLog._id, { status: 'sent', sentAt: new Date(), provider: 'smtp', attempts: 1 });
            }
            return { success: true, provider: 'smtp-direct' };
        } catch (smtpErr) {
            logger.warn('SMTP direct send failed:', smtpErr.message);
        }
    }

    // Dev mode: log email content
    logger.info(`📧 [DEV EMAIL] To: ${to}\nSubject: ${subject}\n(configure SENDGRID_API_KEY or SMTP_HOST to actually send)`);
    if (emailLog) {
        await EmailLog.findByIdAndUpdate(emailLog._id, { status: 'sent', provider: 'dev_log', sentAt: new Date() }).catch(() => { });
    }
    return { success: true, provider: 'dev_log' };
};

// ─── Email Templates ────────────────────────────────────────────────────────

const getAppointmentBookedEmailHTML = (patient, doctor, appointment, tokenNumber) => {
    const date = new Date(appointment.slotStart);
    return `<!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:#4CAF50;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
        .content{padding:20px;background:#f9f9f9}
        .info-box{background:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #4CAF50}
        .token{font-size:32px;font-weight:bold;color:#4CAF50;text-align:center;padding:10px}
        .footer{text-align:center;padding:20px;color:#666;font-size:12px}
    </style></head><body>
        <div class="container">
            <div class="header"><h1>✅ Appointment Confirmed</h1></div>
            <div class="content">
                <p>Dear ${patient.name},</p>
                <p>Your appointment has been successfully booked.</p>
                <div class="info-box">
                    <strong>Doctor:</strong> ${doctor.name}<br>
                    <strong>Date:</strong> ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}<br>
                    <strong>Time:</strong> ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div class="token">Token #${tokenNumber}</div>
                <p><strong>Important:</strong> Please arrive 10 minutes before your scheduled time.</p>
            </div>
            <div class="footer"><p>Qline - Smart Queue Management System</p></div>
        </div>
    </body></html>`;
};

const getAppointmentReminderEmailHTML = (patient, doctor, appointment, tokenNumber) => {
    const date = new Date(appointment.slotStart);
    return `<!DOCTYPE html><html><head><style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
        .container{max-width:600px;margin:0 auto;padding:20px}
        .header{background:#FF9800;color:white;padding:20px;text-align:center;border-radius:5px 5px 0 0}
        .content{padding:20px;background:#f9f9f9}
        .info-box{background:white;padding:15px;margin:15px 0;border-radius:5px;border-left:4px solid #FF9800}
        .reminder{font-size:24px;font-weight:bold;color:#FF9800;text-align:center;padding:15px}
        .footer{text-align:center;padding:20px;color:#666;font-size:12px}
    </style></head><body>
        <div class="container">
            <div class="header"><h1>⏰ Appointment Reminder</h1></div>
            <div class="content">
                <p>Dear ${patient.name},</p>
                <div class="reminder">Your appointment is in 1 hour!</div>
                <div class="info-box">
                    <strong>Doctor:</strong> ${doctor.name}<br>
                    <strong>Time:</strong> ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}<br>
                    <strong>Token:</strong> #${tokenNumber}
                </div>
            </div>
            <div class="footer"><p>Qline - Smart Queue Management System</p></div>
        </div>
    </body></html>`;
};

// ─── Notification Senders ─────────────────────────────────────────────────────

exports.sendAppointmentBookedNotification = async (appointment, io) => {
    try {
        if (!appointment.populated('patientId')) await appointment.populate('patientId');
        if (!appointment.populated('doctorId')) await appointment.populate({ path: 'doctorId', populate: { path: 'userId' } });

        const patient = appointment.patientId;
        const doctor = appointment.doctorId.userId;
        const tokenNumber = appointment.tokenNumber;

        const notification = await exports.createNotification(
            patient._id,
            'appointment_booked',
            'Appointment Confirmed',
            `Your appointment with Dr. ${doctor.name} has been booked for ${new Date(appointment.slotStart).toLocaleString()}. Token: #${tokenNumber}`,
            { appointmentId: appointment._id, doctorId: doctor._id, tokenNumber, date: appointment.date, slotStart: appointment.slotStart }
        );

        if (io && notification?._id) {
            io.to(`user:${patient._id}`).emit('notification:new', {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt
            });
        }

        const emailHTML = getAppointmentBookedEmailHTML(patient, doctor, appointment, tokenNumber);
        await exports.sendEmail(patient.email, 'Appointment Confirmed - Qline', emailHTML);

        logger.info(`Appointment booked notification sent to ${patient.email}`);
        return notification;
    } catch (error) {
        logger.error('Error sending appointment booked notification:', error);
    }
};

exports.sendAppointmentReminderNotification = async (appointment, io) => {
    try {
        if (!appointment.populated('patientId')) await appointment.populate('patientId');
        if (!appointment.populated('doctorId')) await appointment.populate({ path: 'doctorId', populate: { path: 'userId' } });

        const patient = appointment.patientId;
        const doctor = appointment.doctorId.userId;
        const tokenNumber = appointment.tokenNumber;

        const notification = await exports.createNotification(
            patient._id,
            'appointment_reminder',
            'Appointment Reminder',
            `Your appointment with Dr. ${doctor.name} is in 1 hour. Token: #${tokenNumber}`,
            { appointmentId: appointment._id, doctorId: doctor._id, tokenNumber, date: appointment.date, slotStart: appointment.slotStart }
        );

        if (io && notification?._id) {
            io.to(`user:${patient._id}`).emit('notification:new', {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt
            });
        }

        const emailHTML = getAppointmentReminderEmailHTML(patient, doctor, appointment, tokenNumber);
        await exports.sendEmail(patient.email, 'Appointment Reminder - Your appointment is in 1 hour', emailHTML);

        logger.info(`Appointment reminder sent to ${patient.email}`);
        return notification;
    } catch (error) {
        logger.error('Error sending appointment reminder:', error);
    }
};

exports.sendTokenCalledNotification = async (appointment, io) => {
    try {
        const patient = appointment.patientId;
        const tokenNumber = appointment.tokenNumber;

        const notification = await exports.createNotification(
            patient._id || patient,
            'token_called',
            'Your Token is Called',
            `Token #${tokenNumber} has been called. Please proceed to the consultation room.`,
            { appointmentId: appointment._id, tokenNumber }
        );

        if (io && notification?._id) {
            io.to(`user:${patient._id || patient}`).emit('notification:new', {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt
            });
        }

        logger.info(`Token called notification sent for token #${tokenNumber}`);
        return notification;
    } catch (error) {
        logger.error('Error sending token called notification:', error);
    }
};

const resolveDoctorName = async ({ doctorId, doctorName }) => {
    if (doctorName) {
        return doctorName;
    }

    if (!doctorId) {
        return 'Doctor';
    }

    try {
        const Doctor = require('../models/Doctor');
        const doctor = await Doctor.findById(doctorId)
            .populate('userId', 'name')
            .select('userId')
            .lean();
        return doctor?.userId?.name || 'Doctor';
    } catch {
        return 'Doctor';
    }
};

exports.sendAppointmentRescheduledNotification = async ({
    patientId,
    appointmentId,
    doctorId,
    doctorName,
    previousSlotStart,
    newSlotStart,
    reason,
}, io) => {
    try {
        const patient = await User.findById(patientId).select('name email').lean();
        if (!patient) {
            return null;
        }

        const resolvedDoctorName = await resolveDoctorName({ doctorId, doctorName });
        const message = `Your appointment with Dr. ${resolvedDoctorName} on ${new Date(previousSlotStart).toLocaleString()} has been rescheduled to ${new Date(newSlotStart).toLocaleString()} due to doctor unavailability.`;

        const notification = await exports.createNotification(
            patientId,
            'appointment_rescheduled',
            'Appointment Rescheduled',
            message,
            {
                appointmentId,
                doctorId,
                previousSlotStart,
                newSlotStart,
                reason: reason || '',
            }
        );

        if (io && notification?._id) {
            io.to(`user:${patientId}`).emit('notification:new', {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt,
            });
        }

        if (patient.email) {
            const html = `
                <p>Dear ${patient.name},</p>
                <p>${message}</p>
                ${reason ? `<p>Reason: ${reason}</p>` : ''}
            `;
            await exports.sendEmail(patient.email, 'Appointment Rescheduled - Qline', html, message);
        }

        return notification;
    } catch (error) {
        logger.error('Error sending appointment rescheduled notification:', error);
        return null;
    }
};

exports.sendDoctorUnavailableNotification = async ({
    patientId,
    appointmentId,
    doctorId,
    doctorName,
    slotStart,
    reason,
    cancelled = false,
}, io) => {
    try {
        const patient = await User.findById(patientId).select('name email').lean();
        if (!patient) {
            return null;
        }

        const resolvedDoctorName = await resolveDoctorName({ doctorId, doctorName });
        const message = cancelled
            ? `Your appointment with Dr. ${resolvedDoctorName} on ${new Date(slotStart).toLocaleString()} has been cancelled due to doctor unavailability.`
            : `Dr. ${resolvedDoctorName} is unavailable for your appointment on ${new Date(slotStart).toLocaleString()}.`;

        const notification = await exports.createNotification(
            patientId,
            cancelled ? 'appointment_cancelled' : 'doctor_unavailable',
            cancelled ? 'Appointment Cancelled' : 'Doctor Unavailable',
            message,
            {
                appointmentId,
                doctorId,
                slotStart,
                reason: reason || '',
                cancelled,
            }
        );

        if (io && notification?._id) {
            io.to(`user:${patientId}`).emit('notification:new', {
                id: notification._id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                createdAt: notification.createdAt,
            });
        }

        if (patient.email) {
            const subject = cancelled ? 'Appointment Cancelled - Qline' : 'Doctor Unavailable - Qline';
            const html = `
                <p>Dear ${patient.name},</p>
                <p>${message}</p>
                ${reason ? `<p>Reason: ${reason}</p>` : ''}
            `;
            await exports.sendEmail(patient.email, subject, html, message);
        }

        return notification;
    } catch (error) {
        logger.error('Error sending doctor unavailable notification:', error);
        return null;
    }
};

// ─── CRUD Operations ─────────────────────────────────────────────────────────

/**
 * Get user notifications (paginated) — READ
 */
exports.getUserNotifications = async (userId, page = 1, limit = 20, unreadOnly = false) => {
    const skip = (page - 1) * limit;
    const query = { userId };
    if (unreadOnly) query.read = false;

    const [notifications, total] = await Promise.all([
        Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Notification.countDocuments(query)
    ]);

    return { notifications, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

/**
 * Mark notification as read — UPDATE
 */
exports.markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
    );
    if (!notification) throw new Error('Notification not found');
    return notification;
};

/**
 * Mark all notifications as read — UPDATE (bulk)
 */
exports.markAllAsRead = async (userId) => {
    const result = await Notification.updateMany({ userId, read: false }, { read: true, readAt: new Date() });
    logger.info(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);
    return result;
};

/**
 * Delete notification — DELETE
 */
exports.deleteNotification = async (notificationId, userId) => {
    const notification = await Notification.findOneAndDelete({ _id: notificationId, userId });
    if (!notification) throw new Error('Notification not found');
    return notification;
};

/**
 * Get unread count — READ
 */
exports.getUnreadCount = async (userId) => {
    return Notification.countDocuments({ userId, read: false });
};
