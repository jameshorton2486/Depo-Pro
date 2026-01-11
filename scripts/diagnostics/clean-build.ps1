# =============================================================================
# CLEAN BUILD SCRIPT
# =============================================================================
# Removes build cache and node_modules for fresh install
# Usage: .\scripts\clean-build.ps1
# =============================================================================

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  DEPO-PRO CLEAN BUILD" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

# Check if we're in the project root
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Must run from project root directory" -ForegroundColor Red
    exit 1
}

# Stop any running dev servers
Write-Host "Step 1: Checking for running processes..." -ForegroundColor Yellow
$nextProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*next*" }
if ($nextProcess) {
    Write-Host "  WARNING: Next.js process detected. Please stop dev server first (Ctrl+C)" -ForegroundColor Yellow
    $continue = Read-Host "  Continue anyway? (y/N)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Remove .next directory
Write-Host "Step 2: Removing .next directory..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "  ✓ Removed .next" -ForegroundColor Green
} else {
    Write-Host "  ✓ .next not found (already clean)" -ForegroundColor Gray
}

# Remove node_modules
Write-Host "Step 3: Removing node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "  ✓ Removed node_modules" -ForegroundColor Green
} else {
    Write-Host "  ✓ node_modules not found (already clean)" -ForegroundColor Gray
}

# Remove package-lock.json
Write-Host "Step 4: Removing package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "  ✓ Removed package-lock.json" -ForegroundColor Green
} else {
    Write-Host "  ✓ package-lock.json not found (already clean)" -ForegroundColor Gray
}

# Fresh install
Write-Host "Step 5: Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  ✗ npm install failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "  CLEAN BUILD COMPLETE" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npm run dev" -ForegroundColor White
Write-Host "  2. Open http://localhost:3000/login" -ForegroundColor White
Write-Host "  3. Check browser console for errors" -ForegroundColor White
Write-Host "  4. Try logging in" -ForegroundColor White
Write-Host ""
