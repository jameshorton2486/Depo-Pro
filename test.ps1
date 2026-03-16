# Depo-Pro Full Test Suite
# Run: .\test
# Or:  powershell -ExecutionPolicy Bypass -File test.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "  Depo-Pro Full Test Suite" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# Phase 0: TypeScript check
Write-Host "[1/5] TypeScript check..." -ForegroundColor Cyan
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: TypeScript errors found" -ForegroundColor Red
    exit 1
}
Write-Host "  PASSED" -ForegroundColor Green
Write-Host ""

# Phase 1: API connection check
Write-Host "[2/5] API connection check..." -ForegroundColor Cyan
npx tsx scripts/check-api-connections.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: API connections broken" -ForegroundColor Red
    Write-Host "  Fix the connections above, then re-run .\test" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Phase 2: ESLint
Write-Host "[3/5] ESLint..." -ForegroundColor Cyan
npm run lint 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Lint errors" -ForegroundColor Red
    npm run lint
    exit 1
}
Write-Host "  PASSED" -ForegroundColor Green
Write-Host ""

# Phase 3: Unit + integration tests
Write-Host "[4/5] Vitest (unit + integration)..." -ForegroundColor Cyan
npm test -- --reporter=verbose
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Test failures above" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Phase 4: Build
Write-Host "[5/5] Production build..." -ForegroundColor Cyan
npm run build 2>&1 | Select-Object -Last 5
if ($LASTEXITCODE -ne 0) {
    Write-Host "  FAILED: Build errors" -ForegroundColor Red
    exit 1
}
Write-Host "  PASSED" -ForegroundColor Green

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Safe to deploy: git push origin main" -ForegroundColor White
Write-Host ""
