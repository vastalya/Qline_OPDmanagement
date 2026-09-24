/**
 * Data Persistence Verification Service
 * Ensures required test data exists on application startup
 * Runs once on app initialization
 */

const User = require('../models/User');
const logger = require('./logger');
const STARTUP_TEST_SEED_ENABLED = process.env.ENABLE_STARTUP_TEST_SEED === 'true';

const TEST_USERS = [
    // Admin
    {
        name: 'System Admin',
        email: 'admin@qline.app',
        password: 'admin123',
        role: 'admin'
    },
    // Patients
    {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'patient'
    },
    {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        role: 'patient'
    },
    {
        name: 'Robert Johnson',
        email: 'robert@example.com',
        password: 'password123',
        role: 'patient'
    },
    // Doctors
    {
        name: 'Dr. Sarah Williams',
        email: 'doctor.sarah@example.com',
        password: 'password123',
        role: 'doctor'
    },
    {
        name: 'Dr. Michael Chen',
        email: 'doctor.michael@example.com',
        password: 'password123',
        role: 'doctor'
    },
    {
        name: 'Dr. Emily Rodriguez',
        email: 'doctor.emily@example.com',
        password: 'password123',
        role: 'doctor'
    }
];

async function verifyAndInitializeData() {
    try {
        if (!STARTUP_TEST_SEED_ENABLED) {
            logger.info('Startup test-user seeding disabled (set ENABLE_STARTUP_TEST_SEED=true to enable)');
            return true;
        }

        logger.info('🔍 Checking data persistence...');

        // Check if required users exist
        const userCount = await User.countDocuments();
        logger.info(`📊 Found ${userCount} users in database`);

        // Check for each test user
        const missingUsers = [];
        for (const testUser of TEST_USERS) {
            const exists = await User.findOne({ email: testUser.email });
            if (!exists) {
                missingUsers.push(testUser);
            }
        }

        if (missingUsers.length > 0) {
            logger.warn(
                `⚠️  ${missingUsers.length} test users missing. Creating them...`
            );

            // Create missing users
            for (const user of missingUsers) {
                try {
                    await User.create(user);
                    logger.info(`✅ Created user: ${user.email}`);
                } catch (error) {
                    // Skip duplicates from race conditions
                    if (error.code !== 11000) {
                        logger.error(`❌ Failed to create ${user.email}:`, error.message);
                    }
                }
            }
        } else {
            logger.info('✅ All test users are present in database');
        }

        // Final verification count
        const finalCount = await User.countDocuments();
        logger.info(
            `🎯 Data persistence check complete. Total users: ${finalCount}`
        );

        return true;
    } catch (error) {
        logger.error('❌ Data persistence check failed:', error);
        // Don't exit - allow app to continue even if check fails
        return false;
    }
}

module.exports = {
    verifyAndInitializeData
};
