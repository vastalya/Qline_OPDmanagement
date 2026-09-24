/**
 * Email Worker — MongoDB-based (Redis/BullMQ removed)
 * Polls the MongoDB job queue and processes email jobs.
 */
const { claimNextJob, completeJob, failJob } = require('../models/JobQueue');
const EmailLog = require('../models/EmailLog');
const logger = require('../utils/logger');

let sgMail = null;
let smtpTransporter = null;

// Initialize email providers
if (process.env.SENDGRID_API_KEY) {
    try {
        sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        logger.info('✅ SendGrid initialized for email worker');
    } catch (e) {
        logger.warn('SendGrid not available:', e.message);
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
        logger.info('✅ SMTP transporter initialized for email worker');
    } catch (e) {
        logger.warn('SMTP not available:', e.message);
    }
}

/**
 * Process a single email job
 */
async function processEmailJob(job) {
    const { to, subject, html, text, emailLogId } = job.data;
    logger.debug(`[EmailWorker] Processing email to ${to}`);

    try {
        let provider = null;

        if (sgMail) {
            await sgMail.send({
                to,
                from: process.env.FROM_EMAIL || 'noreply@qline.com',
                subject,
                text: text || subject,
                html
            });
            provider = 'sendgrid';
        } else if (smtpTransporter) {
            await smtpTransporter.sendMail({
                from: process.env.FROM_EMAIL || 'noreply@qline.com',
                to, subject,
                text: text || subject,
                html
            });
            provider = 'smtp';
        } else {
            // Dev mode: log email instead of sending
            logger.info(`[EmailWorker] DEV MODE — Email to ${to}: "${subject}" (no provider configured)`);
            provider = 'dev_log';
        }

        if (emailLogId) {
            await EmailLog.findByIdAndUpdate(emailLogId, {
                status: 'sent',
                sentAt: new Date(),
                provider,
                attempts: job.attempts
            });
        }

        await completeJob(job._id, { provider });
        logger.info(`[EmailWorker] Sent via ${provider} to ${to}`);

    } catch (error) {
        if (emailLogId) {
            await EmailLog.findByIdAndUpdate(emailLogId, {
                status: job.attempts >= job.maxAttempts ? 'failed' : 'queued',
                error: error.message,
                attempts: job.attempts
            }).catch(() => { });
        }
        await failJob(job._id, error);
        logger.error(`[EmailWorker] Failed: ${error.message}`);
    }
}

/**
 * Start the email worker polling loop
 */
let emailWorkerRunning = false;

function startEmailWorker() {
    if (emailWorkerRunning) return;
    emailWorkerRunning = true;
    logger.info('📧 Email worker started (MongoDB-backed)');

    const poll = async () => {
        try {
            const job = await claimNextJob('email');
            if (job) {
                await processEmailJob(job);
                // Process next immediately if there was work
                setImmediate(poll);
                return;
            }
        } catch (err) {
            logger.error('[EmailWorker] Poll error:', err.message);
        }
        // No jobs — wait before polling again
        setTimeout(poll, 5000);
    };

    poll();
}

module.exports = { startEmailWorker };
