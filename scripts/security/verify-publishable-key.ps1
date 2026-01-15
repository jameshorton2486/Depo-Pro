# =============================================================================
# Verify Publishable Key Script
# =============================================================================
# Purpose: Check if NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is using publishable key
# =============================================================================

Write-Host "🔍 Verifying Supabase Publishable Key..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ ERROR: .env.local file not found!" -ForegroundColor Red
    Write-Host "   Create .env.local and add your Supabase keys" -ForegroundColor Yellow
    exit 1
}

# Read .env.local
$envContent = Get-Content ".env.local" -Raw

# Extract NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
$publishableKey = $null
if ($envContent -match 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+?)(?:\r?\n|$)') {
    $publishableKey = $matches[1].Trim()
    # Remove quotes if present
    $publishableKey = $publishableKey -replace '^["'']|["'']$', ''
}

if (-not $publishableKey) {
    Write-Host "❌ ERROR: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Current Key (first 50 chars): $($publishableKey.Substring(0, [Math]::Min(50, $publishableKey.Length)))..." -ForegroundColor Gray
Write-Host ""

# Check key type
if ($publishableKey -match '^sb_publishable_') {
    Write-Host "✅ CORRECT: Key starts with 'sb_publishable_'" -ForegroundColor Green
    Write-Host "   This is the publishable key format" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Your key is correct!" -ForegroundColor Green
    exit 0
}
elseif ($publishableKey -match '^eyJhbGciOi') {
    Write-Host "❌ ERROR: Key starts with 'eyJhbGciOi' (Legacy JWT)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔴 THIS IS THE PROBLEM!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Your key is a legacy JWT key, not a publishable key." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 To fix:" -ForegroundColor Cyan
    Write-Host "   1. Go to Supabase Dashboard → Settings → API → Publishable and secret API keys" -ForegroundColor White
    Write-Host "   2. Find the 'Publishable' key (starts with sb_publishable_)" -ForegroundColor White
    Write-Host "   3. Copy the full key" -ForegroundColor White
    Write-Host "   4. Update .env.local:" -ForegroundColor White
    Write-Host "      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_..." -ForegroundColor White
    Write-Host "   5. Run: Remove-Item -Recurse -Force .next" -ForegroundColor White
    Write-Host "   6. Run: npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}
else {
    Write-Host "⚠️  WARNING: Key format not recognized" -ForegroundColor Yellow
    Write-Host "   Expected: 'sb_publishable_...'" -ForegroundColor Yellow
    Write-Host "   Found: '$($publishableKey.Substring(0, [Math]::Min(20, $publishableKey.Length)))...'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please verify your key in Supabase Dashboard" -ForegroundColor Yellow
    exit 1
}
