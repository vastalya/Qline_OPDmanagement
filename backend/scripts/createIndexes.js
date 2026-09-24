/**
 * Database Index Creation Script
 * Run this script to create all necessary indexes for production performance
 */

const mongoose = require('mongoose');
require('../config/loadEnv');

const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Notification = require('../models/Notification');
const DailyQueue = require('../models/DailyQueue');
const QueueAnalytics = require('../models/QueueAnalytics');
const AuditLog = require('../models/AuditLog');
const EmailLog = require('../models/EmailLog');

const createIndexes = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        console.log('Creating indexes...\n');

        // Doctor indexes
        console.log('📋 Creating Doctor indexes...');
        await Doctor.collection.createIndex({ department: 1 });
        await Doctor.collection.createIndex({ name: 'text' }); // Text search on name
        await Doctor.collection.createIndex({ userId: 1 });
        console.log('✅ Doctor indexes created');

        // Appointment indexes (already in schema, ensure they exist)
        console.log('📋 Creating Appointment indexes...');
        await Appointment.collection.createIndex({ doctorId: 1, date: 1 });
        await Appointment.collection.createIndex({ patientId: 1, date: -1 });
        await Appointment.collection.createIndex({ status: 1 });
        await Appointment.collection.createIndex({ slotStart: 1 });
        await Appointment.collection.createIndex({ reminderSent: 1, slotStart: 1 }); // For reminder cron
        console.log('✅ Appointment indexes created');

        // Medical Record indexes
        console.log('📋 Creating MedicalRecord indexes...');
        await MedicalRecord.collection.createIndex({ patientId: 1, date: -1 });
        await MedicalRecord.collection.createIndex({ doctorId: 1, date: -1 });
        await MedicalRecord.collection.createIndex({ appointmentId: 1 }, { unique: true });
        console.log('✅ MedicalRecord indexes created');

        // Notification indexes
        console.log('📋 Creating Notification indexes...');
        await Notification.collection.createIndex({ userId: 1, read: 1, createdAt: -1 });
        await Notification.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        console.log('✅ Notification indexes created');

        // DailyQueue indexes
        console.log('📋 Creating DailyQueue indexes...');
        await DailyQueue.collection.createIndex({ doctorId: 1, date: 1 }, { unique: true });
        await DailyQueue.collection.createIndex({ date: 1, status: 1 });
        console.log('✅ DailyQueue indexes created');

        // QueueAnalytics indexes
        console.log('📋 Creating QueueAnalytics indexes...');
        await QueueAnalytics.collection.createIndex({ doctorId: 1, date: 1 }, { unique: true });
        await QueueAnalytics.collection.createIndex({ date: -1 });
        console.log('✅ QueueAnalytics indexes created');

        // AuditLog indexes
        console.log('📋 Creating AuditLog indexes...');
        await AuditLog.collection.createIndex({ userId: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ entityType: 1, entityId: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ action: 1, createdAt: -1 });
        await AuditLog.collection.createIndex({ createdAt: -1 });
        console.log('✅ AuditLog indexes created');

        // EmailLog indexes
        console.log('📋 Creating EmailLog indexes...');
        await EmailLog.collection.createIndex({ status: 1, attempts: 1, lastAttemptAt: 1 }); // For retry job
        await EmailLog.collection.createIndex({ recipient: 1, status: 1 });
        await EmailLog.collection.createIndex({ status: 1, createdAt: -1 });
        console.log('✅ EmailLog indexes created');

        console.log('\n🎉 All indexes created successfully!');
        console.log('\nIndex Summary:');
        console.log('- Doctor: department, name (text), userId');
        console.log('- Appointment: doctorId+date, patientId+date, status, slotStart, reminderSent+slotStart');
        console.log('- MedicalRecord: patientId+date, doctorId+date, appointmentId (unique)');
        console.log('- Notification: userId+read+createdAt, expiresAt (TTL)');
        console.log('- DailyQueue: doctorId+date (unique), date+status');
        console.log('- QueueAnalytics: doctorId+date (unique), date');
        console.log('- AuditLog: userId+createdAt, entityType+entityId+createdAt, action+createdAt, createdAt');
        console.log('- EmailLog: status+attempts+lastAttemptAt, recipient+status, status+createdAt');

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error creating indexes:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

createIndexes();
