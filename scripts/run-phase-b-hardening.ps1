# =============================================================================
# DEPO-PRO — Phase B+C Hardening Runner
# =============================================================================
# Prerequisites: Complete manual steps in PHASE_B_HARDENING_MVP_PREP.md first
# Usage: .\scripts\run-phase-b-hardening.ps1
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPO-PRO PHASE B+C — PRE-FLIGHT CHECK" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Gate 1: Supabase migration list
Write-Host "  [1/4] Checking supabase migration list..." -ForegroundColor Yellow
try {
    $migrationOutput = supabase migration list 2>&1 | Out-String
    if ($LASTEXITCODE -ne 0) {
        throw "supabase migration list failed"
    }
    Write-Host "  [OK] Migrations listed" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Run: supabase link --project-ref ildhcfspbmhuemzgvzyx" -ForegroundColor Red
    Write-Host "  See PHASE_B_HARDENING_MVP_PREP.md for manual steps" -ForegroundColor Red
    exit 1
}

# Gate 2: Build
Write-Host "  [2/4] Checking build..." -ForegroundColor Yellow
try {
    $env:NEXT_PUBLIC_SUPABASE_URL = "https://placeholder.supabase.co"
    $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_placeholder"
    $env:SUPABASE_SERVICE_ROLE_KEY = "sb_secret_placeholder"
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "build failed" }
    Write-Host "  [OK] Build passes" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Fix build errors first" -ForegroundColor Red
    exit 1
}

# Gate 3: GitHub secrets (optional)
Write-Host "  [3/4] Checking GitHub secrets..." -ForegroundColor Yellow
try {
    $secrets = gh secret list --repo jameshorton2486/depo-pro 2>&1 | Out-String
    if ($secrets -match "DIRECT_URL" -and $secrets -match "TEST_USER") {
        Write-Host "  [OK] Required secrets present" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Set DIRECT_URL, TEST_USER_A, TEST_USER_B for org-isolation CI" -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "  [WARN] gh not available (skipping)" -ForegroundColor DarkYellow
}

# Gate 4: Migration drift
Write-Host "  [4/4] Checking migration drift..." -ForegroundColor Yellow
try {
    supabase db push --dry-run 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "drift detected" }
    Write-Host "  [OK] No drift" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Fix migration drift before proceeding" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  All pre-flight gates passed. Ready for Phase B hardening." -ForegroundColor Green
Write-Host ""
Write-Host "  Next: Run the Codex mega prompt from PHASE_B_HARDENING_MVP_PREP.md" -ForegroundColor Cyan
Write-Host "  Or paste the full prompt into the Codex/Cursor agent." -ForegroundColor Cyan
Write-Host ""
