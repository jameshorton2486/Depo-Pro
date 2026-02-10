# =============================================================================
# After v1.3 schema is deployed: regenerate types, verify, commit
# Run from repo root: .\scripts\deploy-v13-regenerate-types.ps1
# =============================================================================

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

$projectId = "ildhcfspbmhuemzgvzyx"
$typesPath = "types/supabase-generated.ts"

Write-Host "`n--- Step 4: Regenerate Supabase types ---" -ForegroundColor Cyan
& npx supabase gen types typescript --project-id $projectId 2>&1 | Set-Content -Path $typesPath -Encoding utf8
if (-not (Test-Path $typesPath) -or (Get-Item $typesPath).Length -lt 100) {
    Write-Host "ERROR: Type generation failed. Check project-id and Supabase link." -ForegroundColor Red
    exit 1
}
Write-Host "Generated: $typesPath" -ForegroundColor Green

Write-Host "`n--- Step 5: Verify types (typecheck) ---" -ForegroundColor Cyan
& npm run typecheck 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Typecheck failed. Fix type errors before committing." -ForegroundColor Red
    exit 1
}
Write-Host "Typecheck passed." -ForegroundColor Green

# Optional: quick grep for v1.3 tables (if schema has them)
if (Select-String -Path $typesPath -Pattern "flagged_words|transcriptions" -Quiet) {
    Write-Host "v1.3-style tables found in generated types." -ForegroundColor Green
}

Write-Host "`n--- Step 6: Commit regenerated types ---" -ForegroundColor Cyan
& git add $typesPath
$status = & git status --short $typesPath 2>&1
if (-not $status) {
    Write-Host "No changes to types file (already up to date)." -ForegroundColor Yellow
    exit 0
}
& git commit -m "chore: regenerate Supabase types after v1.3 schema deployment"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Commit failed (e.g. pre-commit hook or no changes)." -ForegroundColor Yellow
    exit 1
}
Write-Host "Committed. Push with: git push origin <your-branch>" -ForegroundColor Green
