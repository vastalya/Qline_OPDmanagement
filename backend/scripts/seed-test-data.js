/**
 * Seed database with comprehensive test data for demo
 * Usage: node scripts/seed-test-data.js
 * 
 * Creates:
 *   - 1 admin
 *   - 3 patients (john, jane, robert)
 *   - 4 doctors with fully configured schedules
 *   - Sample appointments (past, present, future)
 *   - Daily queues for today
 */

require('../config/loadEnv');
const mongoose = require('mongoose');

const User = require('../models/User');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const DailyQueue = require('../models/DailyQueue');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qline';

function todayMidnightUTC() {
    const t = new Date();
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
}
function daysFromToday(n) {
    const d = todayMidnightUTC();
    d.setUTCDate(d.getUTCDate() + n);
    return d;
}
function slotDateTime(baseDate, hh, mm) {
    return new Date(Date.UTC(
        baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate(),
        hh, mm, 0, 0
    ));
}

async function main() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // ── Clear existing data ────────────────────────────────────────────────
        console.log('🧹 Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Doctor.deleteMany({}),
            Appointment.deleteMany({}),
            DailyQueue.deleteMany({}),
        ]);
        console.log('✅ Data cleared');

        // ── Admin ────────────────────────────────────────────────────────────
        const [admin] = await User.create([{
            name: 'Admin User',
            email: 'admin@qline.app',
            password: 'admin123',
            role: 'admin',
        }]);
        console.log(`✅ Created admin: ${admin.email}`);

        // ── Patients ─────────────────────────────────────────────────────────
        const [john, jane, robert] = await User.create([
            { name: 'John Doe', email: 'john@example.com', password: 'password123', role: 'patient' },
            { name: 'Jane Smith', email: 'jane@example.com', password: 'password123', role: 'patient' },
            { name: 'Robert Johnson', email: 'robert@example.com', password: 'password123', role: 'patient' },
        ]);
        console.log('✅ Created 3 patients');

        // ── Doctor Users ─────────────────────────────────────────────────────
        // NOTE: Names do NOT have "Dr." prefix — the frontend adds it
        const [uSarah, uMichael, uEmily, uJames] = await User.create([
            { name: 'Sarah Williams', email: 'doctor.sarah@example.com', password: 'password123', role: 'doctor' },
            { name: 'Michael Chen', email: 'doctor.michael@example.com', password: 'password123', role: 'doctor' },
            { name: 'Emily Rodriguez', email: 'doctor.emily@example.com', password: 'password123', role: 'doctor' },
            { name: 'James Wilson', email: 'doctor.james@example.com', password: 'password123', role: 'doctor' },
        ]);
        console.log('✅ Created 4 doctor users');

        // ── Doctor Profiles (fully configured) ────────────────────────────────
        const [dSarah, dMichael, dEmily, dJames] = await Doctor.create([
            {
                userId: uSarah._id,
                department: 'General Medicine',
                defaultConsultTime: 15,
                maxPatientsPerDay: 20,
                workingHours: { start: '09:00', end: '17:00' },
                breakSlots: [{ start: '13:00', end: '14:00' }],
            },
            {
                userId: uMichael._id,
                department: 'Cardiology',
                defaultConsultTime: 20,
                maxPatientsPerDay: 15,
                workingHours: { start: '10:00', end: '16:00' },
                breakSlots: [],
            },
            {
                userId: uEmily._id,
                department: 'Pediatrics',
                defaultConsultTime: 10,
                maxPatientsPerDay: 25,
                workingHours: { start: '09:00', end: '14:00' },
                breakSlots: [],
            },
            {
                userId: uJames._id,
                department: 'Orthopedics',
                defaultConsultTime: 15,
                maxPatientsPerDay: 18,
                workingHours: { start: '08:00', end: '16:00' },
                breakSlots: [{ start: '12:00', end: '13:00' }],
            },
        ]);
        console.log('✅ Created 4 doctor profiles with working hours');

        // ── Sample Appointments ───────────────────────────────────────────────
        const today = todayMidnightUTC();
        const tomorrow = daysFromToday(1);
        const yesterday = daysFromToday(-1);
        const nextWeek = daysFromToday(2);

        // Today's appointments for Dr. Sarah (for doctor dashboard demo)
        const todayAppts = await Appointment.create([
            {
                patientId: john._id,
                doctorId: dSarah._id,
                date: today,
                slotStart: slotDateTime(today, 9, 0),
                slotEnd: slotDateTime(today, 9, 15),
                status: 'completed',
                tokenNumber: 1,
                priority: 'standard',
            },
            {
                patientId: jane._id,
                doctorId: dSarah._id,
                date: today,
                slotStart: slotDateTime(today, 9, 15),
                slotEnd: slotDateTime(today, 9, 30),
                status: 'completed',
                tokenNumber: 2,
                priority: 'standard',
            },
            {
                patientId: robert._id,
                doctorId: dSarah._id,
                date: today,
                slotStart: slotDateTime(today, 9, 30),
                slotEnd: slotDateTime(today, 9, 45),
                status: 'waiting',
                tokenNumber: 3,
                priority: 'senior',
            },
            {
                patientId: john._id,
                doctorId: dSarah._id,
                date: today,
                slotStart: slotDateTime(today, 9, 45),
                slotEnd: slotDateTime(today, 10, 0),
                status: 'booked',
                tokenNumber: 4,
                priority: 'standard',
            },
        ]);

        // Tomorrow's appointments for patients to see
        await Appointment.create([
            {
                patientId: john._id,
                doctorId: dMichael._id,
                date: tomorrow,
                slotStart: slotDateTime(tomorrow, 10, 0),
                slotEnd: slotDateTime(tomorrow, 10, 20),
                status: 'booked',
                tokenNumber: 1,
                priority: 'standard',
            },
            {
                patientId: jane._id,
                doctorId: dEmily._id,
                date: tomorrow,
                slotStart: slotDateTime(tomorrow, 9, 0),
                slotEnd: slotDateTime(tomorrow, 9, 10),
                status: 'booked',
                tokenNumber: 1,
                priority: 'standard',
            },
        ]);

        // Past appointments (for history)
        const medicalRecordAppt = (await Appointment.create([
            {
                patientId: john._id,
                doctorId: dSarah._id,
                date: yesterday,
                slotStart: slotDateTime(yesterday, 9, 0),
                slotEnd: slotDateTime(yesterday, 9, 15),
                status: 'completed',
                tokenNumber: 1,
                priority: 'standard',
            },
            {
                patientId: jane._id,
                doctorId: dJames._id,
                date: yesterday,
                slotStart: slotDateTime(yesterday, 8, 0),
                slotEnd: slotDateTime(yesterday, 8, 15),
                status: 'completed',
                tokenNumber: 1,
                priority: 'standard',
            },
        ]));

        // Future appointment next week
        await Appointment.create([
            {
                patientId: robert._id,
                doctorId: dMichael._id,
                date: nextWeek,
                slotStart: slotDateTime(nextWeek, 10, 20),
                slotEnd: slotDateTime(nextWeek, 10, 40),
                status: 'booked',
                tokenNumber: 2,
                priority: 'standard',
            },
        ]);

        console.log('✅ Created sample appointments (today, tomorrow, yesterday, next week)');

        // ── Daily Queue for Today (Dr. Sarah) ──────────────────────────────────
        await DailyQueue.create({
            doctorId: dSarah._id,
            date: today,
            status: 'active',
            appointmentCount: todayAppts.length,
            lastTokenNumber: todayAppts.length,
            currentToken: 3,
        });
        console.log("✅ Created today's queue for Dr. Sarah");

        // ── Medical Records ───────────────────────────────────────────────────
        // Only create if the model exists
        try {
            const MedicalRecord = require('../models/MedicalRecord');
            await MedicalRecord.create([
                {
                    patientId: john._id,
                    doctorId: dSarah._id,
                    appointmentId: medicalRecordAppt[0]._id,
                    chiefComplaint: 'Fever and cough for 3 days',
                    diagnosis: 'Acute Upper Respiratory Infection',
                    symptoms: ['fever', 'cough', 'sore throat'],
                    vitals: {
                        bloodPressure: '120/80',
                        heartRate: 88,
                        temperature: 38.5,
                        weight: 72,
                        height: 175,
                    },
                    medications: [
                        { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily', duration: '5 days' },
                        { name: 'Cetirizine', dosage: '10mg', frequency: 'Once at night', duration: '5 days' },
                    ],
                    labTests: [],
                    doctorNotes: 'Patient presented with fever and productive cough. Advised rest and hydration. Follow up in 5 days if no improvement.',
                    followUpDate: nextWeek,
                    followUpInstructions: 'Return if fever persists beyond 5 days.',
                },
                {
                    patientId: jane._id,
                    doctorId: dJames._id,
                    appointmentId: medicalRecordAppt[1]._id,
                    chiefComplaint: 'Lower back pain',
                    diagnosis: 'Lumbar Muscle Strain',
                    symptoms: ['back pain', 'muscle stiffness'],
                    vitals: {
                        bloodPressure: '118/76',
                        heartRate: 72,
                        temperature: 37.0,
                        weight: 58,
                        height: 162,
                    },
                    medications: [
                        { name: 'Ibuprofen', dosage: '400mg', frequency: 'Three times daily with food', duration: '7 days' },
                        { name: 'Methocarbamol', dosage: '750mg', frequency: 'Three times daily', duration: '5 days' },
                    ],
                    labTests: [],
                    doctorNotes: 'Muscle strain due to poor posture. Recommend physiotherapy. Ice/heat therapy at home.',
                    followUpDate: nextWeek,
                    followUpInstructions: 'Schedule physiotherapy session.',
                },
            ]);
            console.log('✅ Created 2 medical records');
        } catch (e) {
            console.log('⚠️  MedicalRecord model not found, skipping medical records');
        }

        // ── Summary ───────────────────────────────────────────────────────────
        console.log('\n' + '='.repeat(60));
        console.log('🎉 DEMO DATA CREATED SUCCESSFULLY');
        console.log('='.repeat(60));
        console.log('\n👤 ADMIN:');
        console.log('   admin@qline.app / admin123');
        console.log('\n🏥 PATIENTS:');
        console.log('   john@example.com / password123 (John Doe)');
        console.log('   jane@example.com / password123 (Jane Smith)');
        console.log('   robert@example.com / password123 (Robert Johnson)');
        console.log('\n👨‍⚕️ DOCTORS:');
        console.log('   doctor.sarah@example.com / password123 (Sarah Williams — General Medicine)');
        console.log('   doctor.michael@example.com / password123 (Michael Chen — Cardiology)');
        console.log('   doctor.emily@example.com / password123 (Emily Rodriguez — Pediatrics)');
        console.log('   doctor.james@example.com / password123 (James Wilson — Orthopedics)');
        console.log('\n   All doctors have working hours 9AM-5PM (or similar)');
        console.log('   Appointments exist: yesterday (completed), today (active queue), tomorrow (booked)');
        console.log('\n' + '='.repeat(60));
        console.log('🚀 Start the app: npm run dev (backend) + npm run dev (frontend)');
        console.log('🌐 Login at: http://localhost:3000/login');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
        if (error.errors) {
            Object.entries(error.errors).forEach(([k, v]) => console.error(`   ${k}: ${v.message}`));
        }
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
    }
}

main();
