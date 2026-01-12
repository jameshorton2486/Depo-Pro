# ═══════════════════════════════════════════════════════════════
# SUPABASE CONFIGURATION AUDIT SCRIPT
# ═══════════════════════════════════════════════════════════════
# Comprehensive audit of Supabase settings in code and dashboard
# Run: .\audit-supabase-config.ps1
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPO-PRO SUPABASE CONFIGURATION AUDIT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$script:issuesFound = 0
$script:warnings = 0
$script:passed = 0

function Test-Check {
    param(
        [string]$Name,
        [bool]$Condition,
        [string]$SuccessMessage,
        [string]$FailureMessage,
        [string]$Severity = "Error" # Error or Warning
    )

    Write-Host "▶ $Name" -ForegroundColor Yellow -NoNewline

    if ($Condition) {
        Write-Host " ✓" -ForegroundColor Green
        Write-Host "  $SuccessMessage" -ForegroundColor Gray
        $script:passed++
    } else {
        if ($Severity -eq "Warning") {
            Write-Host " ⚠" -ForegroundColor Yellow
            Write-Host "  WARNING: $FailureMessage" -ForegroundColor Yellow
            $script:warnings++
        } else {
            Write-Host " ✗" -ForegroundColor Red
            Write-Host "  ERROR: $FailureMessage" -ForegroundColor Red
            $script:issuesFound++
        }
    }
    Write-Host ""
}

# ═══════════════════════════════════════════════════════════════
# PART 1: LOCAL ENVIRONMENT CHECKS
# ═══════════════════════════════════════════════════════════════

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  PART 1: Local Environment Configuration" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

# Load .env.local
if (Test-Path ".env.local") {
    $envContent = Get-Content ".env.local" -Raw

    # Extract values
    $supabaseUrl = if ($envContent -match 'NEXT_PUBLIC_SUPABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
    $anonKey = if ($envContent -match 'NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)') { $matches[1].Trim() } else { $null }
    $serviceKey = if ($envContent -match 'SUPABASE_SERVICE_ROLE_KEY=(.+)') { $matches[1].Trim() } else { $null }
    $databaseUrl = if ($envContent -match 'DATABASE_URL=(.+)') { $matches[1].Trim() } else { $null }
    $directUrl = if ($envContent -match 'DIRECT_URL=(.+)') { $matches[1].Trim() } else { $null }
    $nextAuthUrl = if ($envContent -match 'NEXTAUTH_URL=(.+)') { $matches[1].Trim() } else { $null }

    # Check 1: Supabase URL
    Test-Check `
        -Name "Supabase URL" `
        -Condition ($null -ne $supabaseUrl -and $supabaseUrl -match '^https://[a-z]+\.supabase\.co$') `
        -SuccessMessage "Valid: $supabaseUrl" `
        -FailureMessage "Missing or invalid NEXT_PUBLIC_SUPABASE_URL"

    # Check 2: Anon Key
    Test-Check `
        -Name "Anon Key" `
        -Condition ($null -ne $anonKey -and $anonKey.StartsWith("eyJ")) `
        -SuccessMessage "Present and appears valid (JWT format)" `
        -FailureMessage "Missing or invalid NEXT_PUBLIC_SUPABASE_ANON_KEY"

    # Check 3: Service Role Key
    Test-Check `
        -Name "Service Role Key" `
        -Condition ($null -ne $serviceKey -and $serviceKey.StartsWith("eyJ") -and $serviceKey -ne $anonKey) `
        -SuccessMessage "Present and different from anon key" `
        -FailureMessage "Missing or same as anon key"

    # Check 4: Database URL
    Test-Check `
        -Name "Database URL (Pooled)" `
        -Condition ($null -ne $databaseUrl -and $databaseUrl -match 'pooler\.supabase\.com.*6543') `
        -SuccessMessage "Correctly configured with PgBouncer on port 6543" `
        -FailureMessage "Missing or not using pooler connection"

    # Check 5: Direct URL
    Test-Check `
        -Name "Direct URL" `
        -Condition ($null -ne $directUrl -and $directUrl -match 'pooler\.supabase\.com.*5432') `
        -SuccessMessage "Correctly configured for migrations on port 5432" `
        -FailureMessage "Missing or incorrect port"

    # Check 6: NextAuth URL
    Test-Check `
        -Name "NextAuth URL" `
        -Condition ($null -ne $nextAuthUrl -and $nextAuthUrl -match '^https?://') `
        -SuccessMessage "Set to: $nextAuthUrl" `
        -FailureMessage "Missing NEXTAUTH_URL" `
        -Severity "Warning"

    # Extract project ID
    if ($supabaseUrl -match 'https://([a-z]+)\.supabase\.co') {
        $projectId = $matches[1]
        Write-Host "📌 Project ID: $projectId" -ForegroundColor Cyan
        Write-Host ""
    }
} else {
    Write-Host "✗ .env.local file not found!" -ForegroundColor Red
    $script:issuesFound++
}

# ═══════════════════════════════════════════════════════════════
# PART 2: CODE CONFIGURATION CHECKS
# ═══════════════════════════════════════════════════════════════

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  PART 2: Code Implementation Checks" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

# Check 7: Browser client
$browserClient = Get-Content "lib/supabase/browser.ts" -Raw
Test-Check `
    -Name "Browser Client" `
    -Condition ($browserClient -match 'createBrowserClient') `
    -SuccessMessage "Correctly using @supabase/ssr" `
    -FailureMessage "Not using recommended SSR client"

# Check 8: Server client
$serverClient = Get-Content "lib/supabase/server.ts" -Raw
Test-Check `
    -Name "Server Client" `
    -Condition ($serverClient -match 'createServerClient' -and $serverClient -match 'cookies\(\)') `
    -SuccessMessage "Correctly using @supabase/ssr with Next.js cookies" `
    -FailureMessage "Missing proper server client implementation"

# Check 9: Middleware
if (Test-Path "middleware.ts") {
    $middleware = Get-Content "middleware.ts" -Raw
    Test-Check `
        -Name "Middleware Auth" `
        -Condition ($middleware -match 'supabase\.auth\.getUser') `
        -SuccessMessage "Properly checking user authentication" `
        -FailureMessage "Middleware not checking auth correctly"
}

# Check 10: Auth callback route
if (Test-Path "app/auth/callback/route.ts") {
    $callback = Get-Content "app/auth/callback/route.ts" -Raw
    Test-Check `
        -Name "Auth Callback (PKCE)" `
        -Condition ($callback -match 'exchangeCodeForSession') `
        -SuccessMessage "PKCE flow implemented correctly" `
        -FailureMessage "Missing PKCE code exchange"

    Test-Check `
        -Name "Recovery Flow" `
        -Condition ($callback -match "type === 'recovery'" -and $callback -match '/reset-password') `
        -SuccessMessage "Password recovery redirects to /reset-password" `
        -FailureMessage "Recovery flow not properly configured"
}

# Check 11: Forgot password
if (Test-Path "app/(auth)/forgot-password/page.tsx") {
    $forgot = Get-Content "app/(auth)/forgot-password/page.tsx" -Raw
    Test-Check `
        -Name "Forgot Password Redirect" `
        -Condition ($forgot -match 'redirectTo.*auth/callback.*reset-password') `
        -SuccessMessage "Correctly redirects through /auth/callback" `
        -FailureMessage "RedirectTo URL may be misconfigured"
}

# Check 12: Reset password page
if (Test-Path "app/(auth)/reset-password/page.tsx") {
    $reset = Get-Content "app/(auth)/reset-password/page.tsx" -Raw
    Test-Check `
        -Name "Reset Password Implementation" `
    -Condition ($reset -match 'supabase\.auth\.updateUser' -and $reset -match 'password.*data\.password') `
        -SuccessMessage "Correctly calls updateUser with new password" `
        -FailureMessage "Password update not properly implemented"
}

# ═══════════════════════════════════════════════════════════════
# PART 3: SUPABASE DASHBOARD CHECKLIST
# ═══════════════════════════════════════════════════════════════

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  PART 3: Supabase Dashboard Configuration (Manual Check)" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  You must manually verify these settings in the Supabase Dashboard:" -ForegroundColor Yellow
Write-Host ""

if ($projectId) {
    Write-Host "Dashboard URL: https://supabase.com/dashboard/project/$projectId" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  AUTHENTICATION → URL CONFIGURATION" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Site URL" -ForegroundColor Yellow
Write-Host "  Local: http://localhost:3000" -ForegroundColor Gray
Write-Host "  Prod:  https://your-domain.com" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Redirect URLs (Add ALL of these):" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor Gray
Write-Host "  http://localhost:3000/auth/callback" -ForegroundColor Gray
Write-Host "  http://localhost:3000/reset-password" -ForegroundColor Gray
Write-Host "  https://your-domain.com (for production)" -ForegroundColor Gray
Write-Host "  https://your-domain.com/auth/callback (for production)" -ForegroundColor Gray
Write-Host "  https://your-domain.com/reset-password (for production)" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  AUTHENTICATION → EMAIL TEMPLATES" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Confirm Signup Template" -ForegroundColor Yellow
Write-Host "  - Should use {{ .ConfirmationURL }}" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Reset Password Template" -ForegroundColor Yellow
Write-Host "  - Should use {{ .ConfirmationURL }}" -ForegroundColor Gray
Write-Host "  - Links expire in 1 hour by default" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Magic Link Template" -ForegroundColor Yellow
Write-Host "  - Should use {{ .ConfirmationURL }}" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  AUTHENTICATION → PROVIDERS" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Email Provider Enabled" -ForegroundColor Yellow
Write-Host "  - Should be enabled" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Confirm Email" -ForegroundColor Yellow
Write-Host "  - Enabled: Users must confirm email before login" -ForegroundColor Gray
Write-Host "  - Disabled: Users can login immediately" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Secure Email Change" -ForegroundColor Yellow
Write-Host "  - Recommended: Enabled" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  AUTHENTICATION → POLICIES" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Minimum Password Length" -ForegroundColor Yellow
Write-Host "  - Recommended: 8 characters" -ForegroundColor Gray
Write-Host "  - Your code requires: 8+ with uppercase, lowercase, number" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Auto Confirm Users" -ForegroundColor Yellow
Write-Host "  - Development: Can enable for faster testing" -ForegroundColor Gray
Write-Host "  - Production: Should be DISABLED" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  AUTHENTICATION → RATE LIMITS" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Email Rate Limits" -ForegroundColor Yellow
Write-Host "  - Check if too restrictive during testing" -ForegroundColor Gray
Write-Host "  - Default: 3 emails per hour per IP" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  DATABASE → CONNECTION POOLING" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Connection Pooler Enabled" -ForegroundColor Yellow
Write-Host "  - Should be enabled (PgBouncer)" -ForegroundColor Gray
Write-Host "  - Mode: Transaction mode recommended for Prisma" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  STORAGE → BUCKETS" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ Required Buckets" -ForegroundColor Yellow
Write-Host "  - audio-uploads (for deposition audio files)" -ForegroundColor Gray
Write-Host "  - transcripts (for generated transcripts)" -ForegroundColor Gray
Write-Host "  - exhibits (for case exhibits)" -ForegroundColor Gray
Write-Host ""
Write-Host "☐ Bucket Permissions" -ForegroundColor Yellow
Write-Host "  - Check RLS policies are enabled" -ForegroundColor Gray
Write-Host "  - Verify authenticated users can upload" -ForegroundColor Gray
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  PROJECT SETTINGS → API" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "☐ API Keys Match .env.local" -ForegroundColor Yellow
Write-Host "  - Project URL: $supabaseUrl" -ForegroundColor Gray
Write-Host "  - Anon key starts with: eyJ..." -ForegroundColor Gray
Write-Host "  - Service role key starts with: eyJ..." -ForegroundColor Gray
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PART 4: QUICK TESTS
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "  PART 4: Quick Connection Tests" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

if ($supabaseUrl) {
    Write-Host "Testing connection to: $supabaseUrl" -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" -Method GET -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 401) {
            Test-Check `
                -Name "Supabase API Reachable" `
                -Condition $true `
                -SuccessMessage "API endpoint is accessible (HTTP $($response.StatusCode))" `
                -FailureMessage ""
        }
    } catch {
        Test-Check `
            -Name "Supabase API Reachable" `
            -Condition $false `
            -SuccessMessage "" `
            -FailureMessage "Cannot reach Supabase API. Check URL or network." `
            -Severity "Warning"
    }
}

# ═══════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  AUDIT SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Passed:  $script:passed" -ForegroundColor Green
Write-Host "⚠ Warnings: $script:warnings" -ForegroundColor Yellow
Write-Host "✗ Errors:  $script:issuesFound" -ForegroundColor Red
Write-Host ""

if ($script:issuesFound -eq 0 -and $script:warnings -eq 0) {
    Write-Host "🎉 All automated checks passed!" -ForegroundColor Green
    Write-Host "   Don't forget to manually verify the Supabase Dashboard settings above." -ForegroundColor Gray
} elseif ($script:issuesFound -eq 0) {
    Write-Host "⚠️  Some warnings found, but no critical errors." -ForegroundColor Yellow
    Write-Host "   Review warnings and dashboard checklist above." -ForegroundColor Gray
} else {
    Write-Host "❌ Critical issues found. Please fix the errors above." -ForegroundColor Red
    Write-Host "   Then verify Supabase Dashboard settings." -ForegroundColor Gray
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Exit with appropriate code
if ($script:issuesFound -gt 0) {
    exit 1
} else {
    exit 0
}
