#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

docker compose exec -T postgres pg_dump -U postgres couple_memory \
  | gzip > "${BACKUP_DIR}/couple_memory_${DATE}.sql.gz"

# 保留最近 30 天
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: couple_memory_${DATE}.sql.gz"
