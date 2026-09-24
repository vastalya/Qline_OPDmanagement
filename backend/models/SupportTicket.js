const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            enum: ['general', 'technical', 'appointment', 'account', 'data', 'other'],
            default: 'general',
        },
        subject: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        status: {
            type: String,
            enum: ['open', 'in_progress', 'resolved', 'closed'],
            default: 'open',
        },
    },
    { timestamps: true }
);

supportTicketSchema.index({ email: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
