#!/bin/bash
# scripts/restore.sh — SOMS Database Restore Script
# Usage: ./scripts/restore.sh <backup_file.sql.gz>
set -euo pipefail

if [ $# -lt 1 ]; then
    echo "Usage: $0 <path_to_backup_file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

echo "WARNING: This will overwrite the current SOMS database with ${BACKUP_FILE}."
read -p "Are you sure you want to proceed? [y/N]: " -r CONFIRM
if [[ ! "$CONFIRM" =~ ^[yY]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Restoring database from ${BACKUP_FILE}..."

if docker compose ps postgres &>/dev/null; then
    gunzip -c "${BACKUP_FILE}" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-soms}" -d "${POSTGRES_DB:-soms}"
else
    gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
fi

echo "Database restore completed successfully."

