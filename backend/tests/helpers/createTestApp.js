const express = require('express');
const cookieParser = require('cookie-parser');

const authRoutes = require('../../routes/auth');
const doctorRoutes = require('../../routes/doctor');
const appointmentRoutes = require('../../routes/appointment');
const queueRoutes = require('../../routes/queue');
const errorHandler = require('../../middleware/errorHandler');

const createMockIo = () => ({
    to: () => ({
        emit: () => {},
    }),
    sockets: {
        adapter: {
            rooms: new Map(),
        },
    },
});

const createTestApp = () => {
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.set('io', createMockIo());

    app.use('/api/auth', authRoutes);
    app.use('/api/doctors', doctorRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/queue', queueRoutes);

    app.use((req, res, next) => {
        res.status(404);
        next(new Error(`Route not found: ${req.originalUrl}`));
    });

    app.use(errorHandler);

    return app;
};

module.exports = {
    createTestApp,
};
