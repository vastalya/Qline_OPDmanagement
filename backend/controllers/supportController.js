const SupportTicket = require('../models/SupportTicket');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');

exports.createTicket = asyncHandler(async (req, res) => {
    const { category, subject, description, email } = req.body || {};

    if (!subject || !description || !email) {
        res.status(400);
        throw new Error('Subject, description, and email are required');
    }

    const ticket = await SupportTicket.create({
        category: category || 'general',
        subject: String(subject).trim(),
        description: String(description).trim(),
        email: String(email).trim().toLowerCase(),
        userId: req.user?.userId || null,
    });

    logger.info(`Support ticket created: ${ticket._id} (${ticket.category})`);

    // Non-blocking acknowledgement email
    notificationService.sendEmail(
        ticket.email,
        `Support ticket received: ${ticket.subject}`,
        `<p>We received your support ticket.</p><p>Ticket ID: <strong>${ticket._id}</strong></p><p>Our team will contact you soon.</p>`,
        `We received your support ticket. Ticket ID: ${ticket._id}`
    ).catch(() => {});

    res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        ticketId: ticket._id,
    });
});
