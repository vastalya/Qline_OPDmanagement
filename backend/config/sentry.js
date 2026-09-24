/**
 * Sentry stub — returns a minimal compatible object.
 * Real Sentry is only initialized in production when SENTRY_DSN is set.
 */
let Sentry;

if (process.env.SENTRY_DSN && process.env.NODE_ENV === 'production') {
    try {
        Sentry = require('@sentry/node');
        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
        });
    } catch (e) {
        // Sentry not installed – no-op
        Sentry = { Handlers: { requestHandler: () => (req, res, next) => next(), errorHandler: () => (err, req, res, next) => next(err) } };
    }
} else {
    Sentry = {
        Handlers: {
            requestHandler: () => (req, res, next) => next(),
            errorHandler: () => (err, req, res, next) => next(err)
        }
    };
}

module.exports = Sentry;
