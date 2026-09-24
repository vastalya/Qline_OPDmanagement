/**
 * Setup Test Data for Phase 3 Testing
 * Creates doctor, patients, schedule, and appointments
 */

const mongoose = require('mongoose');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Appointment = require('./models/Appointment');
const DailyQueue = require('./models/DailyQueue');
const bcrypt = require('bcrypt');
const { normalizeDate } = require('./utils/dateUtils');

async function setupTestData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/qline');
        console.log('✅ Connected to MongoDB');

        // 1. Create Doctor User
        console.log('\n1. Creating doctor user...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        let doctorUser = await User.findOne({ email: 'doctor@test.com' });
        if (!doctorUser) {
            doctorUser = await User.create({
                name: 'Dr. Test',
                email: 'doctor@test.com',
                password: hashedPassword,
                role: 'doctor'
            });
            console.log('✅ Doctor user created:', doctorUser.email);
        } else {
            console.log('ℹ️  Doctor user already exists:', doctorUser.email);
        }

        // 2. Create Doctor Profile
        console.log('\n2. Creating doctor profile...');
        let doctorProfile = await Doctor.findOne({ userId: doctorUser._id });
        if (!doctorProfile) {
            doctorProfile = await Doctor.create({
                userId: doctorUser._id,
                department: 'General Medicine',
                workingHours: {
                    start: '09:00',
                    end: '17:00'
                },
                timezone: 'UTC',
                defaultConsultTime: 15,
                maxPatientsPerDay: 20
            });
            console.log('✅ Doctor profile created');
        } else {
            console.log('ℹ️  Doctor profile already exists');
        }

        // 3. Create Patient Users
        console.log('\n3. Creating patient users...');
        const patientEmails = [
            'patient1@test.com',
            'patient2@test.com',
            'patient3@test.com'
        ];

        const patients = [];
        for (let i = 0; i < patientEmails.length; i++) {
            let patient = await User.findOne({ email: patientEmails[i] });
            if (!patient) {
                patient = await User.create({
                    name: `Patient ${i + 1}`,
                    email: patientEmails[i],
                    password: hashedPassword,
                    role: 'patient'
                });
                console.log(`✅ Created patient: ${patient.email}`);
            } else {
                console.log(`ℹ️  Patient exists: ${patient.email}`);
            }
            patients.push(patient);
        }

        // 4. Create Today's Queue
        console.log('\n4. Creating today\'s queue...');
        const today = normalizeDate(new Date());
        let queue = await DailyQueue.findOne({
            doctorId: doctorProfile._id,
            date: today
        });

        if (!queue) {
            queue = await DailyQueue.create({
                doctorId: doctorProfile._id,
                date: today,
                currentToken: 0,
                appointmentCount: 0,
                lastTokenNumber: 0,
                waitingList: [],
                status: 'active'
            });
            console.log('✅ Queue created for today');
        } else {
            console.log('ℹ️  Queue already exists for today');
        }

        // 5. Create Appointments
        console.log('\n5. Creating appointments...');
        for (let i = 0; i < patients.length; i++) {
            const slotStart = new Date(today);
            slotStart.setHours(9 + i, 0, 0, 0);
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + 15);

            let appointment = await Appointment.findOne({
                doctorId: doctorProfile._id,
                patientId: patients[i]._id,
                date: today,
                slotStart
            });

            if (!appointment) {
                // Use atomic increment for token
                const updatedQueue = await DailyQueue.findOneAndUpdate(
                    { _id: queue._id },
                    {
                        $inc: {
                            lastTokenNumber: 1,
                            appointmentCount: 1
                        }
                    },
                    { new: true }
                );

                const tokenNumber = updatedQueue.lastTokenNumber;

                appointment = await Appointment.create({
                    doctorId: doctorProfile._id,
                    patientId: patients[i]._id,
                    date: today,
                    slotStart,
                    slotEnd,
                    tokenNumber,
                    status: 'waiting' // Ready for queue
                });

                // Add to waiting list
                await DailyQueue.findByIdAndUpdate(queue._id, {
                    $push: {
                        waitingList: {
                            appointmentId: appointment._id,
                            tokenNumber,
                            status: 'waiting'
                        }
                    }
                });

                console.log(`✅ Created appointment for ${patients[i].name}, Token: ${tokenNumber}`);
            } else {
                console.log(`ℹ️  Appointment exists for ${patients[i].name}`);
            }
        }

        // 6. Print Test Information
        console.log('\n' + '='.repeat(60));
        console.log('Test Data Setup Complete!');
        console.log('='.repeat(60));
        console.log('\nCredentials:');
        console.log(`Doctor: doctor@test.com / password123`);
        console.log(`Patient 1: patient1@test.com / password123`);
        console.log(`Patient 2: patient2@test.com / password123`);
        console.log(`Patient 3: patient3@test.com / password123`);

        console.log('\nTest Information:');
        console.log(`Doctor ID: ${doctorProfile._id}`);
        console.log(`Today's Date: ${today.toISOString().split('T')[0]}`);
        console.log(`Queue Status: ${queue.status}`);
        console.log(`Waiting Patients: ${queue.waitingList.length}`);

        console.log('\n' + '='.repeat(60));
        console.log('\nNext Steps:');
        console.log('1. Login as doctor to get JWT token');
        console.log('2. Test queue endpoints using the token');
        console.log('3. See phase3_testing_guide.md for test cases');
        console.log('='.repeat(60) + '\n');

        mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error setting up test data:', error);
        mongoose.connection.close();
        process.exit(1);
    }
}

// Load environment variables
require('./config/loadEnv');

// Run setup
setupTestData();
