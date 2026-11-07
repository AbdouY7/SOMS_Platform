# scripts/restore.ps1 — SOMS Database Restore Script for Windows PowerShell
param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

$Confirm = Read-Host "WARNING: This will overwrite data in SOMS database with $BackupFile. Continue? (y/N)"
if ($Confirm -ne "y" -and $Confirm -ne "Y") {
    Write-Host "Restore cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "Restoring database from $BackupFile..." -ForegroundColor Cyan

Get-Content $BackupFile | docker compose exec -T postgres psql -U soms -d soms

Write-Host "Database restore completed successfully." -ForegroundColor Green

