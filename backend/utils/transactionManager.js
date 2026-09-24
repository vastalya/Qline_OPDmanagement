const mongoose = require('mongoose');

let cachedSupport = null;

const resetTransactionSupportCache = () => {
    cachedSupport = null;
};

const supportsTransactions = async () => {
    if (cachedSupport !== null) {
        return cachedSupport;
    }

    if (mongoose.connection.readyState !== 1) {
        cachedSupport = false;
        return cachedSupport;
    }

    try {
        const hello = await mongoose.connection.db.admin().command({ hello: 1 });
        cachedSupport = Boolean(hello.setName || hello.msg === 'isdbgrid');
    } catch {
        cachedSupport = false;
    }

    return cachedSupport;
};

const isTransactionUnsupportedError = (error) => {
    const message = error?.message || '';
    return (
        message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
        message.includes('Transaction support is not available')
    );
};

const withOptionalTransaction = async (work) => {
    const canUseTransactions = await supportsTransactions();

    if (!canUseTransactions) {
        return work({ session: null, usingTransaction: false });
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const result = await work({ session, usingTransaction: true });
        await session.commitTransaction();
        return result;
    } catch (error) {
        try {
            await session.abortTransaction();
        } catch {}

        if (isTransactionUnsupportedError(error)) {
            resetTransactionSupportCache();
            return work({ session: null, usingTransaction: false });
        }

        throw error;
    } finally {
        await session.endSession();
    }
};

module.exports = {
    supportsTransactions,
    withOptionalTransaction,
    resetTransactionSupportCache,
};
