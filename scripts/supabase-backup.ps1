# =============================================================================
# Create Supabase database backup (dump) before schema changes
# Requires: .env.local with DIRECT_URL or DATABASE_URL (postgres connection string)
# Optional: pg_dump in PATH (from PostgreSQL client tools)
# =============================================================================

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backupDir = Join-Path $projectRoot "supabase"
$timestamp = Get-Date -Format "yyyyMMdd-HHmm"
$backupFile = Join-Path $backupDir "backup-before-v13-$timestamp.dump"

# Load .env.local
$envFile = Join-Path $projectRoot ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env.local not found at $envFile" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envFile -Raw
$dbUrl = $null
if ($envContent -match 'DIRECT_URL="([^"]+)"') { $dbUrl = $Matches[1] }
elseif ($envContent -match 'DATABASE_URL="([^"]+)"') { $dbUrl = $Matches[1] }

if (-not $dbUrl) {
    Write-Host "ERROR: DIRECT_URL or DATABASE_URL not found in .env.local" -ForegroundColor Red
    Write-Host "Use Supabase Dashboard -> Project Settings -> Database -> Connection string (URI) for backup." -ForegroundColor Yellow
    exit 1
}

# Check for pg_dump
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
    Write-Host "pg_dump not found in PATH. Install PostgreSQL client tools or use Supabase Dashboard backup:" -ForegroundColor Yellow
    Write-Host "  https://supabase.com/dashboard -> your project -> Settings -> Database -> Backups" -ForegroundColor Cyan
    exit 1
}

if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }

Write-Host "Creating backup: $backupFile" -ForegroundColor Cyan
try {
    $env:PGPASSWORD = ($dbUrl -replace '^.*:([^@]+)@.*', '$1')
    & pg_dump $dbUrl -F c -f $backupFile
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed" }
    Write-Host "Backup saved: $backupFile" -ForegroundColor Green
} catch {
    Write-Host "Backup failed: $_" -ForegroundColor Red
    exit 1
}
