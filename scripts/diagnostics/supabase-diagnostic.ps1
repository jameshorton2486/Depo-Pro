# =============================================================================
# SUPABASE & AUTH DIAGNOSTIC SCRIPT
# =============================================================================
# Run this in PowerShell to diagnose authentication issues
# Usage: .\scripts\supabase-diagnostic.ps1
# =============================================================================

Write-Host "`n" -NoNewline
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  DEPO-PRO SUPABASE DIAGNOSTIC" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""

# Your Supabase credentials
$SUPABASE_URL = "https://ildhcfspbmhuemzgvzyx.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZGhjZnNwYm1odWVtemd2enl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTMwMzgsImV4cCI6MjA3ODYyOTAzOH0.X9ugAI2BWea4WHRNQBP6UrKXXyxokKJqtpZciX2owcM"

# Test credentials
$TEST_EMAIL = "jameshorton2486@gmail.com"
$TEST_PASSWORD = "Test123456!"

# -----------------------------------------------------------------------------
# TEST 1: Health Check
# -----------------------------------------------------------------------------
Write-Host "[TEST 1] Supabase Health Check" -ForegroundColor Yellow
Write-Host ("-" * 50)

try {
    $healthResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/health" -Headers @{
        "apikey" = $SUPABASE_ANON_KEY
    } -Method Get

    Write-Host "  Status: " -NoNewline
    Write-Host "HEALTHY" -ForegroundColor Green
    Write-Host "  Version: $($healthResponse.version)"
    Write-Host "  Service: $($healthResponse.name)"
} catch {
    Write-Host "  Status: " -NoNewline
    Write-Host "FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)"
}

Write-Host ""

# -----------------------------------------------------------------------------
# TEST 2: Login Test
# -----------------------------------------------------------------------------
Write-Host "[TEST 2] Login Authentication" -ForegroundColor Yellow
Write-Host ("-" * 50)

$ACCESS_TOKEN = $null

try {
    $loginBody = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" -Headers @{
        "apikey" = $SUPABASE_ANON_KEY
        "Content-Type" = "application/json"
    } -Method Post -Body $loginBody

    Write-Host "  Status: " -NoNewline
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "  User ID: $($loginResponse.user.id)"
    Write-Host "  Email: $($loginResponse.user.email)"
    Write-Host "  Token: $($loginResponse.access_token.Substring(0, 30))..."

    # Save token for later tests
    $ACCESS_TOKEN = $loginResponse.access_token
} catch {
    Write-Host "  Status: " -NoNewline
    Write-Host "FAILED" -ForegroundColor Red

    try {
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        if ($errorBody) {
            Write-Host "  Error: $($errorBody.error_description)"
            Write-Host "  Code: $($errorBody.error)"

            # Provide diagnostic hints
            if ($errorBody.error -eq "invalid_grant") {
                Write-Host ""
                Write-Host "  DIAGNOSIS:" -ForegroundColor Magenta
                Write-Host "  > Invalid email or password" -ForegroundColor Yellow
                Write-Host "  > Check credentials in Supabase Dashboard → Authentication → Users" -ForegroundColor Cyan
                Write-Host "  > Or create a new user with: npm run create-test-users" -ForegroundColor Cyan
            }
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "  HTTP Status: $statusCode"
        Write-Host "  Error: $($_.Exception.Message)"

        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "  DIAGNOSIS:" -ForegroundColor Magenta
            Write-Host "  > 401 Unauthorized - Invalid credentials or user doesn't exist" -ForegroundColor Yellow
            Write-Host "  > Create user in Supabase Dashboard or use: npm run create-test-users" -ForegroundColor Cyan
        }
    }
}

Write-Host ""

# -----------------------------------------------------------------------------
# TEST 3: Password Reset Request
# -----------------------------------------------------------------------------
Write-Host "[TEST 3] Password Reset Email" -ForegroundColor Yellow
Write-Host ("-" * 50)

try {
    $resetBody = @{
        email = $TEST_EMAIL
    } | ConvertTo-Json

    $resetResponse = Invoke-WebRequest -Uri "$SUPABASE_URL/auth/v1/recover" -Headers @{
        "apikey" = $SUPABASE_ANON_KEY
        "Content-Type" = "application/json"
    } -Method Post -Body $resetBody -UseBasicParsing

    Write-Host "  Status: " -NoNewline
    Write-Host "SUCCESS" -ForegroundColor Green
    Write-Host "  Response Code: $($resetResponse.StatusCode)"
    Write-Host "  Check your email inbox!"
} catch {
    Write-Host "  Status: " -NoNewline
    Write-Host "FAILED" -ForegroundColor Red

    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "  HTTP Status: $statusCode"

    try {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $errorBody = $reader.ReadToEnd() | ConvertFrom-Json

        Write-Host "  Error: $($errorBody.error_description)" -ForegroundColor Red
        Write-Host "  Message: $($errorBody.msg)" -ForegroundColor Red

        # Diagnose the issue
        Write-Host ""
        Write-Host "  DIAGNOSIS:" -ForegroundColor Magenta

        if ($errorBody.msg -match "sending" -or $errorBody.error_description -match "sending") {
            Write-Host "  > SMTP email sending failed" -ForegroundColor Yellow
            Write-Host "  > Possible causes:" -ForegroundColor Yellow
            Write-Host "    1. RESEND_API_KEY not set or invalid" -ForegroundColor Gray
            Write-Host "    2. Resend domain (depo-pro.com) not verified" -ForegroundColor Gray
            Write-Host "    3. Sender email 'notifications@depo-pro.com' not authorized" -ForegroundColor Gray
            Write-Host ""
            Write-Host "  FIX: Set RESEND_API_KEY in .env.local (get from https://resend.com/api-keys)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "  Raw Error: $($_.Exception.Message)"
    }
}

Write-Host ""

# -----------------------------------------------------------------------------
# TEST 4: Check .env.local
# -----------------------------------------------------------------------------
Write-Host "[TEST 4] Local Environment Variables" -ForegroundColor Yellow
Write-Host ("-" * 50)

$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "  .env.local: " -NoNewline
    Write-Host "EXISTS" -ForegroundColor Green

    $envContent = Get-Content $envFile

    # Check for SUPABASE_URL
    $urlLine = $envContent | Where-Object { $_ -match "NEXT_PUBLIC_SUPABASE_URL" -and $_ -notmatch "^#" }
    if ($urlLine) {
        $urlValue = ($urlLine -split "=")[1].Trim().Trim('"').Trim("'")
        Write-Host "  NEXT_PUBLIC_SUPABASE_URL: SET" -ForegroundColor Green
        Write-Host "    Value: $($urlValue.Substring(0, [Math]::Min(50, $urlValue.Length)))..."

        # Check if it matches
        if ($urlValue -eq $SUPABASE_URL) {
            Write-Host "    ✓ Matches diagnostic URL" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Different from diagnostic URL" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  NEXT_PUBLIC_SUPABASE_URL: MISSING" -ForegroundColor Red
    }

    # Check for ANON_KEY
    $keyLine = $envContent | Where-Object { $_ -match "NEXT_PUBLIC_SUPABASE_ANON_KEY" -and $_ -notmatch "^#" }
    if ($keyLine) {
        $keyValue = ($keyLine -split "=")[1].Trim().Trim('"').Trim("'")
        Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY: SET" -ForegroundColor Green
        Write-Host "    Length: $($keyValue.Length) chars"
        Write-Host "    Preview: $($keyValue.Substring(0, [Math]::Min(30, $keyValue.Length)))..."

        # Check if it matches
        if ($keyValue -eq $SUPABASE_ANON_KEY) {
            Write-Host "    ✓ Matches diagnostic key" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Different from diagnostic key" -ForegroundColor Yellow
        }

        # Check for common issues
        if ($keyValue.StartsWith('"') -or $keyValue.EndsWith('"')) {
            Write-Host "    ⚠ WARNING: Key has quotes! Remove quotes from .env.local" -ForegroundColor Red
        }
    } else {
        Write-Host "  NEXT_PUBLIC_SUPABASE_ANON_KEY: MISSING" -ForegroundColor Red
    }

} else {
    Write-Host "  .env.local: " -NoNewline
    Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host "  Create .env.local with your Supabase credentials"
}

Write-Host ""

# -----------------------------------------------------------------------------
# TEST 5: Check .next cache
# -----------------------------------------------------------------------------
Write-Host "[TEST 5] Next.js Build Cache" -ForegroundColor Yellow
Write-Host ("-" * 50)

if (Test-Path ".next") {
    $cacheAge = (Get-Date) - (Get-Item ".next").LastWriteTime
    Write-Host "  .next folder: EXISTS" -ForegroundColor Yellow
    Write-Host "  Last modified: $([Math]::Floor($cacheAge.TotalHours))h $($cacheAge.Minutes)m ago"

    if ($cacheAge.TotalMinutes -gt 30) {
        Write-Host "  WARNING: Cache may be stale. Consider deleting:" -ForegroundColor Yellow
        Write-Host "    Remove-Item -Recurse -Force .next" -ForegroundColor Cyan
        Write-Host "    Then restart: npm run dev" -ForegroundColor Cyan
    } else {
        Write-Host "  ✓ Cache is recent" -ForegroundColor Green
    }
} else {
    Write-Host "  .next folder: " -NoNewline
    Write-Host "CLEAN" -ForegroundColor Green
}

Write-Host ""

# -----------------------------------------------------------------------------
# TEST 6: Check User Exists
# -----------------------------------------------------------------------------
Write-Host "[TEST 6] Verify User Exists in Supabase" -ForegroundColor Yellow
Write-Host ("-" * 50)

Write-Host "  To check if user exists, go to:" -ForegroundColor Cyan
Write-Host "  https://supabase.com/dashboard/project/ildhcfspbmhuemzgvzyx/auth/users" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or run: npm run list-users" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# SUMMARY
# -----------------------------------------------------------------------------
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor Cyan
Write-Host ""
Write-Host "Common Issues & Fixes:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Login 401 Unauthorized:" -ForegroundColor White
Write-Host "   • User doesn't exist → Create user in Supabase Dashboard" -ForegroundColor Gray
Write-Host "   • Wrong password → Reset password or create new user" -ForegroundColor Gray
Write-Host "   • Email not confirmed → Check Supabase Auth settings (may require confirmation)" -ForegroundColor Gray
Write-Host "   • Stale cache → Delete .next folder and restart dev server" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Password Reset Fails:" -ForegroundColor White
Write-Host "   • RESEND_API_KEY not set → Get from https://resend.com/api-keys" -ForegroundColor Gray
Write-Host "   • Domain not verified → Verify depo-pro.com in Resend dashboard" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Environment Variables:" -ForegroundColor White
Write-Host "   • Check .env.local exists and has correct values" -ForegroundColor Gray
Write-Host "   • Remove quotes around values in .env.local" -ForegroundColor Gray
Write-Host "   • Restart dev server after changing .env.local" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review logs: npm run logs:auth" -ForegroundColor Cyan
Write-Host "  2. Check Supabase Dashboard → Authentication → Users" -ForegroundColor Cyan
Write-Host "  3. Verify email configuration in Supabase Dashboard" -ForegroundColor Cyan
Write-Host ""
