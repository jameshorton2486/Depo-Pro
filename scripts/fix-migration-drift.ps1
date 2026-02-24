# =============================================================================
# DEPO-PRO MIGRATION DRIFT REPAIR SCRIPT
# Run after deleting malformed migration files (8-digit timestamp prefixes)
# =============================================================================
# Usage: .\scripts\fix-migration-drift.ps1
# Prereq: Must be run from repo root, with Supabase CLI linked to your project
# =============================================================================

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  MIGRATION DRIFT REPAIR" -ForegroundColor Cyan
Write-Host "  Removing ghost entries from supabase_migrations.schema_migrations" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$malformedVersions = @("20260209", "20260211", "20260212", "20260213")

foreach ($version in $malformedVersions) {
    Write-Host "  Repairing version: $version ..." -ForegroundColor Yellow
    try {
        supabase migration repair --status reverted $version
        Write-Host "  [OK] $version marked as reverted" -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] $version - $_" -ForegroundColor DarkYellow
    }
}

Write-Host ""
Write-Host "── Verifying state ──" -ForegroundColor Yellow
supabase migration list

Write-Host ""
Write-Host "Done. Run 'supabase db pull' if you need to sync schema from remote." -ForegroundColor Cyan
Write-Host ""
