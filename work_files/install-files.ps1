# ============================================================
# DEPO-PRO FILE INSTALLER
# ============================================================
# Place this script in your depo-pro root directory, then run:
#   .\install-files.ps1
# ============================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPO-PRO FILE INSTALLER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Run this from the depo-pro root directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "work_files")) {
    Write-Host "ERROR: work_files directory not found!" -ForegroundColor Red
    Write-Host "Create it and add the downloaded files first." -ForegroundColor Yellow
    exit 1
}

# Create backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".backup-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host "Backup directory: $backupDir" -ForegroundColor Gray

# Create required directories
$dirs = @(
    "lib\calendar",
    "lib\scheduling",
    "app\api\calendar\events\[id]\reschedule",
    "app\api\calendar\events\[id]\undo-reschedule", 
    "app\api\calendar\events\[id]\resize",
    "app\api\calendar\events\[id]\convert-to-job",
    "app\api\calendar\events\check-conflicts",
    "app\api\jobs\[id]\assign-reporter",
    "app\api\reporters",
    "hooks"
)

Write-Host ""
Write-Host "Creating directories..." -ForegroundColor Yellow
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "  + $dir" -ForegroundColor Green
    }
}

# File mapping: source -> destination
$files = @{
    # === STABILIZATION ===
    "eslint.config.mjs" = "eslint.config.mjs"
    "lib-calendar-calendar-types.ts" = "lib\calendar\calendar-types.ts"
    "api-calendar-events-id-route.ts" = "app\api\calendar\events\[id]\route.ts"
    "api-jobs-id-assign-route.ts" = "app\api\jobs\[id]\assign\route.ts"
    
    # === PHASE 3 ===
    "03-lib-rbac.ts" = "lib\rbac.ts"
    "04-lib-rbac-client.ts" = "lib\rbac-client.ts"
    "05-api-convert-to-job-route.ts" = "app\api\calendar\events\[id]\convert-to-job\route.ts"
    "06-api-assign-reporter-route.ts" = "app\api\jobs\[id]\assign-reporter\route.ts"
    "07-api-reporters-route.ts" = "app\api\reporters\route.ts"
    "08-component-convert-to-job-button.tsx" = "components\calendar\convert-to-job-button.tsx"
    "09-component-assign-reporter-dropdown.tsx" = "components\jobs\assign-reporter-dropdown.tsx"
    "10-component-event-status-badge.tsx" = "components\calendar\event-status-badge.tsx"
    "11-component-calendar-event-detail-updated.tsx" = "components\calendar\calendar-event-detail.tsx"
    "12-component-calendar-index.ts" = "components\calendar\index.ts"
    
    # === PHASE 4 ===
    "02-enums-additions.ts" = "lib\enums-phase4.ts"
    "03-lib-conflict-detection.ts" = "lib\scheduling\conflict-detection.ts"
    "04-lib-scheduling-service.ts" = "lib\scheduling\scheduling-service.ts"
    "05-api-reschedule-route.ts" = "app\api\calendar\events\[id]\reschedule\route.ts"
    "06-api-undo-reschedule-route.ts" = "app\api\calendar\events\[id]\undo-reschedule\route.ts"
    "07-api-check-conflicts-route.ts" = "app\api\calendar\events\check-conflicts\route.ts"
    "08-api-resize-route.ts" = "app\api\calendar\events\[id]\resize\route.ts"
    "09-component-conflict-dialog.tsx" = "components\calendar\conflict-dialog.tsx"
    "10-hook-use-undo-toast.ts" = "hooks\use-undo-toast.ts"
    "11-component-drag-preview.tsx" = "components\calendar\drag-preview.tsx"
    "12-component-depo-calendar-enhanced.tsx" = "components\calendar\depo-calendar.tsx"
    "13-lib-scheduling-index.ts" = "lib\scheduling\index.ts"
}

Write-Host ""
Write-Host "Installing files..." -ForegroundColor Yellow

$installed = 0
$notFound = @()

foreach ($src in $files.Keys) {
    $source = "work_files\$src"
    $dest = $files[$src]
    
    if (Test-Path $source) {
        # Backup existing file
        if (Test-Path $dest) {
            $backupPath = Join-Path $backupDir $dest
            $backupParent = Split-Path $backupPath -Parent
            if (-not (Test-Path $backupParent)) {
                New-Item -ItemType Directory -Force -Path $backupParent | Out-Null
            }
            Copy-Item $dest -Destination $backupPath -Force
        }
        
        # Install new file
        Copy-Item $source -Destination $dest -Force
        Write-Host "  OK: $dest" -ForegroundColor Green
        $installed++
    } else {
        $notFound += $src
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installed: $installed files" -ForegroundColor Green

if ($notFound.Count -gt 0) {
    Write-Host "  Not found: $($notFound.Count) files" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Missing files:" -ForegroundColor Yellow
    foreach ($f in $notFound) {
        Write-Host "  - $f" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host "  1. npm run typecheck" -ForegroundColor White
Write-Host "  2. npm run lint" -ForegroundColor White
Write-Host "  3. npm run build" -ForegroundColor White
Write-Host ""
Write-Host "If you see unused variable errors, prefix with underscore (_)" -ForegroundColor Yellow
Write-Host ""
