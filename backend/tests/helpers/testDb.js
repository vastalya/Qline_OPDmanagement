const mongoose = require('mongoose');

const ensureTestEnv = () => {
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
    process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
    process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/qline_test';
};

const connectTestDb = async () => {
    if (mongoose.connection.readyState === 1) {
        return;
    }

    await mongoose.connect(process.env.MONGO_URI);
};

const clearTestDb = async () => {
    if (mongoose.connection.readyState !== 1) {
        return;
    }
    await mongoose.connection.db.dropDatabase();
};

const disconnectTestDb = async () => {
    if (mongoose.connection.readyState === 0) {
        return;
    }
    await mongoose.disconnect();
};

const isReplicaSetConnection = async () => {
    if (mongoose.connection.readyState !== 1) {
        return false;
    }

    try {
        const admin = mongoose.connection.db.admin();
        const hello = await admin.command({ hello: 1 });
        return Boolean(hello.setName);
    } catch (error) {
        return false;
    }
};

module.exports = {
    ensureTestEnv,
    connectTestDb,
    clearTestDb,
    disconnectTestDb,
    isReplicaSetConnection,
};
