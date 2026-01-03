# =============================================================================
# NORMALIZE LINE ENDINGS
# normalize-line-endings.ps1
#
# Converts all text files to LF line endings (Unix-style)
# This prevents the "299 files changed" issue on Windows
# =============================================================================

Write-Host "=== Normalizing Line Endings ===" -ForegroundColor Cyan
Write-Host "Converting CRLF to LF for all text files..." -ForegroundColor Yellow
Write-Host ""

$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx", "*.json", "*.md", "*.css", "*.scss", "*.html", "*.yml", "*.yaml", "*.txt", "*.ps1", "*.sh")

$fileCount = 0
$errorCount = 0

foreach ($ext in $extensions) {
    $files = Get-ChildItem -Path . -Include $ext -Recurse -File | Where-Object {
        $_.FullName -notmatch "node_modules" -and
        $_.FullName -notmatch "\.next" -and
        $_.FullName -notmatch "dist" -and
        $_.FullName -notmatch "\.git" -and
        $_.FullName -notmatch "backup"
    }

    foreach ($file in $files) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
            $normalized = $content -replace "`r`n", "`n" -replace "`r", "`n"
            
            if ($content -ne $normalized) {
                Set-Content -Path $file.FullName -Value $normalized -NoNewline -Encoding UTF8
                $fileCount++
                Write-Host "  ✓ $($file.Name)" -ForegroundColor Green
            }
        } catch {
            $errorCount++
            Write-Host "  ✗ Error processing $($file.Name): $_" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Normalization Complete ===" -ForegroundColor Cyan
Write-Host "Files normalized: $fileCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Errors: $errorCount" -ForegroundColor Red
}
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Save all files in your editor (Ctrl+K S in VS Code/Cursor)" -ForegroundColor White
Write-Host "2. Review changes: git status" -ForegroundColor White
Write-Host "3. If only line endings changed, commit: git add -A && git commit -m 'chore: normalize line endings'" -ForegroundColor White
