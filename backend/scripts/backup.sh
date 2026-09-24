#!/bin/bash
# Qline Automated Backup Script
# Backs up MongoDB and uploads encrypted archive to S3
# Run via cron: 0 2 * * * /bin/bash /app/scripts/backup.sh >> /var/log/qline-backup.log 2>&1

set -euo pipefail

# Config from environment
MONGO_URI="${MONGO_URI:?MONGO_URI not set}"
S3_BUCKET="${S3_BACKUP_BUCKET:?S3_BACKUP_BUCKET not set}"
BACKUP_ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY not set}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/tmp/qline_backup_${TIMESTAMP}"
ARCHIVE_FILE="/tmp/qline_backup_${TIMESTAMP}.tar.gz"
ENCRYPTED_FILE="${ARCHIVE_FILE}.enc"

echo "=== Qline Backup Started: ${TIMESTAMP} ==="

# 1. Dump MongoDB
echo "📦 Dumping MongoDB..."
mongodump \
    --uri="${MONGO_URI}" \
    --out="${BACKUP_DIR}" \
    --gzip

# 2. Check dump succeeded
if [ ! -d "${BACKUP_DIR}" ]; then
    echo "❌ MongoDB dump failed" >&2
    exit 1
fi

# 3. Create archive
echo "🗜️  Creating archive..."
tar -czf "${ARCHIVE_FILE}" -C "$(dirname ${BACKUP_DIR})" "$(basename ${BACKUP_DIR})"

# 4. Encrypt with AES-256-CBC
echo "🔐 Encrypting..."
openssl enc -aes-256-cbc \
    -salt \
    -pbkdf2 \
    -iter 100000 \
    -k "${BACKUP_ENCRYPTION_KEY}" \
    -in "${ARCHIVE_FILE}" \
    -out "${ENCRYPTED_FILE}"

# 5. Upload to S3
echo "☁️  Uploading to S3..."
aws s3 cp "${ENCRYPTED_FILE}" \
    "s3://${S3_BUCKET}/backups/mongodb/qline_${TIMESTAMP}.tar.gz.enc" \
    --storage-class STANDARD_IA

# 6. Clean up local files
echo "🧹 Cleaning up..."
rm -rf "${BACKUP_DIR}" "${ARCHIVE_FILE}" "${ENCRYPTED_FILE}"

# 7. Remove old backups from S3
echo "🗑️  Pruning backups older than ${BACKUP_RETENTION_DAYS} days..."
CUTOFF_DATE=$(date -d "-${BACKUP_RETENTION_DAYS} days" +"%Y-%m-%d")
aws s3 ls "s3://${S3_BUCKET}/backups/mongodb/" | while read -r line; do
    BACKUP_DATE=$(echo "$line" | awk '{print $1}')
    BACKUP_FILE=$(echo "$line" | awk '{print $4}')
    if [[ "$BACKUP_DATE" < "$CUTOFF_DATE" ]]; then
        echo "  Deleting old backup: ${BACKUP_FILE}"
        aws s3 rm "s3://${S3_BUCKET}/backups/mongodb/${BACKUP_FILE}"
    fi
done

echo "✅ Backup completed successfully: qline_${TIMESTAMP}.tar.gz.enc"
echo "=== Qline Backup Finished: $(date) ==="
