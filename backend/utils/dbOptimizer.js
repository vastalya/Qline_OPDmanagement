/**
 * Database Query Optimization Audit
 * Phase 5.2 - Adds lean() to remaining read-only queries and missing indexes
 */

const mongoose = require('mongoose');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');
const QueueEvent = require('../models/QueueEvent');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Run this once in production to create all performance indexes
 * Can be run multiple times safely (createIndex is idempotent)
 */
exports.ensureIndexes = async () => {
    logger.info('🔧 Ensuring database indexes...');
    try {
        await Promise.all([
            // User indexes
            User.collection.createIndex({ email: 1 }, { unique: true, background: true }),
            User.collection.createIndex({ role: 1 }, { background: true }),

            // Doctor indexes
            Doctor.collection.createIndex({ userId: 1 }, { unique: true, background: true }),
            Doctor.collection.createIndex({ department: 1, 'workingHours.start': 1 }, { background: true }),
            Doctor.collection.createIndex({ 'rating': -1 }, { background: true }),

            // Appointment indexes (heavy read-write collection)
            Appointment.collection.createIndex(
                { doctorId: 1, date: 1, status: 1, priority: 1, tokenNumber: 1 },
                { background: true, name: 'priority_queue_idx' }
            ),
            Appointment.collection.createIndex(
                { patientId: 1, date: -1 },
                { background: true, name: 'patient_history_idx' }
            ),
            Appointment.collection.createIndex(
                { doctorId: 1, date: 1, tokenNumber: 1 },
                { background: true, name: 'token_lookup_idx' }
            ),

            // DailyQueue indexes
            DailyQueue.collection.createIndex(
                { doctorId: 1, date: 1 },
                { unique: true, background: true }
            ),
            DailyQueue.collection.createIndex(
                { date: 1, status: 1 },
                { background: true, name: 'queue_status_idx' }
            ),

            // QueueEvent indexes (analytics)
            QueueEvent.collection.createIndex(
                { doctorId: 1, event: 1, timestamp: -1 },
                { background: true, name: 'doctor_event_idx' }
            ),
            QueueEvent.collection.createIndex(
                { appointmentId: 1, event: 1 },
                { background: true }
            )
        ]);

        logger.info('✅ All database indexes ensured');
    } catch (error) {
        logger.error('Failed to ensure indexes:', error);
    }
};
