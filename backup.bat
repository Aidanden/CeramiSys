@echo off
REM ===============================
REM PostgreSQL Backup Script (Batch)
REM ===============================

REM Database Config
set DB_USER=postgres
set DB_PASSWORD=4455
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=CeramiSys

REM Backup directory
set BACKUP_DIR=G:\Code\CeramiSys\CeramiSys\backups

REM Get current date and time
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set DATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

REM Create backup directory if not exists
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup directory: %BACKUP_DIR%
)

REM Set password environment variable
set PGPASSWORD=%DB_PASSWORD%

REM Backup file path
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_%DATE%.backup

echo Starting backup...
echo Database: %DB_NAME%
echo Backup file: %BACKUP_FILE%
echo.

REM Run backup
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -F c -b -v -f "%BACKUP_FILE%" %DB_NAME%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo Backup location: %BACKUP_FILE%
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Backup failed with error code: %ERRORLEVEL%
    echo ========================================
)

REM Unset password
set PGPASSWORD=

REM Optional: Delete old backups (older than 7 days)
echo.
echo Cleaning old backups (older than 7 days)...
forfiles /P "%BACKUP_DIR%" /M *.backup /D -7 /C "cmd /c echo Deleting old backup: @file && del @path" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Old backups deleted.
) else (
    echo No old backups to delete.
)

echo.
echo Backup process completed!
pause
