param (
    [string]$Repo = "$env:USERPROFILE\depo-pro",
    [switch]$DryRun = $false
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "  > $Message" -ForegroundColor Cyan
}

function Write-Ok {
    param([string]$Message)
    Write-Host "  + $Message" -ForegroundColor Green
}

function Write-Skip {
    param([string]$Message)
    Write-Host "  - $Message" -ForegroundColor DarkGray
}

function Ensure-Directory {
    param([string]$Path)
    if (Test-Path $Path) {
        Write-Skip "Exists: $Path"
        return
    }

    if (-not $DryRun) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }

    Write-Ok "Created directory: $Path"
}

function Ensure-File {
    param(
        [string]$Path,
        [string]$Content
    )

    if (Test-Path $Path) {
        Write-Skip "Exists: $Path"
        return
    }

    if (-not $DryRun) {
        Set-Content -Path $Path -Value $Content -Encoding UTF8
    }

    Write-Ok "Created file: $Path"
}

if (-not (Test-Path $Repo)) {
    Write-Host "Repo not found: $Repo" -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '  Depo-Pro Environment Setup' -ForegroundColor Cyan
Write-Host "  Repo: $Repo"
if ($DryRun) {
    Write-Host '  Mode: DRY RUN' -ForegroundColor Yellow
}
Write-Host ''

$directories = @(
    "$Repo\ai_prompts",
    "$Repo\ai_prompts\architecture",
    "$Repo\ai_prompts\phases",
    "$Repo\docs",
    "$Repo\docs\architecture",
    "$Repo\docs\specs",
    "$Repo\lib\transcription",
    "$Repo\lib\transcription\formatter",
    "$Repo\tests",
    "$Repo\tests\unit",
    "$Repo\tests\unit\formatter",
    "$Repo\tests\integration",
    "$Repo\tests\fixtures",
    "$Repo\ai_logs"
)

Write-Step 'Ensuring directory structure'
foreach ($directory in $directories) {
    Ensure-Directory $directory
}

$placeholder = @'
Placeholder scaffold created by Setup-DepoProEnvironment.ps1.
Replace with repository-specific content if needed.
'@

Write-Step 'Ensuring core context files exist'
Ensure-File "$Repo\ai_prompts\architecture\CORE_ARCHITECTURE_RULES.md" $placeholder
Ensure-File "$Repo\ai_prompts\architecture\AI_CONTEXT.md" $placeholder
Ensure-File "$Repo\docs\specs\DEPO_PRO_SYSTEM_BLUEPRINT.md" $placeholder
Ensure-File "$Repo\docs\specs\DEPO_PRO_DATABASE_SCHEMA.md" $placeholder
Ensure-File "$Repo\docs\specs\DEPO_PRO_FORMATTER_SPEC.md" $placeholder

Write-Host ''
Write-Host '  Setup complete.' -ForegroundColor Green
