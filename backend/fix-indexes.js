const mongoose = require('mongoose');
require('./config/loadEnv');

async function fixIndexes() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is required');
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri);
        console.log('Connected');

        const db = mongoose.connection.db;
        const collections = ['doctors', 'appointments', 'daily_queues', 'medical_records'];

        for (const collName of collections) {
            try {
                console.log(`\nFixing indexes for ${collName}...`);
                const coll = db.collection(collName);
                const indexes = await coll.listIndexes().toArray();

                console.log(`Found ${indexes.length} indexes`);

                for (const idx of indexes) {
                    if (idx.name !== '_id_') {
                        try {
                            await coll.dropIndex(idx.name);
                            console.log(`Dropped: ${idx.name}`);
                        } catch (_error) {
                            console.log(`Skipped: ${idx.name}`);
                        }
                    }
                }
            } catch (_error) {
                console.log(`${collName} does not exist yet; it will be created on startup`);
            }
        }

        console.log('\nDatabase indexes reset successfully');
        console.log('Backend will recreate indexes on startup');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixIndexes();
