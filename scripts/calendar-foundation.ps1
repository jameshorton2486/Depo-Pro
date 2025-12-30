# Calendar & Job Ingestion Foundation Commit Script
# Safe, deterministic, no emojis, Windows-compatible

Write-Host "== Depo-Pro Calendar Foundation Commit ==" -ForegroundColor Cyan

# Ensure we are in a git repo
if (-not (Test-Path .git)) {
    Write-Error "Not in a git repository. Aborting."
    exit 1
}

Write-Host "Resetting index..." -ForegroundColor Yellow
git reset | Out-Null

Write-Host "Staging foundation files..." -ForegroundColor Yellow

git add .cursor
git add docs
git add lib
git add prisma/schema.prisma
git add scripts
git add package.json
git add vercel.json

# Optional compliance artifact
if (Test-Path "docs/CALENDAR_VERIFICATION_REPORT.md") {
    git add docs/CALENDAR_VERIFICATION_REPORT.md
}

Write-Host "Creating foundation commit..." -ForegroundColor Yellow

git commit -m "feat(calendar): foundational calendar, job ingestion, audit, and tenant isolation"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Git commit failed."
    exit 1
}

Write-Host "Commit complete. Current git status:" -ForegroundColor Green
git status
