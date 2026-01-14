# =============================================================================
# COMPREHENSIVE SUPABASE AUTH FIX SCRIPT
# =============================================================================
# Run this from your project root: C:\Users\james\depo-pro
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Auth Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "[ERROR] Not in project root! Run from C:\Users\james\depo-pro" -ForegroundColor Red
    exit 1
}

# Step 2: Stop any running dev server
Write-Host "[1/6] Stop any running processes..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Step 3: Clean ALL caches
Write-Host "[2/6] Cleaning all caches..." -ForegroundColor Yellow
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .turbo -ErrorAction SilentlyContinue

# Step 4: Validate .env.local
Write-Host "[3/6] Validating .env.local..." -ForegroundColor Yellow
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "[ERROR] .env.local not found!" -ForegroundColor Red
    exit 1
}

$lines = Get-Content $envFile
$urlLine = $lines | Where-Object { $_ -match "^NEXT_PUBLIC_SUPABASE_URL=" }
$keyLine = $lines | Where-Object { $_ -match "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" }

if (-not $urlLine) {
    Write-Host "[ERROR] NEXT_PUBLIC_SUPABASE_URL not found!" -ForegroundColor Red
    exit 1
}

if (-not $keyLine) {
    Write-Host "[ERROR] NEXT_PUBLIC_SUPABASE_ANON_KEY not found!" -ForegroundColor Red
    exit 1
}

$anonKey = $keyLine -replace "^NEXT_PUBLIC_SUPABASE_ANON_KEY=", ""
$keyParts = $anonKey.Split(".")
$keyLength = $anonKey.Length

Write-Host "  URL: Found" -ForegroundColor Green
Write-Host "  Key length: $keyLength chars" -ForegroundColor Cyan
Write-Host "  JWT segments: $($keyParts.Count)" -ForegroundColor Cyan

if ($keyParts.Count -ne 3) {
    Write-Host "[ERROR] Key is MALFORMED! Expected 3 segments, got $($keyParts.Count)" -ForegroundColor Red
    Write-Host "FIX: Put the entire key on ONE line in .env.local" -ForegroundColor Yellow
    exit 1
}

if ($keyLength -lt 100) {
    Write-Host "[ERROR] Key is TRUNCATED! Only $keyLength chars" -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Environment variables valid" -ForegroundColor Green

# Step 5: Copy fixed files
Write-Host "[4/6] Installing fixed Supabase files..." -ForegroundColor Yellow
$downloads = "C:\Users\james\Downloads"

if (Test-Path "$downloads\browser.ts") {
    Copy-Item "$downloads\browser.ts" -Destination "lib\supabase\browser.ts" -Force
    Write-Host "  Updated: lib/supabase/browser.ts" -ForegroundColor Green
}

if (Test-Path "$downloads\client.ts") {
    Copy-Item "$downloads\client.ts" -Destination "lib\supabase\client.ts" -Force
    Write-Host "  Updated: lib/supabase/client.ts" -ForegroundColor Green
}

if (Test-Path "$downloads\middleware.ts") {
    Copy-Item "$downloads\middleware.ts" -Destination "lib\supabase\middleware.ts" -Force
    Write-Host "  Updated: lib/supabase/middleware.ts" -ForegroundColor Green
}

# Step 6: Reinstall dependencies (clears any caching issues)
Write-Host "[5/6] Reinstalling dependencies..." -ForegroundColor Yellow
npm install

# Step 7: Start dev server
Write-Host "[6/6] Starting dev server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Fix Complete! Starting server..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test at: http://localhost:3000/forgot-password" -ForegroundColor Cyan
Write-Host "Check browser console for [Supabase Browser] logs" -ForegroundColor Cyan
Write-Host ""

npm run dev
