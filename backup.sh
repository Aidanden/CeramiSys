#!/bin/bash

# ===============================
# PostgreSQL Backup Script
# ===============================

# Database Config
DB_USER="postgres"
DB_PASSWORD="1Mohmaed120@"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="CeramiSys"

# Backup directory
BACKUP_DIR="/run/media/shark/033e2f56-34e7-4428-b4ef-bf76d5c4b6fb/CODE/CeramiSys"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

# Export password
export PGPASSWORD=$DB_PASSWORD

# Run backup
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f "$BACKUP_DIR/${DB_NAME}_$DATE.backup" $DB_NAME

# Unset password
unset PGPASSWORD

echo "Backup completed: $BACKUP_DIR/${DB_NAME}_$DATE.backup"

