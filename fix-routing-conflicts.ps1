# =============================================================================
# DEPO-PRO ROUTING CONFLICT FIX
# fix-routing-conflicts.ps1
#
# This script removes duplicate routes that conflict with route groups
# =============================================================================

$projectPath = "C:\Users\james\depo-pro"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEPO-PRO ROUTING CONFLICT FIX" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
Set-Location $projectPath

# =============================================================================
# STEP 1: Backup before making changes
# =============================================================================
Write-Host "[1/4] Creating backup..." -ForegroundColor Yellow

$backupDir = "app_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item -Path "app" -Destination $backupDir -Recurse
Write-Host "  ✓ Backup created: $backupDir" -ForegroundColor Green

# =============================================================================
# STEP 2: Define conflicts to resolve
# =============================================================================
Write-Host ""
Write-Host "[2/4] Identifying conflicts..." -ForegroundColor Yellow

# These folders are DUPLICATES of route groups and should be removed
# The route groups (auth), (dashboard), (attorney) will handle these routes
$foldersToRemove = @(
    # Auth duplicates - (auth) handles /login, /register, etc.
    "app\login",
    "app\register",
    
    # Dashboard duplicates - (dashboard) handles these
    # BUT we need to check if (dashboard)/dashboard exists or just use app/dashboard
    
    # Attorney dashboard duplicate
    "app\attorney-dashboard"
)

# These need special handling - they exist in BOTH route groups AND regular folders
$conflictsToReview = @(
    @{
        RouteGroup = "app\(auth)\login"
        Regular = "app\auth\login"
        URL = "/login vs /auth/login"
        Keep = "app\(auth)\login"  # Keep route group, remove or redirect regular
    },
    @{
        RouteGroup = "app\(auth)\register"
        Regular = "app\auth\register"
        URL = "/register vs /auth/register"
        Keep = "app\(auth)\register"
    },
    @{
        RouteGroup = "app\(auth)\forgot-password"
        Regular = "app\auth\forgot-password"
        URL = "/forgot-password vs /auth/forgot-password"
        Keep = "app\(auth)\forgot-password"
    },
    @{
        RouteGroup = "app\(auth)\reset-password"
        Regular = "app\auth\reset-password"
        URL = "/reset-password vs /auth/reset-password"
        Keep = "app\(auth)\reset-password"
    }
)

Write-Host "  Found conflicts to resolve:" -ForegroundColor White
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Write-Host "    - $folder (will remove)" -ForegroundColor Red
    }
}

# =============================================================================
# STEP 3: Remove simple duplicates
# =============================================================================
Write-Host ""
Write-Host "[3/4] Removing duplicate folders..." -ForegroundColor Yellow

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force
        Write-Host "  ✓ Removed: $folder" -ForegroundColor Green
    } else {
        Write-Host "  - Skipped (not found): $folder" -ForegroundColor Gray
    }
}

# =============================================================================
# STEP 4: Convert /auth/* pages to redirects
# =============================================================================
Write-Host ""
Write-Host "[4/4] Converting auth/* to redirects..." -ForegroundColor Yellow

# The /auth/login, /auth/register etc. should redirect to /login, /register
# This maintains backward compatibility

$redirectTemplate = "import { redirect } from 'next/navigation';`n`nexport default function Page() {`n  redirect('TARGET_URL');`n}"

$authRedirects = @(
    @{ Path = "app\auth\login\page.tsx"; Target = "/login" },
    @{ Path = "app\auth\register\page.tsx"; Target = "/register" },
    @{ Path = "app\auth\forgot-password\page.tsx"; Target = "/forgot-password" },
    @{ Path = "app\auth\reset-password\page.tsx"; Target = "/reset-password" }
)

foreach ($redir in $authRedirects) {
    if (Test-Path $redir.Path) {
        $content = $redirectTemplate -replace 'TARGET_URL', $redir.Target
        Set-Content -Path $redir.Path -Value $content -Encoding UTF8
        Write-Host "  ✓ Converted to redirect: $($redir.Path) -> $($redir.Target)" -ForegroundColor Green
    }
}

# =============================================================================
# SUMMARY
# =============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FIX COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What was done:" -ForegroundColor White
Write-Host "  1. Backup created: $backupDir" -ForegroundColor Gray
Write-Host "  2. Removed duplicate /login and /register folders" -ForegroundColor Gray
Write-Host "  3. Converted /auth/* pages to redirects" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run: npm run build" -ForegroundColor White
Write-Host "  2. If errors, check the detailed conflict list below" -ForegroundColor White
Write-Host ""

# =============================================================================
# REMAINING CONFLICTS TO REVIEW MANUALLY
# =============================================================================
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "REMAINING CONFLICTS (Review Manually)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "These routes may still conflict:" -ForegroundColor White
Write-Host ""

# Check for remaining issues
$remainingConflicts = @(
    @{ 
        Issue = "Dashboard routing"
        Paths = @("app\(dashboard)\dashboard\page.tsx", "app\dashboard\page.tsx")
        Resolution = "Keep ONE - recommend keeping app\dashboard\page.tsx as main router"
    },
    @{
        Issue = "Calendar routing"
        Paths = @("app\(dashboard)\calendar\page.tsx", "app\calendar\page.tsx")
        Resolution = "If both exist, one must redirect or be removed"
    },
    @{
        Issue = "Billing routing"
        Paths = @("app\(dashboard)\billing\page.tsx", "app\billing\page.tsx")
        Resolution = "If both exist, one must redirect or be removed"
    },
    @{
        Issue = "Transcripts routing"
        Paths = @("app\(attorney)\transcripts\page.tsx", "app\transcripts\page.tsx")
        Resolution = "Different roles may need different pages - verify intent"
    },
    @{
        Issue = "Exhibits routing"
        Paths = @("app\(attorney)\exhibits\page.tsx", "app\exhibits\page.tsx")
        Resolution = "If both exist, one must redirect or be removed"
    },
    @{
        Issue = "Issues routing"
        Paths = @("app\(attorney)\issues\page.tsx", "app\issues\page.tsx")
        Resolution = "If both exist, one must redirect or be removed"
    },
    @{
        Issue = "Reports routing"
        Paths = @("app\(attorney)\reports\page.tsx", "app\reports\page.tsx")
        Resolution = "If both exist, one must redirect or be removed"
    }
)

foreach ($conflict in $remainingConflicts) {
    $exists = @()
    foreach ($path in $conflict.Paths) {
        if (Test-Path $path) {
            $exists += $path
        }
    }
    
    if ($exists.Count -gt 1) {
        Write-Host "⚠️  $($conflict.Issue)" -ForegroundColor Yellow
        foreach ($p in $exists) {
            Write-Host "    - $p" -ForegroundColor Red
        }
        Write-Host "    Resolution: $($conflict.Resolution)" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host ""
Write-Host "Run npm run build to verify fixes" -ForegroundColor Cyan
