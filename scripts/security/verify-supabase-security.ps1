# =============================================================================
# Verify Supabase Security Configuration
# =============================================================================
# This script checks your .env.local file for proper Supabase configuration
# =============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Supabase Configuration Validator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
$envFile = ".env.local"
if (-not (Test-Path $envFile)) {
    $envFile = "../.env.local"
    if (-not (Test-Path $envFile)) {
        Write-Host "[ERROR] .env.local file not found!" -ForegroundColor Red
        Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "[INFO] Found .env.local file" -ForegroundColor Green
Write-Host ""

# Read the file
$envContent = Get-Content $envFile -Raw
$lines = Get-Content $envFile

# Check for NEXT_PUBLIC_SUPABASE_URL
Write-Host "Checking NEXT_PUBLIC_SUPABASE_URL..." -ForegroundColor Yellow
$urlLine = $lines | Where-Object { $_ -match "^NEXT_PUBLIC_SUPABASE_URL=" }

if ($urlLine) {
    $url = $urlLine -replace "^NEXT_PUBLIC_SUPABASE_URL=", ""
    if ($url -match "^https://.*\.supabase\.co$") {
        Write-Host "  [OK] URL format is valid: $url" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] URL may be invalid: $url" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] NEXT_PUBLIC_SUPABASE_URL not found!" -ForegroundColor Red
}

Write-Host ""

# Check for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
Write-Host "Checking NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY..." -ForegroundColor Yellow
$publishableKeyLine = $lines | Where-Object { $_ -match "^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" }

if ($publishableKeyLine) {
    $publishableKey = $publishableKeyLine -replace "^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=", ""
    $keyLength = $publishableKey.Length

    Write-Host "  Key length: $keyLength characters" -ForegroundColor Cyan

    if ($publishableKey -match '^sb_publishable_') {
        Write-Host "  [OK] Key has correct publishable format (sb_publishable_*)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Key format is INVALID!" -ForegroundColor Red
        Write-Host "  Expected: sb_publishable_*" -ForegroundColor Red
        Write-Host "  Found: $($publishableKey.Substring(0, [Math]::Min(20, $publishableKey.Length)))..." -ForegroundColor Red
        Write-Host "  FIX: Get the publishable key from Supabase Dashboard → Settings → API Keys" -ForegroundColor Yellow
    }

    if ($keyLength -gt 50) {
        Write-Host "  [OK] Key length looks correct ($keyLength chars)" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Key appears TRUNCATED!" -ForegroundColor Red
        Write-Host "  Expected 50+ characters, found $keyLength" -ForegroundColor Red
        Write-Host "  FIX: Ensure the entire key is on ONE line" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [ERROR] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found!" -ForegroundColor Red
}

Write-Host ""

# Check for SUPABASE_SERVICE_ROLE_KEY
Write-Host "Checking SUPABASE_SERVICE_ROLE_KEY..." -ForegroundColor Yellow
$serviceKeyLine = $lines | Where-Object { $_ -match "^SUPABASE_SERVICE_ROLE_KEY=" }

if ($serviceKeyLine) {
    $serviceKey = $serviceKeyLine -replace "^SUPABASE_SERVICE_ROLE_KEY=", ""
    $keyLength = $serviceKey.Length
    $keyParts = $serviceKey.Split(".")

    if ($keyParts.Count -eq 3 -and $keyLength -gt 150) {
        Write-Host "  [OK] Service role key format is valid" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Service role key may be malformed" -ForegroundColor Yellow
        Write-Host "  Segments: $($keyParts.Count), Length: $keyLength" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [WARN] SUPABASE_SERVICE_ROLE_KEY not found (needed for admin operations)" -ForegroundColor Yellow
}

Write-Host ""

# Check for common issues
Write-Host "Checking for common issues..." -ForegroundColor Yellow

# Check for quotes around values
if ($envContent -match 'SUPABASE.*="') {
    Write-Host "  [WARN] Found quotes around values - remove them!" -ForegroundColor Yellow
}

# Check for spaces around equals
if ($envContent -match 'SUPABASE.*\s+=\s+') {
    Write-Host "  [WARN] Found spaces around '=' - remove them!" -ForegroundColor Yellow
}

# Check for line continuations in keys
$multilineKey = $false
$inKey = $false
foreach ($line in $lines) {
    if ($line -match "^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=") {
        $inKey = $true
    } elseif ($inKey -and $line -match "^[A-Za-z0-9+/=]+$") {
        $multilineKey = $true
        break
    } elseif ($line -match "^[A-Z_]+=") {
        $inKey = $false
    }
}

if ($multilineKey) {
    Write-Host "  [ERROR] Anon key appears to span multiple lines!" -ForegroundColor Red
    Write-Host "  FIX: Join the key onto a single line" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Validation Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Summary
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Fix any issues marked [ERROR] above" -ForegroundColor White
Write-Host "2. Run: Remove-Item -Recurse -Force .next" -ForegroundColor White
Write-Host "3. Run: npm run dev" -ForegroundColor White
Write-Host "4. Test login at http://localhost:3000/login" -ForegroundColor White
Write-Host ""
