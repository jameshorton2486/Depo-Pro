# validate-env-format.ps1
# Validates .env.local format and provides fix instructions

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ $envFile not found!" -ForegroundColor Red
    Write-Host "   Create it with your Supabase credentials." -ForegroundColor Yellow
    exit 1
}

Write-Host "🔍 Validating $envFile format..." -ForegroundColor Cyan
Write-Host ""

$issues = @()
$content = Get-Content $envFile

# Check NEXT_PUBLIC_SUPABASE_URL
$urlLine = $content | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' }
if (-not $urlLine) {
    $issues += "❌ NEXT_PUBLIC_SUPABASE_URL is missing"
} else {
    $urlValue = ($urlLine -split '=', 2)[1]
    if (-not $urlValue -or $urlValue.Trim() -eq '') {
        $issues += "❌ NEXT_PUBLIC_SUPABASE_URL is empty"
    } elseif ($urlValue -notmatch '^https://.*\.supabase\.co$') {
        $issues += "⚠️  NEXT_PUBLIC_SUPABASE_URL format may be incorrect: $urlValue"
    } else {
        Write-Host "✅ NEXT_PUBLIC_SUPABASE_URL: OK" -ForegroundColor Green
    }
}

# Check NEXT_PUBLIC_SUPABASE_ANON_KEY
$anonKeyLines = $content | Where-Object { $_ -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY' }
$anonKeyCount = ($anonKeyLines | Measure-Object).Count

if ($anonKeyCount -eq 0) {
    $issues += "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing"
} elseif ($anonKeyCount -gt 1) {
    $issues += "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is split across $anonKeyCount lines (must be ONE line)"
    Write-Host ""
    Write-Host "🔧 FIX REQUIRED:" -ForegroundColor Red
    Write-Host "   The anon key is split across multiple lines. Fix it like this:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   ❌ BROKEN (multi-line):" -ForegroundColor Red
    $anonKeyLines | ForEach-Object { Write-Host "      $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "   ✅ CORRECT (single line):" -ForegroundColor Green
    $firstLine = $anonKeyLines[0]
    $keyValue = ($firstLine -split '=', 2)[1]
    $allKeyParts = $anonKeyLines | ForEach-Object { 
        if ($_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=') {
            ($_ -split '=', 2)[1]
        } else {
            $_.Trim()
        }
    }
    $fullKey = $allKeyParts -join ''
    Write-Host "      NEXT_PUBLIC_SUPABASE_ANON_KEY=$fullKey" -ForegroundColor Green
    Write-Host ""
} else {
    $anonKeyLine = $anonKeyLines[0]
    $keyValue = ($anonKeyLine -split '=', 2)[1]
    
    if (-not $keyValue -or $keyValue.Trim() -eq '') {
        $issues += "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is empty"
    } elseif ($keyValue.Length -lt 200) {
        $issues += "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY appears too short ($($keyValue.Length) chars, expected 200+)"
    } elseif ($keyValue -match "`n" -or $keyValue -match "`r") {
        $issues += "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY contains line breaks (must be ONE line)"
    } else {
        Write-Host "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: OK ($($keyValue.Length) characters)" -ForegroundColor Green
    }
}

Write-Host ""

if ($issues.Count -gt 0) {
    Write-Host "❌ ISSUES FOUND:" -ForegroundColor Red
    $issues | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "📝 TO FIX:" -ForegroundColor Cyan
    Write-Host "   1. Open .env.local: code .env.local" -ForegroundColor Cyan
    Write-Host "   2. Ensure NEXT_PUBLIC_SUPABASE_ANON_KEY is on ONE line" -ForegroundColor Cyan
    Write-Host "   3. Remove all line breaks from the key value" -ForegroundColor Cyan
    Write-Host "   4. Save and restart: Remove-Item -Recurse -Force .next; npm run dev" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "✅ All environment variables are correctly formatted!" -ForegroundColor Green
    exit 0
}
