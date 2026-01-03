#!/bin/bash
# =============================================================================
# DAILY BACKUP SCRIPT
# scripts/backup/daily-backup.sh
#
# Phase 5A-1: Automated daily database backup
# =============================================================================

set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/backups}"
DB_URL="${DATABASE_URL}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting daily backup..."

# Dump database
echo "[$(date)] Dumping database..."
pg_dump "$DB_URL" > "$BACKUP_DIR/db_$DATE.sql"

# Compress
echo "[$(date)] Compressing backup..."
gzip "$BACKUP_DIR/db_$DATE.sql"

# Verify backup file exists
if [ ! -f "$BACKUP_DIR/db_$DATE.sql.gz" ]; then
  echo "[ERROR] Backup file not created!"
  exit 1
fi

# Calculate checksum
CHECKSUM=$(sha256sum "$BACKUP_DIR/db_$DATE.sql.gz" | cut -d' ' -f1)
echo "$CHECKSUM" > "$BACKUP_DIR/db_$DATE.sql.gz.sha256"

# Upload to cloud storage (if configured)
if [ -n "$BACKUP_S3_BUCKET" ] && [ -n "$AWS_ACCESS_KEY_ID" ]; then
  echo "[$(date)] Uploading to S3..."
  aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz" "s3://$BACKUP_S3_BUCKET/db/db_$DATE.sql.gz"
  aws s3 cp "$BACKUP_DIR/db_$DATE.sql.gz.sha256" "s3://$BACKUP_S3_BUCKET/db/db_$DATE.sql.gz.sha256"
  
  # Verify upload
  if aws s3 ls "s3://$BACKUP_S3_BUCKET/db/db_$DATE.sql.gz" > /dev/null 2>&1; then
    echo "[$(date)] Backup uploaded successfully"
  else
    echo "[ERROR] Backup upload verification failed!"
    exit 1
  fi
fi

# Cleanup local backups (keep 7 days)
echo "[$(date)] Cleaning up old backups..."
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "db_*.sql.gz.sha256" -mtime +7 -delete

# Send notification (if configured)
if [ -n "$SLACK_WEBHOOK" ]; then
  curl -X POST "$SLACK_WEBHOOK" \
    -H 'Content-Type: application/json' \
    -d "{\"text\":\"✅ Daily backup complete: $DATE\"}" \
    > /dev/null 2>&1 || true
fi

echo "[$(date)] Backup complete: db_$DATE.sql.gz"
echo "[$(date)] Checksum: $CHECKSUM"

exit 0
