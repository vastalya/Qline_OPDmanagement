const mongoose = require('mongoose');

const errorReportSchema = new mongoose.Schema(
    {
        url: { type: String, default: '' },
        userAgent: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        context: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

errorReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ErrorReport', errorReportSchema);
