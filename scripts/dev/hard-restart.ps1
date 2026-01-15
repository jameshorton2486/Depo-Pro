# =============================================================================
# Hard Restart Script
# =============================================================================
# Purpose: Kill Node, clear .next cache, restart dev server
# =============================================================================

Write-Host "🔄 Performing hard restart..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all Node processes
Write-Host "1️⃣ Killing Node processes..." -ForegroundColor Yellow
try {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Write-Host "   ✅ Node processes stopped" -ForegroundColor Green
} catch {
    Write-Host "   ℹ️  No Node processes found (this is OK)" -ForegroundColor Gray
}

# Step 2: Remove .next directory
Write-Host "2️⃣ Removing .next cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
    Write-Host "   ✅ .next cache cleared" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  .next directory not found (this is OK)" -ForegroundColor Gray
}

# Step 3: Verify .env.local exists
Write-Host "3️⃣ Checking .env.local..." -ForegroundColor Yellow
if (-not (Test-Path ".env.local")) {
    Write-Host "   ❌ ERROR: .env.local not found!" -ForegroundColor Red
    Write-Host "   Create .env.local with your Supabase keys" -ForegroundColor Yellow
    exit 1
}
Write-Host "   ✅ .env.local found" -ForegroundColor Green

# Step 4: Verify key format
Write-Host "4️⃣ Verifying key format..." -ForegroundColor Yellow
$envContent = Get-Content ".env.local" -Raw
if ($envContent -match 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+?)(?:\r?\n|$)') {
    $publishableKey = $matches[1].Trim() -replace '^["'']|["'']$', ''
    if ($publishableKey -match '^sb_publishable_') {
        Write-Host "   ✅ Key format correct (sb_publishable_)" -ForegroundColor Green
    } elseif ($publishableKey -match '^eyJhbGciOi') {
        Write-Host "   ❌ ERROR: Key is legacy JWT (eyJhbGciOi)" -ForegroundColor Red
        Write-Host "   Update .env.local with publishable key first!" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "   ⚠️  Key format not recognized" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not found in .env.local" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "5️⃣ Starting dev server..." -ForegroundColor Yellow
Write-Host "   Run: npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "✅ Hard restart complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Run: npm run dev" -ForegroundColor White
Write-Host "   2. Wait for server to start" -ForegroundColor White
Write-Host "   3. Close all browser tabs for localhost:3000" -ForegroundColor White
Write-Host "   4. Open new tab and go to /login" -ForegroundColor White
Write-Host "   5. Check Network tab - apikey should be 'sb_publishable_...'" -ForegroundColor White
Write-Host ""
