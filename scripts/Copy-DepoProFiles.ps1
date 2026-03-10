# ==========================================================
# Depo-Pro File Copier v3
# Copies files created today from Downloads into the repo
# ==========================================================
# USAGE
#   Normal run:    .\Copy-DepoProFiles.ps1
#   Dry run:       .\Copy-DepoProFiles.ps1 -DryRun
#   Custom date:   .\Copy-DepoProFiles.ps1 -Date "2026-03-08"
#   Custom repo:   .\Copy-DepoProFiles.ps1 -Repo "C:\Projects\depo-pro"
#   Overwrite:     .\Copy-DepoProFiles.ps1 -Overwrite
# ==========================================================

param (
    [string]$Repo      = "$env:USERPROFILE\depo-pro",
    [string]$Date      = "",
    [switch]$DryRun    = $false,
    [switch]$Overwrite = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$downloads  = "$env:USERPROFILE\Downloads"
$extensions = @("*.md","*.ts","*.tsx","*.sql","*.ps1","*.sh","*.json")
$targetDate = if ($Date -ne "") { [datetime]::Parse($Date).Date } else { (Get-Date).Date }

$routes = [ordered]@{
    "CORE_ARCHITECTURE_RULES|AI_CONTEXT|FROZEN_FILES|BETA_FREEZE_RULES" = "ai_prompts\architecture"
    "BETA_FREEZE|BETA_LAUNCH_CHECKLIST|REVIEW_NEEDED|BUGS_FOUND"        = "."

    "DEPO_PRO_(DATABASE_)?SCHEMA|DEPO_PRO_SYSTEM_BLUEPRINT|DEPO_PRO_FORMATTER|DEPO_PRO_RULE_ENGINE" = "docs\specs"
    "Database.Schema.Blueprint|Platform.Blueprint|FORMATTER_SPEC|RULE_ENGINE"                       = "docs\specs"

    "phase_0[0-9]|phase_1[0-9]|formatter_foundation|transcript_editor"  = "ai_prompts\phases"

    "AUTONOMOUS_MEGA_PROMPT|repair|autonomous_repo" = "ai_prompts\repair"

    "UI_UX|UX_OVERHAUL|PAGE_INVENTORY|SaaS_PAGE_Architecture" = "ai_prompts\ui"
    "PRODUCT_UX|DASHBOARD_SYSTEM|WORLD.CLASS|Navigation.Architecture"   = "ai_prompts\ui"
    "MASTER.PRODUCT.ARCHITECT|SaaS.PRODUCT.DESIGN|UX.TRANSFORMATION"    = "ai_prompts\ui"

    "^\d{8}_\d{3}_.*\.sql$" = "supabase\migrations"
    "\.sql$"                = "supabase\migrations"

    "\.test\.|\.spec\." = "tests"

    "\.(ps1|sh)$" = "scripts"

    "audit|phase\d+_log|PREFLIGHT|preflight" = "ai_logs"
}

$fallback = "."

function Write-Status {
    param([string]$Icon, [string]$Color, [string]$Message)
    Write-Host "  $Icon  " -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

function Resolve-Destination {
    param([string]$FileName)
    foreach ($pattern in $routes.Keys) {
        if ($FileName -match $pattern) {
            return $routes[$pattern]
        }
    }
    return $null
}

function Get-SafeDestPath {
    param([string]$DestDir, [string]$FileName)
    $destPath = Join-Path $DestDir $FileName
    if (-not (Test-Path $destPath)) { return $destPath }
    if ($Overwrite) { return $destPath }

    $base      = [System.IO.Path]::GetFileNameWithoutExtension($FileName)
    $ext       = [System.IO.Path]::GetExtension($FileName)
    $timestamp = Get-Date -Format "HHmmss"
    return Join-Path $DestDir "${base}_${timestamp}${ext}"
}

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "  ║       Depo-Pro File Copier v3               ║" -ForegroundColor Cyan
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Repo:      $Repo"
Write-Host "  Downloads: $downloads"
Write-Host "  Date:      $($targetDate.ToString('yyyy-MM-dd'))"
if ($DryRun)    { Write-Host "  Mode:      " -NoNewline; Write-Host "DRY RUN - no files will be copied" -ForegroundColor Yellow }
if ($Overwrite) { Write-Host "  Mode:      " -NoNewline; Write-Host "OVERWRITE - existing files will be replaced" -ForegroundColor Yellow }
Write-Host ""

if (-not (Test-Path $Repo)) {
    Write-Host "  ERROR: Repo not found at: $Repo" -ForegroundColor Red
    Write-Host "         Run with -Repo 'C:\your\path' to specify a different location."
    exit 1
}

Write-Host "  Scanning Downloads for files created $($targetDate.ToString('yyyy-MM-dd'))..."
Write-Host ""

$files = Get-ChildItem -Path $downloads -Recurse -Include $extensions -ErrorAction SilentlyContinue |
    Where-Object { $_.CreationTime.Date -eq $targetDate }

if ($files.Count -eq 0) {
    Write-Host "  No matching files found." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Tips:"
    Write-Host "    * Downloads uses CreationTime, not LastWriteTime."
    Write-Host "      If you moved a file into Downloads today, it may not match."
    Write-Host "    * Try: .\Copy-DepoProFiles.ps1 -Date '$(($targetDate.AddDays(-1)).ToString('yyyy-MM-dd'))'"
    exit 0
}

Write-Host "  Found $($files.Count) file(s):" -ForegroundColor Green
Write-Host ""

$copied         = 0
$renamed        = 0
$unmatched      = 0
$errors         = 0
$unmatchedFiles = @()

foreach ($file in $files) {
    try {
        $relDest = Resolve-Destination -FileName $file.Name
        $wasUnmatched = ($null -eq $relDest)

        if ($wasUnmatched) {
            $relDest = $fallback
            $unmatched++
            $unmatchedFiles += $file.Name
        }

        $absDir = Join-Path $Repo $relDest

        if (-not (Test-Path $absDir)) {
            if (-not $DryRun) {
                New-Item -ItemType Directory -Path $absDir -Force | Out-Null
            }
            Write-Status "" "DarkYellow" "Created: $relDest"
        }

        $destPath = Get-SafeDestPath -DestDir $absDir -FileName $file.Name
        $destFile = Split-Path $destPath -Leaf
        $wasRenamed = ($destFile -ne $file.Name)

        if ($wasUnmatched) {
            Write-Status "?" "Magenta" "$($file.Name) -> $relDest\  [no routing match - add pattern to `$routes]"
        } elseif ($wasRenamed) {
            Write-Status "!" "Yellow" "$($file.Name) -> $relDest\$destFile  [collision - renamed]"
            $renamed++
        } else {
            Write-Status "+" "Green" "$($file.Name) -> $relDest\"
        }

        if (-not $DryRun) {
            Copy-Item $file.FullName $destPath -Force
        }
        $copied++
    }
    catch {
        Write-Status "x" "Red" "FAILED: $($file.Name) - $($_.Exception.Message)"
        $errors++
    }
}

Write-Host ""
Write-Host "  ---------------------------------------------"

if ($DryRun) {
    Write-Host "  DRY RUN complete. No files were written." -ForegroundColor Yellow
    Write-Host "  Would have copied: $copied file(s)"
} else {
    Write-Host "  Copied:  $copied file(s)" -ForegroundColor Green
    if ($renamed -gt 0) {
        Write-Host "  Renamed: $renamed file(s) - run with -Overwrite to replace instead" -ForegroundColor Yellow
    }
    if ($errors -gt 0) {
        Write-Host "  Errors:  $errors file(s) - check output above" -ForegroundColor Red
    }
}

if ($unmatched -gt 0) {
    Write-Host ""
    Write-Host "  !  $unmatched file(s) had no routing match (sent to repo root):" -ForegroundColor Magenta
    foreach ($name in $unmatchedFiles) {
        Write-Host "       * $name" -ForegroundColor Magenta
    }
    Write-Host ""
    Write-Host "  To fix: add a pattern to the `$routes table in this script." -ForegroundColor Magenta
}

Write-Host ""
