# scripts/backup.ps1 — SOMS Database Backup Script for Windows PowerShell
param (
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "soms_backup_$Timestamp.sql"

Write-Host "Starting SOMS PostgreSQL database backup..." -ForegroundColor Cyan

docker compose exec -T postgres pg_dump -U soms -d soms --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8

Write-Host "Backup completed successfully: $BackupFile" -ForegroundColor Green

