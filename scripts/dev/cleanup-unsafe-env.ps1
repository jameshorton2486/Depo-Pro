# =============================================================================
# Cleanup Unsafe Environment Files
# =============================================================================
# This script removes unsafe .env files that pose security risks
# =============================================================================

Write-Host "🔒 Cleaning up unsafe environment files..." -ForegroundColor Cyan
Write-Host ""

$unsafeFiles = @(
    ".env",
    ".env.local.backup",
    ".env.production",
    ".env.backup",
    ".env.old"
)

$removed = @()
$notFound = @()

foreach ($file in $unsafeFiles) {
    if (Test-Path $file) {
        Write-Host "⚠️  Found unsafe file: $file" -ForegroundColor Yellow
        $confirm = Read-Host "Remove $file? (y/N)"
        
        if ($confirm -eq "y" -or $confirm -eq "Y") {
            Remove-Item $file -Force
            $removed += $file
            Write-Host "  ✅ Removed: $file" -ForegroundColor Green
        } else {
            Write-Host "  ⏭️  Skipped: $file" -ForegroundColor Gray
        }
    } else {
        $notFound += $file
    }
}

Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan

if ($removed.Count -gt 0) {
    Write-Host "  ✅ Removed files:" -ForegroundColor Green
    foreach ($file in $removed) {
        Write-Host "     - $file" -ForegroundColor Green
    }
}

if ($notFound.Count -gt 0) {
    Write-Host "  ℹ️  Files not found (already clean):" -ForegroundColor Gray
    foreach ($file in $notFound) {
        Write-Host "     - $file" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "✅ Safe files (should remain):" -ForegroundColor Green
Write-Host "   - .env.local (your actual secrets - in .gitignore)" -ForegroundColor Green
Write-Host "   - .env.example (template - safe to commit)" -ForegroundColor Green

Write-Host ""
Write-Host "🔒 Security reminder:" -ForegroundColor Yellow
Write-Host "   - Never commit .env.local to git" -ForegroundColor Yellow
Write-Host "   - Use .env.example as the template" -ForegroundColor Yellow
Write-Host "   - Store production keys in Vercel/cloud provider only" -ForegroundColor Yellow
