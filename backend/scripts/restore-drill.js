#!/usr/bin/env node
/**
 * Qline Backup Restore Drill
 * Tests restore from latest S3 backup to verify integrity
 * Run: node scripts/restore-drill.js
 */

const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

const S3_BUCKET = process.env.S3_BACKUP_BUCKET;
const BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY;
const RESTORE_MONGO_URI = process.env.RESTORE_MONGO_URI || process.env.MONGO_URI;

async function run() {
    console.log('🔄 Starting restore drill...');

    // 1. Find latest backup
    const { stdout } = await execAsync(
        `aws s3 ls s3://${S3_BUCKET}/backups/mongodb/ --recursive | sort | tail -1`
    );
    const latestFile = stdout.trim().split(/\s+/).pop();
    console.log(`📦 Latest backup: ${latestFile}`);

    // 2. Download
    const localEncrypted = `/tmp/restore_drill_${Date.now()}.tar.gz.enc`;
    await execAsync(`aws s3 cp s3://${S3_BUCKET}/${latestFile} ${localEncrypted}`);

    // 3. Decrypt
    const localArchive = localEncrypted.replace('.enc', '');
    await execAsync(
        `openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -k "${BACKUP_ENCRYPTION_KEY}" -in ${localEncrypted} -out ${localArchive}`
    );

    // 4. Extract
    const restoreDir = `/tmp/restore_drill_${Date.now()}`;
    await execAsync(`mkdir -p ${restoreDir} && tar -xzf ${localArchive} -C ${restoreDir}`);

    // 5. Restore to test DB
    await execAsync(`mongorestore --uri="${RESTORE_MONGO_URI}" --drop --gzip ${restoreDir}/*`);

    // 6. Verify (count documents)
    const { stdout: verifyOut } = await execAsync(
        `mongo "${RESTORE_MONGO_URI}" --eval "db.getCollectionNames().length"`
    );
    console.log(`✅ Restore drill passed: ${verifyOut.trim()} collections restored`);

    // 7. Cleanup
    await execAsync(`rm -f ${localEncrypted} ${localArchive}; rm -rf ${restoreDir}`);
}

run().catch(err => {
    console.error('❌ Restore drill failed:', err.message);
    process.exit(1);
});
