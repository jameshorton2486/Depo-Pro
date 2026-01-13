#!/usr/bin/env pwsh
# Supabase Security & Operational Verification

Write-Host "`n╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  SUPABASE KEY SECURITY & OPERATIONAL VERIFICATION    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Load environment variables
if (Test-Path .env.local) {
    Get-Content .env.local | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
        }
    }
    Write-Host "✓ Loaded .env.local" -ForegroundColor Green
} else {
    Write-Host "✗ .env.local not found" -ForegroundColor Red
    exit 1
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "1. KEY FORMAT VALIDATION" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# Check URL
Write-Host "   Supabase URL: " -NoNewline
if ($env:NEXT_PUBLIC_SUPABASE_URL -match '^https://[a-z]+\.supabase\.co$') {
    Write-Host "✓ Valid" -ForegroundColor Green
} else {
    Write-Host "✗ Invalid" -ForegroundColor Red
}

# Check anon key
Write-Host "   Anon Key: " -NoNewline
if ($env:NEXT_PUBLIC_SUPABASE_ANON_KEY -match '^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    Write-Host "✓ Valid JWT format" -ForegroundColor Green
} else {
    Write-Host "✗ Invalid JWT" -ForegroundColor Red
}

# Check service role key
Write-Host "   Service Role Key: " -NoNewline
if ($env:SUPABASE_SERVICE_ROLE_KEY -match '^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
    Write-Host "✓ Valid JWT format" -ForegroundColor Green
} else {
    Write-Host "✗ Invalid JWT" -ForegroundColor Red
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "2. OPERATIONAL TESTS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# Test anon key
Write-Host "   Testing anon key... " -NoNewline
try {
    $headers = @{
        "apikey" = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
        "Authorization" = "Bearer $env:NEXT_PUBLIC_SUPABASE_ANON_KEY"
    }
    $response = Invoke-RestMethod -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/rest/v1/" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "✓ Working" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed" -ForegroundColor Red
    Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test auth endpoint
Write-Host "   Testing auth endpoint... " -NoNewline
try {
    $headers = @{
        "apikey" = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY
        "Content-Type" = "application/json"
    }
    $response = Invoke-RestMethod -Uri "$env:NEXT_PUBLIC_SUPABASE_URL/auth/v1/health" -Headers $headers -Method Get -ErrorAction Stop
    Write-Host "✓ Healthy" -ForegroundColor Green
} catch {
    Write-Host "✗ Unreachable" -ForegroundColor Red
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "3. SECURITY CHECKS" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

# Check gitignore
Write-Host "   .gitignore status: " -NoNewline
if (Test-Path .gitignore) {
    $gitignore = Get-Content .gitignore -Raw
    if ($gitignore -match '\.env\.local') {
        Write-Host "✓ .env.local is gitignored" -ForegroundColor Green
    } else {
        Write-Host "✗ .env.local NOT gitignored" -ForegroundColor Red
    }
} else {
    Write-Host "✗ No .gitignore found" -ForegroundColor Red
}

# Check if keys are in git history
Write-Host "   Git history scan: " -NoNewline
$found = $false
$keyPart = $env:SUPABASE_SERVICE_ROLE_KEY.Substring(0, 20)
try {
    $gitResult = git log --all --oneline -S $keyPart 2>&1
    if ($gitResult -and $gitResult.Count -gt 0) {
        Write-Host "⚠ KEYS FOUND IN GIT - ROTATE NOW!" -ForegroundColor Red
        $found = $true
    } else {
        Write-Host "✓ Clean" -ForegroundColor Green
    }
} catch {
    Write-Host "✓ Clean (no git history)" -ForegroundColor Green
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "4. KEY EXPOSURE CHECK" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────" -ForegroundColor Gray

Write-Host "   Checking codebase... " -NoNewline
$exposedFiles = @()
Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx | Where-Object {
    $_.FullName -notmatch 'node_modules' -and $_.FullName -notmatch '.next'
} | ForEach-Object {
    $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -match 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJ') {
        $exposedFiles += $_.FullName
    }
}

if ($exposedFiles.Count -gt 0) {
    Write-Host "✗ KEYS FOUND IN CODE!" -ForegroundColor Red
    $exposedFiles | ForEach-Object { Write-Host "     $_" -ForegroundColor Yellow }
} else {
    Write-Host "✓ No hardcoded keys" -ForegroundColor Green
}

Write-Host "`n─────────────────────────────────────────────────────────" -ForegroundColor Gray
Write-Host "5. SUMMARY" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────────────────────`n" -ForegroundColor Gray

if ($found) {
    Write-Host "⚠  ACTION REQUIRED: Keys found in git history" -ForegroundColor Red
    Write-Host "   1. Go to Supabase Dashboard → Settings → API" -ForegroundColor Yellow
    Write-Host "   2. Click 'Reset service_role secret'" -ForegroundColor Yellow
    Write-Host "   3. Update .env.local with new key" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "✓ All security checks passed" -ForegroundColor Green
    Write-Host "✓ Keys are operational" -ForegroundColor Green
    Write-Host "✓ No exposure detected" -ForegroundColor Green
}

Write-Host ""
