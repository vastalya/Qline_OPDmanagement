const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const queueService = require('../services/queueService');
const { normalizeDate } = require('../utils/dateUtils');

/**
 * Socket.IO Queue Management
 * Handles real-time queue updates, room management, and event broadcasting
 */
module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}, User: ${socket.user.userId}, Role: ${socket.user.role}`);

        // Always join user-specific room for personal notifications
        socket.join(`user:${socket.user.userId}`);

        /**
         * Join Doctor Room
         * - Doctors join their own queue room
         * - Patients join if they have an appointment
         */
        socket.on('join:doctor-room', async ({ doctorId, date }) => {
            try {
                // Authorization: Patient must have appointment for this doctor + date
                if (socket.user.role === 'patient') {
                    const hasAppointment = await Appointment.exists({
                        doctorId,
                        date: normalizeDate(new Date(date)),
                        patientId: socket.user.userId
                    });

                    if (!hasAppointment) {
                        return socket.emit('queue:error', {
                            message: 'Unauthorized: No appointment found for this doctor and date'
                        });
                    }
                }

                // Authorization: Doctor must be joining their own doctor profile room
                if (socket.user.role === 'doctor') {
                    const doctorProfile = await Doctor.findOne({ userId: socket.user.userId })
                        .select('_id')
                        .lean();
                    if (!doctorProfile || doctorId.toString() !== doctorProfile._id.toString()) {
                        return socket.emit('queue:error', {
                            message: 'Unauthorized: Cannot join another doctor\'s queue'
                        });
                    }
                }

                // Join room
                const roomName = `doctor:${doctorId}:${date}`;
                socket.join(roomName);

                console.log(`User ${socket.user.userId} (${socket.user.role}) joined room: ${roomName}`);

                // CRITICAL: Hydrate current state on join (reconnect support)
                const state = await queueService.getQueueState(doctorId, date);
                socket.emit('queue:updated', state);
                socket.emit('queue:update', state); // backward compatibility for older clients

            } catch (error) {
                console.error('Error joining doctor room:', error);
                socket.emit('queue:error', {
                    message: error.message || 'Failed to join queue room'
                });
            }
        });

        /**
         * Leave Doctor Room
         */
        socket.on('leave:doctor-room', ({ doctorId, date }) => {
            const roomName = `doctor:${doctorId}:${date}`;
            socket.leave(roomName);
            console.log(`User ${socket.user.userId} left room: ${roomName}`);
        });

        /**
         * Get My Appointment Status
         * Patient requests their current appointment status
         */
        socket.on('get:my-appointment', async ({ doctorId, date }) => {
            try {
                if (socket.user.role !== 'patient') {
                    return socket.emit('queue:error', {
                        message: 'Only patients can request appointment status'
                    });
                }

                const appointment = await Appointment.findOne({
                    doctorId,
                    date: normalizeDate(new Date(date)),
                    patientId: socket.user.userId
                }).select('tokenNumber status slotStart slotEnd');

                if (!appointment) {
                    return socket.emit('queue:error', {
                        message: 'No appointment found'
                    });
                }

                socket.emit('appointment:data', {
                    appointmentId: appointment._id,
                    tokenNumber: appointment.tokenNumber,
                    status: appointment.status === 'in_progress'
                        ? 'in_consultation'
                        : appointment.status === 'booked'
                            ? 'waiting'
                            : appointment.status,
                    slotStart: appointment.slotStart,
                    slotEnd: appointment.slotEnd
                });

            } catch (error) {
                console.error('Error fetching appointment:', error);
                socket.emit('queue:error', {
                    message: 'Failed to fetch appointment'
                });
            }
        });

        /**
         * Disconnect Handler
         */
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
};
