// MongoDB initialization script
// Runs once on first container start

db = db.getSiblingDB('qline');

// Create collections
db.createCollection('users');
db.createCollection('doctors');
db.createCollection('appointments');
db.createCollection('dailyqueues');
db.createCollection('queueevents');
db.createCollection('notifications');
db.createCollection('medicalrecords');
db.createCollection('queueanalytics');
db.createCollection('emaillogs');
db.createCollection('auditlogs');

// Seed an admin user (password: admin123 - pre-hashed with bcrypt)
const adminPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQyCgMQjFAr7/0M3hLJv.wHxK';

db.users.insertOne({
    name: 'System Admin',
    email: 'admin@qline.app',
    password: adminPassword,
    role: 'admin',
    isVerified: true,
    createdAt: new Date(),
    updatedAt: new Date()
});

// Seed test data (6 users: 3 patients, 3 doctors)
// Using pre-hashed bcrypt password: password123
const hashedPassword = '$2b$10$2GASl.XsYm1uLlIuDia4keiVBDcvF.KEjlV4LWr9YIiUoS00UgAnG';

// Check if test data already exists
const patientCount = db.users.countDocuments({ role: 'patient' });
const doctorCount = db.users.countDocuments({ role: 'doctor' });

if (patientCount === 0 && doctorCount === 0) {
    // Create patients
    const patients = db.users.insertMany([
        {
            name: 'John Doe',
            email: 'john@example.com',
            password: hashedPassword,
            role: 'patient',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Jane Smith',
            email: 'jane@example.com',
            password: hashedPassword,
            role: 'patient',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Robert Johnson',
            email: 'robert@example.com',
            password: hashedPassword,
            role: 'patient',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]);

    // Create doctors
    const doctors = db.users.insertMany([
        {
            name: 'Dr. Sarah Williams',
            email: 'doctor.sarah@example.com',
            password: hashedPassword,
            role: 'doctor',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Dr. Michael Chen',
            email: 'doctor.michael@example.com',
            password: hashedPassword,
            role: 'doctor',
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            name: 'Dr. Emily Rodriguez',
            email: 'doctor.emily@example.com',
            password: hashedPassword,
            role: 'doctor',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]);

    print('✅ Test data seeded: 3 patients + 3 doctors + 1 admin');
} else {
    print('ℹ️  Test data already exists, skipping seed');
}

print('✅ Qline MongoDB initialized');
