# ============================================================
# DEPO-PRO PHASE 5 FILE INSTALLER (Steps 4-6)
# ============================================================
# Advanced Calendar Capabilities:
#   - External Calendar Sync (Google/Outlook)
#   - Smart Scheduling Suggestions
#   - UX Hardening & Production Readiness
# 
# Usage:
#   1. Download all Phase 5 files to your work_files directory
#   2. Run this script from the depo-pro project root:
#      .\work_files\install-phase5.ps1
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  DEPO-PRO PHASE 5 INSTALLER (Steps 4-6)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Step 4: External Calendar Sync" -ForegroundColor Gray
Write-Host "  Step 5: Smart Scheduling Suggestions" -ForegroundColor Gray
Write-Host "  Step 6: UX Hardening & Validation" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# VERIFICATION
# ============================================================

if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Run this from the depo-pro project root" -ForegroundColor Red
    Write-Host "Usage: .\work_files\install-phase5.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "work_files")) {
    Write-Host "ERROR: work_files directory not found!" -ForegroundColor Red
    Write-Host "Create work_files/ and add the Phase 5 files first." -ForegroundColor Yellow
    exit 1
}

# ============================================================
# BACKUP
# ============================================================

Write-Host "[1/5] Creating backup..." -ForegroundColor Yellow

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = ".backup-phase5-$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$existingFiles = @(
    "lib\enums.ts",
    "prisma\schema.prisma",
    "components\calendar\depo-calendar.tsx"
)

foreach ($file in $existingFiles) {
    if (Test-Path $file) {
        $backupPath = Join-Path $backupDir $file
        $backupParent = Split-Path $backupPath -Parent
        if (-not (Test-Path $backupParent)) {
            New-Item -ItemType Directory -Force -Path $backupParent | Out-Null
        }
        Copy-Item $file -Destination $backupPath -Force
        Write-Host "  Backed up: $file" -ForegroundColor Gray
    }
}
Write-Host "  Backup saved to: $backupDir" -ForegroundColor Green

# ============================================================
# CREATE DIRECTORIES
# ============================================================

Write-Host ""
Write-Host "[2/5] Creating directories..." -ForegroundColor Yellow

$directories = @(
    # External Calendar
    "lib\external-calendar",
    "app\api\external-calendar",
    "app\api\external-calendar\google\callback",
    "app\api\external-calendar\[connectionId]\sync",
    
    # Scheduling
    "lib\scheduling",
    "app\api\calendar\suggestions",
    "app\api\calendar\events\[id]\validate-move",
    
    # Components
    "components\calendar",
    "hooks"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-Host "  + $dir" -ForegroundColor Green
    }
}

# ============================================================
# INSTALL FILES
# ============================================================

Write-Host ""
Write-Host "[3/5] Installing Phase 5 files..." -ForegroundColor Yellow

# Complete file mapping for Phase 5
$files = @{
    # === STEP 4: External Calendar Sync ===
    "02-enums-phase5-additions.ts" = "lib\enums-phase5.ts"
    "03-lib-external-calendar-types.ts" = "lib\external-calendar\types.ts"
    "04-lib-external-calendar-google-provider.ts" = "lib\external-calendar\google-provider.ts"
    "05-lib-external-calendar-sync-service.ts" = "lib\external-calendar\sync-service.ts"
    "08-api-external-calendar-route.ts" = "app\api\external-calendar\route.ts"
    "09-api-google-callback-route.ts" = "app\api\external-calendar\google\callback\route.ts"
    
    # === STEP 5: Smart Scheduling Suggestions ===
    "06-lib-scheduling-suggestion-engine.ts" = "lib\scheduling\suggestion-engine.ts"
    "10-api-suggestions-route.ts" = "app\api\calendar\suggestions\route.ts"
    "12-component-scheduling-suggestion.tsx" = "components\calendar\scheduling-suggestion.tsx"
    
    # === STEP 6: UX Hardening ===
    "07-lib-scheduling-validation-service.ts" = "lib\scheduling\validation-service.ts"
    "13-component-confirmation-modals.tsx" = "components\calendar\confirmation-modals.tsx"
    "14-api-validate-move-route.ts" = "app\api\calendar\events\[id]\validate-move\route.ts"
    
    # === Components ===
    "11-component-external-event-badge.tsx" = "components\calendar\external-event-badge.tsx"
    
    # === Legacy file mappings (from previous session) ===
    "03-lib-external-calendars-provider.ts" = "lib\external-calendar\provider.ts"
    "04-lib-external-calendars-google-provider.ts" = "lib\external-calendar\google-provider-legacy.ts"
    "05-lib-external-calendars-sync-service.ts" = "lib\external-calendar\sync-service-legacy.ts"
    "06-lib-suggestions-engine.ts" = "lib\scheduling\suggestion-engine-legacy.ts"
    "07-lib-calendar-drag-drop-hardening.ts" = "lib\calendar\drag-drop-hardening.ts"
    "08-api-oauth-google-callback-route.ts" = "app\api\calendar\oauth\google\callback\route.ts"
    "09-api-external-connections-route.ts" = "app\api\calendar\external\connections\route.ts"
    "15-api-sync-route.ts" = "app\api\external-calendar\[connectionId]\sync\route.ts"
    "16-lib-external-calendars-index.ts" = "lib\external-calendar\index.ts"
    "17-lib-suggestions-index.ts" = "lib\scheduling\index.ts"
}

$installed = 0
$notFound = @()

foreach ($src in $files.Keys) {
    $source = "work_files\$src"
    $dest = $files[$src]
    
    if (Test-Path $source) {
        # Ensure parent directory exists
        $parentDir = Split-Path $dest -Parent
        if ($parentDir -and -not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
        }
        
        Copy-Item $source -Destination $dest -Force
        Write-Host "  OK: $dest" -ForegroundColor Green
        $installed++
    } else {
        $notFound += $src
    }
}

# ============================================================
# COPY DOCUMENTATION
# ============================================================

Write-Host ""
Write-Host "[4/5] Copying documentation..." -ForegroundColor Yellow

$docs = @(
    "01-schema-phase5-external-calendar.prisma",
    "01-schema-additions.prisma",
    "PHASE5_CURSOR_MEGA_PROMPT.md",
    "PHASE5_README.md"
)

foreach ($doc in $docs) {
    $source = "work_files\$doc"
    if (Test-Path $source) {
        Copy-Item $source -Destination ".\$doc" -Force
        Write-Host "  OK: $doc" -ForegroundColor Green
    }
}

# ============================================================
# SUMMARY & NEXT STEPS
# ============================================================

Write-Host ""
Write-Host "[5/5] Installation Summary" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Files installed: $installed" -ForegroundColor Green

if ($notFound.Count -gt 0) {
    Write-Host "  Files not found: $($notFound.Count)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Missing files (may be optional):" -ForegroundColor Yellow
    foreach ($f in $notFound) {
        Write-Host "    - $f" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  REQUIRED NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. SCHEMA UPDATE" -ForegroundColor White
Write-Host "   a) Review: 01-schema-phase5-external-calendar.prisma" -ForegroundColor Gray
Write-Host "   b) Add new enums and models to prisma/schema.prisma" -ForegroundColor Gray
Write-Host "   c) Add EXTERNAL_BLOCK to CalendarEventStatus enum" -ForegroundColor Gray
Write-Host "   d) Run:" -ForegroundColor Gray
Write-Host "      npx prisma migrate dev --name phase5_external_calendar" -ForegroundColor Cyan
Write-Host "      npx prisma generate" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. MERGE ENUMS" -ForegroundColor White
Write-Host "   Merge lib/enums-phase5.ts into lib/enums.ts" -ForegroundColor Gray
Write-Host "   Or update imports to reference the new file" -ForegroundColor Gray
Write-Host ""
Write-Host "3. ENVIRONMENT VARIABLES (for Google Calendar)" -ForegroundColor White
Write-Host "   Add to .env:" -ForegroundColor Gray
Write-Host "     GOOGLE_CLIENT_ID=your_client_id" -ForegroundColor Cyan
Write-Host "     GOOGLE_CLIENT_SECRET=your_client_secret" -ForegroundColor Cyan
Write-Host "     GOOGLE_REDIRECT_URI=\${NEXTAUTH_URL}/api/external-calendar/google/callback" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. VERIFICATION" -ForegroundColor White
Write-Host "   npm run typecheck" -ForegroundColor Gray
Write-Host "   npm run lint" -ForegroundColor Gray
Write-Host "   npm run build" -ForegroundColor Gray
Write-Host ""
Write-Host "5. READ DOCUMENTATION" -ForegroundColor White
Write-Host "   - PHASE5_README.md for complete guide" -ForegroundColor Gray
Write-Host "   - PHASE5_CURSOR_MEGA_PROMPT.md for Cursor integration" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  HARD CONSTRAINTS REMINDER" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  - Internal events ALWAYS win conflicts" -ForegroundColor Yellow
Write-Host "  - External events CANNOT be mutated" -ForegroundColor Yellow
Write-Host "  - Suggestions require EXPLICIT user action" -ForegroundColor Yellow
Write-Host "  - ALL operations must be audit logged" -ForegroundColor Yellow
Write-Host "  - Tenant isolation is ENFORCED" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
