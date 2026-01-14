# fix-env-format.ps1
# Fixes .env.local file format issues (multi-line keys, etc.)

$envFile = ".env.local"

if (-not (Test-Path $envFile)) {
    Write-Host "❌ $envFile not found. Create it first with your Supabase credentials." -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Checking $envFile format..." -ForegroundColor Yellow

$content = Get-Content $envFile -Raw
$lines = Get-Content $envFile
$fixed = @()
$inMultiLineValue = $false
$currentKey = $null
$currentValue = $null

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    
    # Skip empty lines and comments
    if ($trimmed -eq '' -or $trimmed.StartsWith('#')) {
        $fixed += $line
        continue
    }
    
    # Check if this is a new key=value line
    if ($trimmed -match '^([^=]+)=(.*)$') {
        # Save previous key if we were building a multi-line value
        if ($currentKey -and $inMultiLineValue) {
            $fixed += "$currentKey=$currentValue"
            $currentValue = $null
            $inMultiLineValue = $false
        }
        
        $currentKey = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Check if value appears to be split (starts with key-like string but no =)
        if ($value -and -not $value.Contains('=')) {
            $fixed += "$currentKey=$value"
            $currentKey = $null
        } else {
            # Start building multi-line value
            $currentValue = $value
            $inMultiLineValue = $true
        }
    } elseif ($inMultiLineValue -and $currentKey) {
        # Continuation of multi-line value - append to current value
        $currentValue += $trimmed
    } else {
        # Standalone line - might be a continuation, treat as new line
        $fixed += $line
    }
}

# Save last key if we were building it
if ($currentKey -and $inMultiLineValue) {
    $fixed += "$currentKey=$currentValue"
}

# Check for NEXT_PUBLIC_SUPABASE_ANON_KEY specifically
$anonKeyLine = $fixed | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' }
if ($anonKeyLine) {
    $anonKeyValue = ($anonKeyLine -split '=', 2)[1]
    
    # Check if it contains newlines or is suspiciously short
    if ($anonKeyValue -match "`n" -or $anonKeyValue.Length -lt 200) {
        Write-Host "⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be malformed" -ForegroundColor Yellow
        Write-Host "   Current length: $($anonKeyValue.Length) characters" -ForegroundColor Yellow
        Write-Host "   Expected: 200+ characters on ONE line" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📝 Manual fix required:" -ForegroundColor Cyan
        Write-Host "   1. Open .env.local in your editor" -ForegroundColor Cyan
        Write-Host "   2. Find NEXT_PUBLIC_SUPABASE_ANON_KEY=" -ForegroundColor Cyan
        Write-Host "   3. Ensure the entire key is on ONE line (no line breaks)" -ForegroundColor Cyan
        Write-Host "   4. The key should be 200+ characters long" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY format looks correct" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "✅ Format check complete. If issues found, fix manually in .env.local" -ForegroundColor Green
