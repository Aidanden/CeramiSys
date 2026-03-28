# ===============================
# PostgreSQL Backup Script (PowerShell)
# ===============================

# Database Config
$DB_USER = "postgres"
$DB_PASSWORD = "4455"
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "CeramiSys"

# Backup directory
$BACKUP_DIR = "G:\Code\CeramiSys\CeramiSys\backups"
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Create backup directory if not exists
if (-not (Test-Path -Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
    Write-Host "Created backup directory: $BACKUP_DIR"
}

# Set password environment variable
$env:PGPASSWORD = $DB_PASSWORD

# Backup file path
$BACKUP_FILE = "$BACKUP_DIR\${DB_NAME}_$DATE.backup"

Write-Host "Starting backup..."
Write-Host "Database: $DB_NAME"
Write-Host "Backup file: $BACKUP_FILE"

# Run backup
try {
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -F c -b -v -f $BACKUP_FILE $DB_NAME
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup completed successfully!" -ForegroundColor Green
        Write-Host "Backup location: $BACKUP_FILE" -ForegroundColor Cyan
        
        # Get file size
        $fileSize = (Get-Item $BACKUP_FILE).Length / 1MB
        Write-Host "Backup size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Backup failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error during backup: $_" -ForegroundColor Red
} finally {
    # Unset password
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# Optional: Delete old backups (keep last 7 days)
Write-Host "`nCleaning old backups (keeping last 7 days)..."
$oldBackups = Get-ChildItem -Path $BACKUP_DIR -Filter "*.backup" | 
              Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }

if ($oldBackups) {
    $oldBackups | ForEach-Object {
        Write-Host "Deleting old backup: $($_.Name)" -ForegroundColor Yellow
        Remove-Item $_.FullName -Force
    }
} else {
    Write-Host "No old backups to delete."
}

Write-Host "`n✅ Backup process completed!" -ForegroundColor Green
