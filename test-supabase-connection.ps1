# ═══════════════════════════════════════════════════════════════
# SUPABASE CONNECTION TEST
# ═══════════════════════════════════════════════════════════════
# Tests actual connectivity and auth functionality
# Run: .\test-supabase-connection.ps1
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SUPABASE CONNECTION TEST" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (-not (Test-Path ".env.local")) {
    Write-Host "✗ .env.local not found!" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content ".env.local" -Raw
$supabaseUrl = if ($envContent -match 'NEXT_PUBLIC_SUPABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
$anonKey = if ($envContent -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)') { $matches[1].Trim() } else { $null }

if (-not $supabaseUrl -or -not $anonKey) {
    Write-Host "✗ Missing Supabase credentials in .env.local" -ForegroundColor Red
    exit 1
}

Write-Host "Testing connection to: $supabaseUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: REST API
Write-Host "▶ Testing REST API endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    }

    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -Headers $headers -TimeoutSec 10

    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ REST API reachable (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ REST API responded with HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ REST API test failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Auth API
Write-Host "▶ Testing Auth API endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $anonKey
        "Content-Type" = "application/json"
    }

    # Test with an invalid session to verify auth endpoint is working
    $response = Invoke-WebRequest -Uri "$supabaseUrl/auth/v1/user" -Method GET -Headers $headers -TimeoutSec 10 -ErrorAction SilentlyContinue

    # We expect 401 here since we're not authenticated, which is good
    if ($response.StatusCode -eq 401 -or $response.StatusCode -eq 403) {
        Write-Host "  ✓ Auth API reachable (expected 401/403 without session)" -ForegroundColor Green
    } elseif ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Auth API reachable (HTTP 200)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Auth API responded with HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    # 401/403 is thrown as an exception by Invoke-WebRequest, which is actually good
    if ($_.Exception.Response.StatusCode.value__ -eq 401 -or $_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "  ✓ Auth API reachable (expected 401/403 without session)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Auth API test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 3: Storage API
Write-Host "▶ Testing Storage API endpoint..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    }

    $response = Invoke-WebRequest -Uri "$supabaseUrl/storage/v1/bucket" -Method GET -Headers $headers -TimeoutSec 10 -ErrorAction SilentlyContinue

    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Storage API reachable (HTTP 200)" -ForegroundColor Green

        # Try to parse bucket list
        try {
            $buckets = $response.Content | ConvertFrom-Json
            Write-Host "  ℹ Found $($buckets.Count) storage buckets" -ForegroundColor Cyan

            $requiredBuckets = @("audio-uploads", "transcripts", "exhibits")
            $foundBuckets = @()

            foreach ($bucket in $buckets) {
                $foundBuckets += $bucket.name
                Write-Host "    - $($bucket.name)" -ForegroundColor Gray
            }

            Write-Host ""
            Write-Host "  Required buckets check:" -ForegroundColor Yellow
            foreach ($required in $requiredBuckets) {
                if ($foundBuckets -contains $required) {
                    Write-Host "    ✓ $required" -ForegroundColor Green
                } else {
                    Write-Host "    ✗ $required (MISSING)" -ForegroundColor Red
                }
            }
        } catch {
            Write-Host "  ⚠ Could not parse bucket list" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ⚠ Storage API responded with HTTP $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 401 -or $_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "  ⚠ Storage API requires authentication (buckets need to be checked manually)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✗ Storage API test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Database Connection (via REST API)
Write-Host "▶ Testing Database connection..." -ForegroundColor Yellow
try {
    $headers = @{
        "apikey" = $anonKey
        "Authorization" = "Bearer $anonKey"
    }

    # Try to query a common table (will fail with RLS, but proves connection works)
    $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/users?select=count" -Method GET -Headers $headers -TimeoutSec 10 -ErrorAction SilentlyContinue

    Write-Host "  ✓ Database connection working (PostgREST responding)" -ForegroundColor Green
} catch {
    # Even errors indicate the connection is working
    if ($_.Exception.Response) {
        Write-Host "  ✓ Database connection working (PostgREST responding)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 5: Check if dev server is running
Write-Host "▶ Checking local dev server..." -ForegroundColor Yellow
try {
    $localResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
    Write-Host "  ✓ Local dev server is running on http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Local dev server is not running" -ForegroundColor Yellow
    Write-Host "    Run: npm run dev" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  NEXT STEPS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Review the Supabase Dashboard settings:" -ForegroundColor White
Write-Host "   See: SUPABASE_DASHBOARD_CHECKLIST.md" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Verify redirect URLs in Supabase Dashboard:" -ForegroundColor White
Write-Host "   Authentication → URL Configuration → Redirect URLs" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test password reset flow:" -ForegroundColor White
Write-Host "   a. Go to http://localhost:3000/forgot-password" -ForegroundColor Gray
Write-Host "   b. Enter your email" -ForegroundColor Gray
Write-Host "   c. Check email for reset link" -ForegroundColor Gray
Write-Host "   d. Click link (should go to /reset-password)" -ForegroundColor Gray
Write-Host "   e. Set new password" -ForegroundColor Gray
Write-Host ""
Write-Host "4. If password reset link shows 'invalid or expired':" -ForegroundColor White
Write-Host "   - Add http://localhost:3000/auth/callback to redirect URLs" -ForegroundColor Gray
Write-Host "   - Add http://localhost:3000/reset-password to redirect URLs" -ForegroundColor Gray
Write-Host "   - Request a NEW reset email (old links won't work)" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
