# ============================================================
# SYNC DOWNLOADS TO WORK_FILES
# ============================================================
# Run this from your depo-pro project root:
#   .\sync-downloads-to-work_files.ps1
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SYNC DOWNLOADS TO WORK_FILES" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# CONFIGURATION
# ============================================================

$downloadsPath = "$env:USERPROFILE\Downloads"
$workFilesPath = ".\work_files"

# Verify paths
if (-not (Test-Path $workFilesPath)) {
    Write-Host "Creating work_files directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $workFilesPath | Out-Null
}

Write-Host "Downloads folder: $downloadsPath" -ForegroundColor Gray
Write-Host "Work files folder: $workFilesPath" -ForegroundColor Gray
Write-Host ""

# ============================================================
# FILES TO COPY FROM DOWNLOADS
# ============================================================

# All the files that should be in work_files for Phase 3, 4, 5 and Stabilization
$filesToCopy = @(
    # === PHASE 5: Steps 4-6 (External Calendar, Suggestions, UX Hardening) ===
    "01-schema-phase5-external-calendar.prisma",
    "02-enums-phase5-additions.ts",
    "03-lib-external-calendar-types.ts",
    "04-lib-external-calendar-google-provider.ts",
    "05-lib-external-calendar-sync-service.ts",
    "06-lib-scheduling-suggestion-engine.ts",
    "07-lib-scheduling-validation-service.ts",
    "08-api-external-calendar-route.ts",
    "09-api-google-callback-route.ts",
    "10-api-suggestions-route.ts",
    "11-component-external-event-badge.tsx",
    "12-component-scheduling-suggestion.tsx",
    "13-component-confirmation-modals.tsx",
    "14-api-validate-move-route.ts",
    "install-phase5-updated.ps1",
    "PHASE5_CURSOR_MEGA_PROMPT.md",
    "PHASE5_README.md",
    
    # === PHASE 4: Drag-Drop & Rescheduling ===
    "03-lib-conflict-detection.ts",
    "04-lib-scheduling-service.ts",
    "05-api-reschedule-route.ts",
    "06-api-undo-reschedule-route.ts",
    "07-api-check-conflicts-route.ts",
    "08-api-resize-route.ts",
    "09-component-conflict-dialog.tsx",
    "10-hook-use-undo-toast.ts",
    "11-component-drag-preview.tsx",
    "12-component-depo-calendar-enhanced.tsx",
    "13-lib-scheduling-index.ts",
    "PHASE4_CURSOR_MEGA_PROMPT.md",
    "PHASE4_CHECKLIST.md",
    
    # === PHASE 3: RBAC & Convert-to-Job ===
    "03-lib-rbac.ts",
    "04-lib-rbac-client.ts",
    "05-api-convert-to-job-route.ts",
    "06-api-assign-reporter-route.ts",
    "07-api-reporters-route.ts",
    "08-component-convert-to-job-button.tsx",
    "09-component-assign-reporter-dropdown.tsx",
    "10-component-event-status-badge.tsx",
    "11-component-calendar-event-detail-updated.tsx",
    "12-component-calendar-index.ts",
    "depo-pro-phase3-checklist.md",
    
    # === STABILIZATION: Items 1-3 ===
    "eslint.config.mjs",
    "lib-calendar-calendar-types.ts",
    "api-calendar-events-id-route.ts",
    "api-jobs-id-assign-route.ts",
    "STABILIZATION_CURSOR_PROMPT.md",
    
    # === GENERAL ===
    "install-files.ps1",
    "CURSOR_INSTALL_PROMPT.md",
    
    # === FINAL CALENDAR ROUTES (from earlier work) ===
    "FINAL_calendar_route.ts",
    "FINAL_calendar_id_route.ts"
)

# ============================================================
# COPY FILES
# ============================================================

Write-Host "[1/3] Copying files from Downloads to work_files..." -ForegroundColor Yellow
Write-Host ""

$copied = 0
$alreadyExists = 0
$notFound = @()

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path $downloadsPath $file
    $destPath = Join-Path $workFilesPath $file
    
    # Check for file with (1) suffix (duplicate download)
    $sourcePathAlt = Join-Path $downloadsPath ($file -replace '\.([^.]+)$', ' (1).$1')
    
    if (Test-Path $sourcePath) {
        if (Test-Path $destPath) {
            Write-Host "  EXISTS: $file" -ForegroundColor Gray
            $alreadyExists++
        } else {
            Copy-Item $sourcePath -Destination $destPath -Force
            Write-Host "  COPIED: $file" -ForegroundColor Green
            $copied++
        }
    } elseif (Test-Path $sourcePathAlt) {
        # Found the (1) version
        $destPathClean = Join-Path $workFilesPath $file
        Copy-Item $sourcePathAlt -Destination $destPathClean -Force
        Write-Host "  COPIED: $file (from duplicate)" -ForegroundColor Green
        $copied++
    } else {
        $notFound += $file
    }
}

# ============================================================
# CHECK FOR ADDITIONAL FILES IN DOWNLOADS
# ============================================================

Write-Host ""
Write-Host "[2/3] Checking for other relevant files in Downloads..." -ForegroundColor Yellow
Write-Host ""

$relevantPatterns = @(
    "*phase*.md",
    "*phase*.ts",
    "*phase*.tsx",
    "*phase*.prisma",
    "*stabilization*.md",
    "*cursor*.md",
    "*lib-*.ts",
    "*api-*.ts",
    "*component-*.tsx",
    "*hook-*.ts",
    "*calendar*.ts",
    "*scheduling*.ts",
    "eslint*.mjs"
)

$additionalFiles = @()
foreach ($pattern in $relevantPatterns) {
    $found = Get-ChildItem -Path $downloadsPath -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($f in $found) {
        if ($f.Name -notin $filesToCopy -and $f.Name -notmatch '\(\d+\)') {
            $additionalFiles += $f.Name
        }
    }
}

$additionalFiles = $additionalFiles | Select-Object -Unique

if ($additionalFiles.Count -gt 0) {
    Write-Host "  Found additional relevant files in Downloads:" -ForegroundColor Cyan
    foreach ($f in $additionalFiles) {
        Write-Host "    - $f" -ForegroundColor Gray
        # Copy these too
        $src = Join-Path $downloadsPath $f
        $dst = Join-Path $workFilesPath $f
        if (-not (Test-Path $dst)) {
            Copy-Item $src -Destination $dst -Force
            Write-Host "      COPIED" -ForegroundColor Green
            $copied++
        }
    }
}

# ============================================================
# SUMMARY
# ============================================================

Write-Host ""
Write-Host "[3/3] Summary" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Files copied:         $copied" -ForegroundColor Green
Write-Host "  Already in work_files: $alreadyExists" -ForegroundColor Gray
Write-Host "  Not found in Downloads: $($notFound.Count)" -ForegroundColor $(if ($notFound.Count -gt 0) { "Yellow" } else { "Gray" })
Write-Host ""

# ============================================================
# MISSING FILES REPORT
# ============================================================

if ($notFound.Count -gt 0) {
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host "  FILES NOT FOUND IN DOWNLOADS" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "These files need to be downloaded from Claude:" -ForegroundColor White
    Write-Host ""
    
    # Group by phase
    $phase5Missing = $notFound | Where-Object { $_ -match "phase5|external-calendar|suggestion|validation" }
    $phase4Missing = $notFound | Where-Object { $_ -match "phase4|conflict|reschedule|undo|resize|drag" }
    $phase3Missing = $notFound | Where-Object { $_ -match "phase3|rbac|convert-to-job|assign-reporter|reporters" }
    $stabMissing = $notFound | Where-Object { $_ -match "stabilization|eslint|calendar-types" }
    $otherMissing = $notFound | Where-Object { 
        $_ -notin $phase5Missing -and 
        $_ -notin $phase4Missing -and 
        $_ -notin $phase3Missing -and 
        $_ -notin $stabMissing 
    }
    
    if ($phase5Missing.Count -gt 0) {
        Write-Host "  PHASE 5 (External Calendar, Suggestions, UX):" -ForegroundColor Magenta
        foreach ($f in $phase5Missing) {
            Write-Host "    - $f" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($phase4Missing.Count -gt 0) {
        Write-Host "  PHASE 4 (Drag-Drop, Rescheduling):" -ForegroundColor Magenta
        foreach ($f in $phase4Missing) {
            Write-Host "    - $f" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($phase3Missing.Count -gt 0) {
        Write-Host "  PHASE 3 (RBAC, Convert-to-Job):" -ForegroundColor Magenta
        foreach ($f in $phase3Missing) {
            Write-Host "    - $f" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($stabMissing.Count -gt 0) {
        Write-Host "  STABILIZATION:" -ForegroundColor Magenta
        foreach ($f in $stabMissing) {
            Write-Host "    - $f" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    if ($otherMissing.Count -gt 0) {
        Write-Host "  OTHER:" -ForegroundColor Magenta
        foreach ($f in $otherMissing) {
            Write-Host "    - $f" -ForegroundColor Red
        }
        Write-Host ""
    }
}

# ============================================================
# CURRENT WORK_FILES CONTENTS
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CURRENT WORK_FILES CONTENTS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$currentFiles = Get-ChildItem -Path $workFilesPath -File | Sort-Object Name
Write-Host "  Total files: $($currentFiles.Count)" -ForegroundColor Green
Write-Host ""

foreach ($f in $currentFiles) {
    Write-Host "  - $($f.Name)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Download any missing files from Claude" -ForegroundColor White
Write-Host "2. Run the appropriate install script:" -ForegroundColor White
Write-Host "   .\work_files\install-phase5-updated.ps1" -ForegroundColor Cyan
Write-Host ""
