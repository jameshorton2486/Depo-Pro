# ═══════════════════════════════════════════════════════════════
# DEPO-PRO AUTH FILES INSTALLATION SCRIPT
# ═══════════════════════════════════════════════════════════════
# This script moves files from work_files to their correct locations
# Run from the project root: C:\Users\james\depo-pro
# ═══════════════════════════════════════════════════════════════

param(
    [switch]$DryRun = $false,
    [switch]$KeepWorkFiles = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPO-PRO AUTH FILES INSTALLER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Verify we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found. Run this script from the project root." -ForegroundColor Red
    Write-Host "       Expected: C:\Users\james\depo-pro" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "work_files")) {
    Write-Host "ERROR: work_files directory not found." -ForegroundColor Red
    exit 1
}

if ($DryRun) {
    Write-Host "[DRY RUN MODE - No files will be modified]" -ForegroundColor Yellow
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────
# STEP 1: Create required directories
# ─────────────────────────────────────────────────────────────────
Write-Host "Step 1: Creating directories..." -ForegroundColor Green

$directories = @(
    "lib\supabase",
    "app\auth\callback"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        Write-Host "  Creating: $dir" -ForegroundColor Gray
        if (-not $DryRun) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    } else {
        Write-Host "  Exists:   $dir" -ForegroundColor DarkGray
    }
}

# ─────────────────────────────────────────────────────────────────
# STEP 2: Delete old duplicate files (before copying new ones)
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Step 2: Removing deprecated files..." -ForegroundColor Green

$deprecatedFiles = @(
    "lib\supabase-client.ts",
    "lib\supabase-server.ts",
    "utils\supabase\client.ts",
    "utils\supabase\server.ts",
    "utils\supabase\middleware.ts"
)

foreach ($file in $deprecatedFiles) {
    if (Test-Path $file) {
        Write-Host "  Deleting: $file" -ForegroundColor Yellow
        if (-not $DryRun) {
            Remove-Item -Path $file -Force
        }
    }
}

# Remove empty utils/supabase directory if it exists
if (Test-Path "utils\supabase") {
    $remaining = Get-ChildItem "utils\supabase" -ErrorAction SilentlyContinue
    if ($remaining.Count -eq 0 -or $null -eq $remaining) {
        Write-Host "  Deleting: utils\supabase (empty directory)" -ForegroundColor Yellow
        if (-not $DryRun) {
            Remove-Item -Path "utils\supabase" -Force -Recurse -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────────────────────────────────────────────────────────
# STEP 3: Copy new files from work_files
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Step 3: Installing new auth files..." -ForegroundColor Green

# Define source -> destination mappings
$fileMappings = @(
    # Supabase clients
    @{ Source = "work_files\lib\supabase\browser.ts";     Dest = "lib\supabase\browser.ts" },
    @{ Source = "work_files\lib\supabase\server.ts";      Dest = "lib\supabase\server.ts" },
    @{ Source = "work_files\lib\supabase\admin.ts";       Dest = "lib\supabase\admin.ts" },
    @{ Source = "work_files\lib\supabase\middleware.ts";  Dest = "lib\supabase\middleware.ts" },
    @{ Source = "work_files\lib\supabase\index.ts";       Dest = "lib\supabase\index.ts" },
    
    # Middleware
    @{ Source = "work_files\middleware.ts";               Dest = "middleware.ts" },
    
    # Auth callback route
    @{ Source = "work_files\app\auth\callback\route.ts";  Dest = "app\auth\callback\route.ts" },
    
    # Profile API (security fix)
    @{ Source = "work_files\app\api\profile\route.ts";    Dest = "app\api\profile\route.ts" },
    
    # Auth pages (updated imports)
    @{ Source = "work_files\app\(auth)\login\page.tsx";           Dest = "app\(auth)\login\page.tsx" },
    @{ Source = "work_files\app\(auth)\register\page.tsx";        Dest = "app\(auth)\register\page.tsx" },
    @{ Source = "work_files\app\(auth)\forgot-password\page.tsx"; Dest = "app\(auth)\forgot-password\page.tsx" },
    @{ Source = "work_files\app\(auth)\reset-password\page.tsx";  Dest = "app\(auth)\reset-password\page.tsx" },
    
    # Auth utilities
    @{ Source = "work_files\lib\auth\get-user-with-profile.ts";   Dest = "lib\auth\get-user-with-profile.ts" },
    
    # Route permissions (added public routes)
    @{ Source = "work_files\lib\permissions\route-access.ts";     Dest = "lib\permissions\route-access.ts" },
    
    # Documentation
    @{ Source = "work_files\CURSOR_AUTH_FIX_MEGAPROMPT.md";       Dest = "docs\CURSOR_AUTH_FIX_MEGAPROMPT.md" }
)

$copiedCount = 0
$skippedCount = 0

foreach ($mapping in $fileMappings) {
    $source = $mapping.Source
    $dest = $mapping.Dest
    
    if (Test-Path $source) {
        # Ensure destination directory exists
        $destDir = Split-Path -Parent $dest
        if ($destDir -and -not (Test-Path $destDir)) {
            if (-not $DryRun) {
                New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            }
        }
        
        Write-Host "  Copying: $dest" -ForegroundColor Gray
        if (-not $DryRun) {
            Copy-Item -Path $source -Destination $dest -Force
        }
        $copiedCount++
    } else {
        Write-Host "  Skipped: $source (not found)" -ForegroundColor DarkYellow
        $skippedCount++
    }
}

# ─────────────────────────────────────────────────────────────────
# STEP 4: Install @supabase/ssr if not already installed
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Step 4: Checking dependencies..." -ForegroundColor Green

$packageJson = Get-Content "package.json" -Raw
if ($packageJson -notmatch "@supabase/ssr") {
    Write-Host "  Installing @supabase/ssr..." -ForegroundColor Yellow
    if (-not $DryRun) {
        npm install @supabase/ssr
    }
} else {
    Write-Host "  @supabase/ssr already installed" -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────────────────────────
# STEP 5: Cleanup work_files (optional)
# ─────────────────────────────────────────────────────────────────
if (-not $KeepWorkFiles) {
    Write-Host ""
    Write-Host "Step 5: Cleaning up work_files..." -ForegroundColor Green
    
    if (-not $DryRun) {
        Remove-Item -Path "work_files" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Removed: work_files directory" -ForegroundColor Gray
    } else {
        Write-Host "  Would remove: work_files directory" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "Step 5: Keeping work_files (as requested)" -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Files copied:  $copiedCount" -ForegroundColor White
Write-Host "  Files skipped: $skippedCount" -ForegroundColor $(if ($skippedCount -gt 0) { "Yellow" } else { "White" })
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] No changes were made. Run without -DryRun to apply." -ForegroundColor Yellow
    Write-Host ""
}

# ─────────────────────────────────────────────────────────────────
# NEXT STEPS
# ─────────────────────────────────────────────────────────────────
Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1. Run: npm run typecheck" -ForegroundColor White
Write-Host "  2. Run: npm run dev" -ForegroundColor White
Write-Host "  3. Test login/logout flow" -ForegroundColor White
Write-Host "  4. Test password reset flow" -ForegroundColor White
Write-Host ""
