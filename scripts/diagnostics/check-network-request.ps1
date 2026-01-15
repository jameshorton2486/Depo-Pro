# =============================================================================
# CHECK NETWORK REQUEST DIAGNOSTIC SCRIPT
# =============================================================================
# This script helps diagnose the "Invalid API key" error by checking
# what environment variables are actually available at runtime
# =============================================================================

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  NETWORK REQUEST DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "🔍 Checking Environment Configuration..." -ForegroundColor Yellow
Write-Host ""

# Check .env files
Write-Host "📁 Environment Files:" -ForegroundColor White
$envFiles = @(".env", ".env.local")
foreach ($file in $envFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
        
        # Check for NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        $content = Get-Content $file -Raw
        if ($content -match "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)") {
            $keyValue = $matches[1].Trim()
            $keyValue = $keyValue -replace '^["\']|["\']$', ''  # Remove quotes
            
            Write-Host "     NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY found" -ForegroundColor Gray
            Write-Host "     Length: $($keyValue.Length) characters" -ForegroundColor Gray
            Write-Host "     Starts with: $($keyValue.Substring(0, [Math]::Min(20, $keyValue.Length)))" -ForegroundColor Gray
            
            if (-not $keyValue.StartsWith("sb_publishable_")) {
                Write-Host "     ❌ ERROR: Key doesn't start with 'sb_publishable_'!" -ForegroundColor Red
                Write-Host "     Get the publishable key from Supabase Dashboard → Settings → API Keys" -ForegroundColor Yellow
            } else {
                Write-Host "     ✅ Key format correct (sb_publishable_*)" -ForegroundColor Green
            }
        } else {
            Write-Host "     ❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NOT FOUND" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ $file NOT FOUND" -ForegroundColor Red
    }
}

Write-Host ""

# Check .next folder
Write-Host "📦 Build Cache Status:" -ForegroundColor White
if (Test-Path ".next") {
    $nextAge = (Get-Date) - (Get-Item ".next").LastWriteTime
    Write-Host "  ⚠️  .next folder exists" -ForegroundColor Yellow
    Write-Host "     Last modified: $([int]$nextAge.TotalMinutes) minutes ago" -ForegroundColor Gray
    
    if ($nextAge.TotalMinutes -gt 30) {
        Write-Host "     🔧 RECOMMENDATION: Delete .next folder and restart dev server" -ForegroundColor Cyan
    }
} else {
    Write-Host "  ✅ .next folder not found (clean build)" -ForegroundColor Green
}

Write-Host ""

# Instructions
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC STEPS" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Check Browser Console (F12):" -ForegroundColor Yellow
Write-Host "   Look for: [Supabase Client] Environment Check" -ForegroundColor White
Write-Host "   Should show: URL and Key values (not UNDEFINED)" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣ Check Network Tab (F12 → Network):" -ForegroundColor Yellow
Write-Host "   a. Submit forgot password form" -ForegroundColor White
Write-Host "   b. Find request to: ildhcfspbmhuemzgvzyx.supabase.co/auth/v1/recover" -ForegroundColor White
Write-Host "   c. Click on the request (should show 401)" -ForegroundColor White
Write-Host "   d. Go to 'Headers' tab → 'Request Headers' section" -ForegroundColor White
Write-Host "   e. Find 'apikey' header and tell me its value" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣ If apikey header is 'undefined' or empty:" -ForegroundColor Yellow
Write-Host "   → Build cache is stale" -ForegroundColor White
Write-Host "   → Run: Remove-Item -Recurse -Force .next" -ForegroundColor Cyan
Write-Host "   → Then: npm run dev" -ForegroundColor Cyan
Write-Host ""

Write-Host "4️⃣ If apikey header has wrong value:" -ForegroundColor Yellow
Write-Host "   → Wrong key in .env.local" -ForegroundColor White
Write-Host "   → Verify key in Supabase Dashboard → Settings → API" -ForegroundColor White
Write-Host ""

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""
