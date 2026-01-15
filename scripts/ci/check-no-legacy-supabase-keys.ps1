# PowerShell version for Windows CI
# Checks for legacy Supabase anon key usage

Write-Host "🔍 Checking for legacy Supabase anon key usage..." -ForegroundColor Cyan

$patterns = @(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "anon key",
    "anonymous key",
    "eyJhbGci"
)

$excludePatterns = @(
    "*.md",
    "*archive*",
    "*diagnostics*",
    "*_archive*",
    "node_modules",
    ".next"
)

$found = $false
$files = @()

# Search in active code directories
$searchPaths = @("lib", "app", "scripts", "middleware.ts", "types")

foreach ($path in $searchPaths) {
    if (Test-Path $path) {
        $results = Select-String -Path $path -Recurse -Pattern ($patterns -join "|") -CaseSensitive:$false `
            | Where-Object {
                $filePath = $_.Path
                $shouldExclude = $false
                foreach ($exclude in $excludePatterns) {
                    if ($filePath -like "*$exclude*") {
                        $shouldExclude = $true
                        break
                    }
                }
                -not $shouldExclude
            }

        if ($results) {
            $found = $true
            $files += $results
        }
    }
}

if ($found) {
    Write-Host ""
    Write-Host "❌ ERROR: Legacy Supabase anon/JWT key usage detected." -ForegroundColor Red
    Write-Host "❌ Remove all references and use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY instead." -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Files with issues:" -ForegroundColor Yellow
    $files | ForEach-Object {
        Write-Host "   $($_.Path):$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Red
    }
    Write-Host ""
    exit 1
}

Write-Host "✅ No legacy Supabase keys found in active code." -ForegroundColor Green
exit 0
