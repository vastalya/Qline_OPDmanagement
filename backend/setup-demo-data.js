/**
 * Setup Demo Data for Complete Evaluation
 * - Creates 10+ doctors with different specialties
 * - Creates 20+ patients
 * - Creates realistic appointments with various statuses
 * - Includes historical data for waiting time calculations
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('./config/loadEnv');

const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const QueueEvent = require('./models/QueueEvent');

// Sample data
const doctors = [
    { name: 'Dr. Sarah Johnson', department: 'Cardiology', specialization: 'Heart Specialist', consultTime: 20, maxPatients: 30 },
    { name: 'Dr. Michael Chen', department: 'Dermatology', specialization: 'Skin Specialist', consultTime: 15, maxPatients: 40 },
    { name: 'Dr. Priya Sharma', department: 'Orthopedics', specialization: 'Bone Specialist', consultTime: 20, maxPatients: 25 },
    { name: 'Dr. James Wilson', department: 'General Medicine', specialization: 'General Physician', consultTime: 15, maxPatients: 50 },
    { name: 'Dr. Lisa Anderson', department: 'Pediatrics', specialization: 'Child Specialist', consultTime: 15, maxPatients: 35 },
    { name: 'Dr. Raj Patel', department: 'Neurology', specialization: 'Nerve Specialist', consultTime: 25, maxPatients: 20 },
    { name: 'Dr. Emma Roberts', department: 'Gastroenterology', specialization: 'Digestive Specialist', consultTime: 20, maxPatients: 25 },
    { name: 'Dr. David Martinez', department: 'ENT', specialization: 'Ear, Nose, Throat', consultTime: 15, maxPatients: 30 },
    { name: 'Dr. Sophie Laurent', department: 'Gynecology', specialization: 'Women Health', consultTime: 20, maxPatients: 25 },
    { name: 'Dr. Arun Kumar', department: 'Pulmonology', specialization: 'Lung Specialist', consultTime: 18, maxPatients: 28 },
];

const patientNames = [
    { firstName: 'John', lastName: 'Patient', phone: '555-0101' },
    { firstName: 'Sarah', lastName: 'Smith', phone: '555-0102' },
    { firstName: 'Michael', lastName: 'Brown', phone: '555-0103' },
    { firstName: 'Emily', lastName: 'Davis', phone: '555-0104' },
    { firstName: 'David', lastName: 'Wilson', phone: '555-0105' },
    { firstName: 'Jessica', lastName: 'Moore', phone: '555-0106' },
    { firstName: 'Robert', lastName: 'Taylor', phone: '555-0107' },
    { firstName: 'Lisa', lastName: 'Anderson', phone: '555-0108' },
    { firstName: 'James', lastName: 'Thomas', phone: '555-0109' },
    { firstName: 'Mary', lastName: 'Jackson', phone: '555-0110' },
    { firstName: 'William', lastName: 'White', phone: '555-0111' },
    { firstName: 'Jennifer', lastName: 'Harris', phone: '555-0112' },
    { firstName: 'Richard', lastName: 'Martin', phone: '555-0113' },
    { firstName: 'Patricia', lastName: 'Thompson', phone: '555-0114' },
    { firstName: 'Joseph', lastName: 'Garcia', phone: '555-0115' },
    { firstName: 'Linda', lastName: 'Martinez', phone: '555-0116' },
    { firstName: 'Charles', lastName: 'Robinson', phone: '555-0117' },
    { firstName: 'Barbara', lastName: 'Clark', phone: '555-0118' },
    { firstName: 'Thomas', lastName: 'Rodriguez', phone: '555-0119' },
    { firstName: 'Susan', lastName: 'Lewis', phone: '555-0120' },
];

const complaints = [
    'Regular checkup',
    'Chest pain',
    'Headache',
    'Cough and cold',
    'Skin rash',
    'Back pain',
    'Joint pain',
    'Fever',
    'Stomach pain',
    'Allergies',
    'Anxiety',
    'Insomnia',
    'Muscle pain',
    'Migraine',
    'High blood pressure',
];

const diagnoses = [
    'Common cold',
    'Hypertension',
    'Type 2 Diabetes',
    'Seasonal allergies',
    'Mild anxiety',
    'Muscle strain',
    'Sinusitis',
    'Gastritis',
    'Dermatitis',
    'Arthritis',
    'No significant findings',
    'Minor infection',
];

const medications = [
    { name: 'Aspirin', dosage: '500mg', frequency: 'Once daily' },
    { name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily' },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily' },
    { name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily' },
    { name: 'Omeprazole', dosage: '20mg', frequency: 'Once daily' },
    { name: 'Cetirizine', dosage: '10mg', frequency: 'Once daily' },
    { name: 'Ibuprofen', dosage: '400mg', frequency: 'Three times daily' },
];

async function setupDemoData() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/qline';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('\n🗑️  Clearing existing data...');
        await Promise.all([
            User.deleteMany({}),
            Doctor.deleteMany({}),
            Appointment.deleteMany({}),
            MedicalRecord.deleteMany({}),
            QueueEvent.deleteMany({}),
        ]);
        console.log('✅ Database cleared');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create Admin User
        console.log('\n👨‍💼 Creating admin user...');
        const adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            password: hashedPassword,
            role: 'admin',
            emailVerified: true,
            phone: '555-0000',
        });
        console.log('✅ Admin created:', adminUser.email);

        // Create Doctors
        console.log('\n👨‍⚕️  Creating doctors...');
        const doctorUsers = [];
        const doctorProfiles = [];

        for (let i = 0; i < doctors.length; i++) {
            const doc = doctors[i];
            const email = `doctor${i + 1}@test.com`;

            const doctorUser = await User.create({
                name: doc.name,
                email: email,
                password: hashedPassword,
                role: 'doctor',
                emailVerified: true,
                phone: `555-${1000 + i}`,
            });

            const doctorProfile = await Doctor.create({
                userId: doctorUser._id,
                department: doc.department,
                workingHours: {
                    start: '09:00',
                    end: '18:00',
                },
                breakSlots: [
                    { start: '12:00', end: '13:00' }, // Lunch break
                ],
                timezone: 'UTC',
                defaultConsultTime: doc.consultTime,
                maxPatientsPerDay: doc.maxPatients,
            });

            doctorUsers.push(doctorUser);
            doctorProfiles.push(doctorProfile);
            console.log(`✅ Doctor ${i + 1}/10: ${doc.name} (${doc.department})`);
        }

        // Create Patients
        console.log('\n👤 Creating patients...');
        const patientUsers = [];

        for (let i = 0; i < patientNames.length; i++) {
            const patient = patientNames[i];
            const email = `patient${i + 1}@test.com`;

            const patientUser = await User.create({
                firstName: patient.firstName,
                lastName: patient.lastName,
                name: `${patient.firstName} ${patient.lastName}`,
                email: email,
                password: hashedPassword,
                role: 'patient',
                emailVerified: true,
                phone: patient.phone,
                dateOfBirth: new Date(1980 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
                gender: Math.random() > 0.5 ? 'male' : 'female',
            });

            patientUsers.push(patientUser);
            console.log(`✅ Patient ${i + 1}/${patientNames.length}: ${patient.firstName} ${patient.lastName}`);
        }

        // Create Appointments with realistic data
        console.log('\n📅 Creating appointments...');
        const TODAY = new Date();
        TODAY.setHours(0, 0, 0, 0);
        let appointmentCount = 0;

        // For each doctor, create appointments for the next 30 days
        for (const doctorProfile of doctorProfiles) {
            const doctor = await Doctor.findById(doctorProfile._id).populate('userId');
            const consultTime = doctor.defaultConsultTime;
            
            // Create appointments for next 30 days
            for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
                const appointmentDate = new Date(TODAY);
                appointmentDate.setDate(appointmentDate.getDate() + dayOffset);

                // Skip Sundays
                if (appointmentDate.getDay() === 0) continue;

                // Create 5-12 appointments per doctor per day
                const appointmentsForDay = 5 + Math.floor(Math.random() * 8);
                let dayStart = new Date(appointmentDate);
                dayStart.setHours(9, 0, 0, 0);
                let dayEnd = new Date(appointmentDate);
                dayEnd.setHours(18, 0, 0, 0);

                for (let slot = 0; slot < appointmentsForDay; slot++) {
                    const slotStart = new Date(dayStart);
                    slotStart.setMinutes(slotStart.getMinutes() + slot * consultTime);

                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + consultTime);

                    if (slotEnd > dayEnd) break;

                    // Random patient
                    const randomPatient = patientUsers[Math.floor(Math.random() * patientUsers.length)];
                    
                    // Determine status based on date
                    let status = 'booked';
                    if (appointmentDate < TODAY) {
                        const statuses = ['completed', 'no_show', 'cancelled'];
                        status = statuses[Math.floor(Math.random() * statuses.length)];
                    } else if (appointmentDate.getTime() === TODAY.getTime()) {
                        const statuses = ['waiting', 'in_progress', 'completed', 'booked'];
                        status = statuses[Math.floor(Math.random() * statuses.length)];
                    }

                    const appointment = await Appointment.create({
                        doctorId: doctorProfile._id,
                        patientId: randomPatient._id,
                        date: appointmentDate,
                        slotStart: slotStart,
                        slotEnd: slotEnd,
                        tokenNumber: slot + 1,
                        status: status,
                        priority: Math.random() > 0.9 ? (Math.random() > 0.5 ? 'emergency' : 'senior') : 'standard',
                    });

                    // Create QueueEvents for completed/in-progress appointments
                    if (status === 'completed' || status === 'in_progress') {
                        // waiting event
                        await QueueEvent.create({
                            appointmentId: appointment._id,
                            doctorId: doctorProfile._id,
                            patientId: randomPatient._id,
                            event: 'waiting',
                            timestamp: new Date(slotStart.getTime() - Math.random() * 30 * 60000),
                        });

                        // in_progress event
                        await QueueEvent.create({
                            appointmentId: appointment._id,
                            doctorId: doctorProfile._id,
                            patientId: randomPatient._id,
                            event: 'in_progress',
                            timestamp: new Date(slotStart.getTime()),
                        });

                        if (status === 'completed') {
                            // completed event (15-45 minutes after start)
                            await QueueEvent.create({
                                appointmentId: appointment._id,
                                doctorId: doctorProfile._id,
                                patientId: randomPatient._id,
                                event: 'completed',
                                timestamp: new Date(slotStart.getTime() + (15 + Math.random() * 30) * 60000),
                            });
                        }
                    }

                    appointmentCount++;
                }
            }
        }
        console.log(`✅ Created ${appointmentCount} appointments`);

        // Create Medical Records
        console.log('\n📋 Creating medical records...');
        let recordCount = 0;

        // Get a sample of completed appointments
        const completedAppointments = await Appointment.find({ 
            status: 'completed' 
        }).limit(100);

        for (const appointment of completedAppointments) {
            const recordsPerAppointment = 1; // One record per completed appointment
            
            for (let r = 0; r < recordsPerAppointment; r++) {
                await MedicalRecord.create({
                    appointmentId: appointment._id,
                    doctorId: appointment.doctorId,
                    patientId: appointment.patientId,
                    date: appointment.date,
                    chiefComplaint: complaints[Math.floor(Math.random() * complaints.length)],
                    diagnosis: diagnoses[Math.floor(Math.random() * diagnoses.length)],
                    medications: [
                        medications[Math.floor(Math.random() * medications.length)],
                        medications[Math.floor(Math.random() * medications.length)],
                    ],
                    vitals: {
                        temperature: 98.6 + (Math.random() - 0.5) * 2,
                        bloodPressure: `${120 + Math.floor(Math.random() * 30)}/${70 + Math.floor(Math.random() * 20)}`,
                        pulse: 60 + Math.floor(Math.random() * 40),
                        respiratoryRate: 16 + Math.floor(Math.random() * 8),
                        weight: 150 + Math.floor(Math.random() * 100),
                        height: 160 + Math.floor(Math.random() * 40),
                    },
                    notes: 'Patient shows good recovery. Continue treatment as prescribed.',
                    followUp: {
                        required: Math.random() > 0.6,
                        days: 7 + Math.floor(Math.random() * 21),
                        notes: 'Regular follow-up recommended.',
                    },
                });

                recordCount++;
            }
        }
        console.log(`✅ Created ${recordCount} medical records`);

        console.log('\n' + '='.repeat(50));
        console.log('✨ DEMO DATA SETUP COMPLETE ✨');
        console.log('='.repeat(50));
        console.log('\n📊 Summary:');
        console.log(`   Doctors: ${doctorProfiles.length}`);
        console.log(`   Patients: ${patientUsers.length}`);
        console.log(`   Appointments: ${appointmentCount}`);
        console.log(`   Medical Records: ${recordCount}`);
        console.log('\n🔐 Test Credentials:');
        console.log('   Admin: admin@test.com / password123');
        console.log('   Doctor 1-10: doctor1@test.com - doctor10@test.com / password123');
        console.log('   Patient 1-20: patient1@test.com - patient20@test.com / password123');
        console.log('\n✅ Ready for demo!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

setupDemoData();
