# Quick fix for syntax error in app/api/jobs/route.ts
# Run from depo-pro directory

Write-Host "Fixing syntax error in app/api/jobs/route.ts..." -ForegroundColor Cyan

$filePath = "app/api/jobs/route.ts"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Fix the broken line - remove "for now" text
$content = $content -replace "firmId: firmId \|\| '',\s*for now", "firmId: firmId || '',"

Set-Content -Path $filePath -Value $content -Encoding UTF8
Write-Host "[OK] Fixed syntax error" -ForegroundColor Green

git add $filePath
Write-Host "[OK] Staged changes" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: npm run typecheck" -ForegroundColor Yellow
