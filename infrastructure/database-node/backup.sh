#!/bin/bash
# ==============================================================================
# SmartMove — Automated PostgreSQL Backup & OCI Cloud Upload
# ==============================================================================

set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/backups"
FILE_NAME="smartmove_prod_${TIMESTAMP}.sql.gz"
FILE_PATH="${BACKUP_DIR}/${FILE_NAME}"

echo "[$(date)] Starting database backup..."

# 1. Dump and compress the database
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h postgres -U $POSTGRES_USER -d $POSTGRES_DB | gzip > $FILE_PATH
echo "[$(date)] Dump complete: ${FILE_NAME}"

# 2. Upload directly to OCI Object Storage
echo "[$(date)] Uploading to Oracle Cloud Object Storage..."
mc alias set ocistore $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY
mc cp $FILE_PATH ocistore/$S3_BUCKET/

# 3. Cleanup local backups older than 3 days to save disk space
echo "[$(date)] Cleaning up old local backups..."
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +3 -exec rm {} \;

echo "[$(date)] Backup process finished successfully."