# =============================================================================
# Update Supabase Keys in .env.local
# =============================================================================
# This script helps you update your .env.local file with the correct
# Supabase publishable and secret keys.
#
# Usage:
#   .\scripts\update-supabase-keys.ps1
# =============================================================================

Write-Host "🔑 Supabase Key Update Helper" -ForegroundColor Cyan
Write-Host ""

$envFile = ".env.local"

# Check if .env.local exists
if (-not (Test-Path $envFile)) {
    Write-Host "❌ $envFile not found!" -ForegroundColor Red
    Write-Host "   Create it first by copying .env.example" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Current .env.local status:" -ForegroundColor Yellow
Write-Host ""

# Check current key format (without exposing the full key)
$content = Get-Content $envFile -Raw
$publishableKeyLine = ($content -split "`n" | Select-String "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=")

if ($publishableKeyLine) {
    $currentKey = ($publishableKeyLine -split "=")[1].Trim()
    $keyPrefix = $currentKey.Substring(0, [Math]::Min(30, $currentKey.Length))
    
    Write-Host "   Current NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: $keyPrefix..." -ForegroundColor Gray
    
    if ($currentKey.StartsWith("eyJhbGciOi")) {
        Write-Host "   ⚠️  Legacy JWT key detected (needs update)" -ForegroundColor Red
        Write-Host ""
        Write-Host "   ❌ This key format is no longer supported" -ForegroundColor Red
        Write-Host "   ✅ You need a publishable key (sb_publishable_...)" -ForegroundColor Green
    } elseif ($currentKey.StartsWith("sb_publishable_")) {
        Write-Host "   ✅ Publishable key format detected (correct!)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unknown key format" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📝 Manual Update Instructions:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Open Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/[YOUR_PROJECT]/settings/api" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Go to 'Publishable and secret API keys' tab" -ForegroundColor White
Write-Host ""
Write-Host "3. Copy the PUBLISHABLE key (starts with sb_publishable_)" -ForegroundColor White
Write-Host "   Update this line in .env.local:" -ForegroundColor Gray
Write-Host "   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_[PASTE_FULL_KEY]" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Click 'Reveal' on the SECRET key (starts with sb_secret_)" -ForegroundColor White
Write-Host "   Update this line in .env.local:" -ForegroundColor Gray
Write-Host "   SUPABASE_SERVICE_ROLE_KEY=sb_secret_[PASTE_FULL_KEY]" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Save .env.local and restart:" -ForegroundColor White
Write-Host "   Remove-Item -Recurse -Force .next" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""

# Offer to open the file
$open = Read-Host "Would you like to open .env.local now? (y/n)"
if ($open -eq "y" -or $open -eq "Y") {
    code $envFile
    Write-Host ""
    Write-Host "✅ Opened $envFile in VS Code" -ForegroundColor Green
    Write-Host "   Update the keys, then restart your dev server" -ForegroundColor Yellow
}
