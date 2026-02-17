#!/bin/bash

export PGPASSWORD='1Mohmaed120@'

DATE=$(date +%Y-%m-%d_%H-%M)

BACKUP_PATH="/run/media/shark/033e2f56-34e7-4428-b4ef-bf76d5c4b6fb/CODE/CeramiSys"

pg_dump -U postgres -h localhost -p 5432 \
-d CeramiSys \
-F c \
-b \
-f $BACKUP_PATH/CeramiSys_$DATE.dump

echo "Backup Completed Successfully at $DATE"

