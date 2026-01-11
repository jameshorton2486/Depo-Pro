# =============================================================================
# Depo-Pro Repository Cleanup Script (PowerShell)
# =============================================================================
# Run this script to perform critical cleanup actions
# Review each section before running - comment out items you want to skip
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host "🔍 Depo-Pro Repository Cleanup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$removedCount = 0
$skippedCount = 0

# =============================================================================
# PHASE 1: CRITICAL - Sensitive File Removal
# =============================================================================
Write-Host "🔴 PHASE 1: Removing sensitive files..." -ForegroundColor Red
Write-Host ""

# Remove work files with actual legal documents
if (Test-Path "work_files_depo") {
    Write-Host "  Removing work_files_depo/..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "work_files_depo"
    $removedCount++
    Write-Host "    ✅ Removed work_files_depo/" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  work_files_depo/ not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Remove patch file
if (Test-Path "patchfile.diff") {
    Write-Host "  Removing patchfile.diff..." -ForegroundColor Yellow
    Remove-Item -Force "patchfile.diff"
    $removedCount++
    Write-Host "    ✅ Removed patchfile.diff" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  patchfile.diff not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Remove db verification
if (Test-Path "db-verification.json") {
    Write-Host "  Removing db-verification.json..." -ForegroundColor Yellow
    Remove-Item -Force "db-verification.json"
    $removedCount++
    Write-Host "    ✅ Removed db-verification.json" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  db-verification.json not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Remove SQLite database from archive
$archiveDbPath = "archive/.backup-deepgram-integration-20251113-235553/prisma/dev.db"
if (Test-Path $archiveDbPath) {
    Write-Host "  Removing archive SQLite database..." -ForegroundColor Yellow
    Remove-Item -Force $archiveDbPath
    $removedCount++
    Write-Host "    ✅ Removed archive SQLite database" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Archive SQLite database not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

Write-Host "✅ Phase 1 complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# PHASE 2: Backup and Empty File Removal
# =============================================================================
Write-Host "🟠 PHASE 2: Removing backup and empty files..." -ForegroundColor Yellow
Write-Host ""

# Remove backup files
$backupFiles = Get-ChildItem -Recurse -File -Filter "*.bak*" -ErrorAction SilentlyContinue
if ($backupFiles) {
    foreach ($file in $backupFiles) {
        Write-Host "  Removing $($file.FullName)..." -ForegroundColor Yellow
        Remove-Item -Force $file.FullName
        $removedCount++
    }
    Write-Host "    ✅ Removed $($backupFiles.Count) backup file(s)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No backup files found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

$disabledFiles = Get-ChildItem -Recurse -File -Filter "*.disabled" -ErrorAction SilentlyContinue
if ($disabledFiles) {
    foreach ($file in $disabledFiles) {
        Write-Host "  Removing $($file.FullName)..." -ForegroundColor Yellow
        Remove-Item -Force $file.FullName
        $removedCount++
    }
    Write-Host "    ✅ Removed $($disabledFiles.Count) disabled file(s)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No disabled files found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Remove empty files
if (Test-Path "INTEGRATION_GUIDE.md") {
    $file = Get-Item "INTEGRATION_GUIDE.md"
    if ($file.Length -eq 0) {
        Write-Host "  Removing empty INTEGRATION_GUIDE.md..." -ForegroundColor Yellow
        Remove-Item -Force "INTEGRATION_GUIDE.md"
        $removedCount++
        Write-Host "    ✅ Removed empty INTEGRATION_GUIDE.md" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  INTEGRATION_GUIDE.md is not empty (skipping)" -ForegroundColor Gray
        $skippedCount++
    }
} else {
    Write-Host "  ⚠️  INTEGRATION_GUIDE.md not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

if (Test-Path "components/attorney/transcript-viewer-enhanced.tsx") {
    $file = Get-Item "components/attorney/transcript-viewer-enhanced.tsx"
    if ($file.Length -eq 0) {
        Write-Host "  Removing empty transcript-viewer-enhanced.tsx..." -ForegroundColor Yellow
        Remove-Item -Force "components/attorney/transcript-viewer-enhanced.tsx"
        $removedCount++
        Write-Host "    ✅ Removed empty transcript-viewer-enhanced.tsx" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  transcript-viewer-enhanced.tsx is not empty (skipping)" -ForegroundColor Gray
        $skippedCount++
    }
} else {
    Write-Host "  ⚠️  transcript-viewer-enhanced.tsx not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Remove empty asset images
if (Test-Path "assets") {
    $emptyImages = Get-ChildItem -Path "assets" -Recurse -File -Filter "*.png" -ErrorAction SilentlyContinue | Where-Object { $_.Length -eq 0 }
    if ($emptyImages) {
        foreach ($file in $emptyImages) {
            Write-Host "  Removing empty image: $($file.Name)..." -ForegroundColor Yellow
            Remove-Item -Force $file.FullName
            $removedCount++
        }
        Write-Host "    ✅ Removed $($emptyImages.Count) empty image(s)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  No empty images found (skipping)" -ForegroundColor Gray
        $skippedCount++
    }
} else {
    Write-Host "  ⚠️  assets/ directory not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

Write-Host "✅ Phase 2 complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# PHASE 3: Python Cache Removal
# =============================================================================
Write-Host "🟡 PHASE 3: Removing Python cache files..." -ForegroundColor Yellow
Write-Host ""

$pycacheDirs = Get-ChildItem -Recurse -Directory -Filter "__pycache__" -ErrorAction SilentlyContinue
if ($pycacheDirs) {
    foreach ($dir in $pycacheDirs) {
        Write-Host "  Removing $($dir.FullName)..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $dir.FullName
        $removedCount++
    }
    Write-Host "    ✅ Removed $($pycacheDirs.Count) __pycache__ directory/ies" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No __pycache__ directories found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

$pycFiles = Get-ChildItem -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue
if ($pycFiles) {
    foreach ($file in $pycFiles) {
        Write-Host "  Removing $($file.FullName)..." -ForegroundColor Yellow
        Remove-Item -Force $file.FullName
        $removedCount++
    }
    Write-Host "    ✅ Removed $($pycFiles.Count) .pyc file(s)" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  No .pyc files found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

Write-Host "✅ Phase 3 complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# PHASE 4: Miscellaneous Cleanup
# =============================================================================
Write-Host "🟢 PHASE 4: Miscellaneous cleanup..." -ForegroundColor Green
Write-Host ""

# Remove miscellaneous files
if (Test-Path "json.txt") {
    Write-Host "  Removing json.txt..." -ForegroundColor Yellow
    Remove-Item -Force "json.txt"
    $removedCount++
    Write-Host "    ✅ Removed json.txt" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  json.txt not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

# Archive folder cleanup
if (Test-Path "archive/schema.prisma") {
    Write-Host "  Removing archive/schema.prisma..." -ForegroundColor Yellow
    Remove-Item -Force "archive/schema.prisma"
    $removedCount++
    Write-Host "    ✅ Removed archive/schema.prisma" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  archive/schema.prisma not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

if (Test-Path "archive/seed.ts") {
    Write-Host "  Removing archive/seed.ts..." -ForegroundColor Yellow
    Remove-Item -Force "archive/seed.ts"
    $removedCount++
    Write-Host "    ✅ Removed archive/seed.ts" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  archive/seed.ts not found (skipping)" -ForegroundColor Gray
    $skippedCount++
}

Write-Host "✅ Phase 4 complete" -ForegroundColor Green
Write-Host ""

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host '======================================' -ForegroundColor Cyan
Write-Host '🎉 Cleanup Complete!' -ForegroundColor Green
Write-Host '======================================' -ForegroundColor Cyan
Write-Host ''
Write-Host '📊 Summary:' -ForegroundColor Cyan
Write-Host "   Files/Directories removed: $removedCount" -ForegroundColor Green
Write-Host "   Items skipped (not found): $skippedCount" -ForegroundColor Gray
Write-Host ''
Write-Host 'Next steps:' -ForegroundColor Yellow
Write-Host '1. Review changes with: git status' -ForegroundColor White
Write-Host '2. Run build to verify: npm run build' -ForegroundColor White
Write-Host '3. Run lint to verify: npm run lint' -ForegroundColor White
Write-Host '4. Commit changes: git add -A; git commit -m chore: repository cleanup' -ForegroundColor White
Write-Host ''
Write-Host '⚠️  Manual steps still required:' -ForegroundColor Yellow
Write-Host '   - Consolidate documentation files' -ForegroundColor White
Write-Host '   - Merge enum definitions' -ForegroundColor White
Write-Host '   - Audit calendar components for duplicates' -ForegroundColor White
Write-Host '   - Replace console.log with logger' -ForegroundColor White
Write-Host ''
