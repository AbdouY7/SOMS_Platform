#!/bin/bash
# scripts/backup.sh — SOMS Database Backup Script
# Usage: ./scripts/backup.sh [output_dir]
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/soms_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting SOMS PostgreSQL database backup at $(date)..."

# Detect if running via docker compose or local postgres
if docker compose ps postgres &>/dev/null; then
    docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-soms}" -d "${POSTGRES_DB:-soms}" --clean --if-exists | gzip > "${BACKUP_FILE}"
else
    pg_dump "${DATABASE_URL}" --clean --if-exists | gzip > "${BACKUP_FILE}"
fi

echo "Backup completed successfully: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"

# Retention policy: remove backups older than 30 days
find "${BACKUP_DIR}" -type f -name "soms_backup_*.sql.gz" -mtime +30 -exec rm -f {} \;
echo "Pruned backups older than 30 days."

