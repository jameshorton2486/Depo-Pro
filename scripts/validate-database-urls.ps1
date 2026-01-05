# scripts/validate-database-urls.ps1
# Quick validation script to check if DIRECT_URL is configured correctly

Write-Host "🔍 Validating Database URLs..." -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "❌ .env.local not found" -ForegroundColor Red
    exit 1
}

# Read .env.local
$envContent = Get-Content ".env.local" -Raw

# Check DATABASE_URL
$hasDatabaseUrl = $envContent -match "DATABASE_URL="
if ($hasDatabaseUrl) {
    $dbUrlMatch = [regex]::Match($envContent, 'DATABASE_URL="?([^"\r\n]+)"?')
    if ($dbUrlMatch.Success) {
        $dbUrl = $dbUrlMatch.Groups[1].Value
        if ($dbUrl -match "pooler\.supabase\.com") {
            Write-Host "✅ DATABASE_URL: Pooled connection (correct for runtime)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  DATABASE_URL: Not a pooled connection" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ DATABASE_URL not found" -ForegroundColor Red
}

# Check DIRECT_URL
$hasDirectUrl = $envContent -match "DIRECT_URL="
if ($hasDirectUrl) {
    $directUrlMatch = [regex]::Match($envContent, 'DIRECT_URL="?([^"\r\n]+)"?')
    if ($directUrlMatch.Success) {
        $directUrl = $directUrlMatch.Groups[1].Value
        
        # Validate format
        if ($directUrl -match "db\.([^.]+)\.supabase\.co") {
            $projectRef = $matches[1]
            Write-Host "✅ DIRECT_URL: Direct connection (correct for migrations)" -ForegroundColor Green
            Write-Host "   Project: $projectRef" -ForegroundColor Gray
            
            # Check for sslmode
            if ($directUrl -match "sslmode=require") {
                Write-Host "✅ SSL mode: require (correct)" -ForegroundColor Green
            } else {
                Write-Host "⚠️  SSL mode: Missing or incorrect (should be sslmode=require)" -ForegroundColor Yellow
            }
        } elseif ($directUrl -match "pooler\.supabase\.com") {
            Write-Host "❌ DIRECT_URL: Using pooler (WRONG - migrations will fail!)" -ForegroundColor Red
            Write-Host "   Must use: db.<project>.supabase.co" -ForegroundColor Yellow
        } else {
            Write-Host "⚠️  DIRECT_URL: Format unclear" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ DIRECT_URL not found (REQUIRED for migrations)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Add to .env.local:" -ForegroundColor Yellow
    Write-Host 'DIRECT_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"' -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ Validation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to test connection:" -ForegroundColor Cyan
Write-Host "  npx prisma db pull" -ForegroundColor Gray
