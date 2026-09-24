const mongoose = require('mongoose');

/**
 * MongoDB-based Job Queue
 * Replaces BullMQ/Redis. Jobs are stored in MongoDB and processed by in-process workers.
 * Supports: email, notification, analytics, reminder job types.
 */
const jobSchema = new mongoose.Schema({
    queue: { type: String, required: true, index: true },
    type: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending', index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    error: { type: String },
    result: { type: mongoose.Schema.Types.Mixed },
    scheduledAt: { type: Date, default: Date.now, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: false });

// Auto-expire completed/failed jobs after 7 days
jobSchema.index({ completedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, sparse: true });

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

/**
 * Add a job to the queue
 */
async function addJob(queue, type, data = {}, options = {}) {
    const job = await Job.create({
        queue,
        type,
        data,
        maxAttempts: options.maxAttempts || 3,
        scheduledAt: options.delay ? new Date(Date.now() + options.delay) : new Date()
    });
    return job;
}

/**
 * Process next pending job from a queue
 * Returns the job if found and locked for processing, null otherwise
 */
async function claimNextJob(queue) {
    const job = await Job.findOneAndUpdate(
        {
            queue,
            status: 'pending',
            scheduledAt: { $lte: new Date() },
            $expr: { $lt: ['$attempts', '$maxAttempts'] }
        },
        { status: 'processing', startedAt: new Date(), $inc: { attempts: 1 } },
        { sort: { scheduledAt: 1 }, new: true }
    );
    return job;
}

/**
 * Mark job as completed
 */
async function completeJob(jobId, result = {}) {
    await Job.findByIdAndUpdate(jobId, {
        status: 'completed',
        result,
        completedAt: new Date()
    });
}

/**
 * Mark job as failed (will retry if attempts < maxAttempts)
 */
async function failJob(jobId, error, shouldRetry = true) {
    const job = await Job.findById(jobId);
    if (!job) return;

    if (shouldRetry && job.attempts < job.maxAttempts) {
        // Return to pending with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000);
        await Job.findByIdAndUpdate(jobId, {
            status: 'pending',
            error: error.message || String(error),
            scheduledAt: new Date(Date.now() + delay)
        });
    } else {
        await Job.findByIdAndUpdate(jobId, {
            status: 'failed',
            error: error.message || String(error),
            completedAt: new Date()
        });
    }
}

module.exports = { Job, addJob, claimNextJob, completeJob, failJob };
