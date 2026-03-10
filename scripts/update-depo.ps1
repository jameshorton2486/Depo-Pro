# ==========================================================
# Depo-Pro Project Update Script v2
# Copies new files from Downloads into the Depo-Pro repo
# and commits them to GitHub
# ==========================================================
# USAGE:
#   .\scripts\update-depo.ps1
#   .\scripts\update-depo.ps1 -DryRun
#   .\scripts\update-depo.ps1 -SkipBuild
#   .\scripts\update-depo.ps1 -Repo "C:\Projects\depo-pro"
# ==========================================================

param(
    [string]$Repo = "$env:USERPROFILE\depo-pro",
    [switch]$DryRun = $false,
    [switch]$SkipBuild = $false
)

$downloads = "$env:USERPROFILE\Downloads"

$today = (Get-Date).Date

Write-Host ""
Write-Host "Depo-Pro Update Script"
Write-Host "Scanning Downloads for today's files..."
Write-Host ""

# File types we care about
$extensions = "*.md","*.ts","*.tsx","*.sql","*.ps1","*.json","*.sh"

$files = Get-ChildItem -Path $downloads -Recurse -Include $extensions |
Where-Object { $_.CreationTime.Date -eq $today }

if ($files.Count -eq 0) {
    Write-Host "No files created today."
    exit
}

Write-Host "$($files.Count) files found"
Write-Host ""

# ==========================================================
# Project folders
# ==========================================================

$folders = @{
    architecture = "$repo\ai_prompts\architecture"
    specs = "$repo\docs\specs"
    phases = "$repo\ai_prompts\phases"
    tests = "$repo\tests"
    scripts = "$repo\scripts"
}

foreach ($path in $folders.Values) {
    if (!(Test-Path $path)) {
        if ($DryRun) {
            Write-Host "Would create folder: $path"
        } else {
            Write-Host "Creating folder: $path"
            New-Item -ItemType Directory -Path $path | Out-Null
        }
    }
}

# ==========================================================
# Copy Files
# ==========================================================

foreach ($file in $files) {

    $destination = $repo

    if ($file.Name -match "ARCHITECTURE|AI_CONTEXT") {
        $destination = $folders.architecture
    }
    elseif ($file.Name -match "SPEC|SCHEMA|BLUEPRINT") {
        $destination = $folders.specs
    }
    elseif ($file.Name -match "phase|formatter") {
        $destination = $folders.phases
    }
    elseif ($file.Name -match "test") {
        $destination = $folders.tests
    }
    elseif ($file.Extension -eq ".ps1" -or $file.Extension -eq ".sh") {
        $destination = $folders.scripts
    }

    $destPath = Join-Path $destination $file.Name

    if (-not $DryRun) {
        Copy-Item $file.FullName $destPath -Force
    }
    Write-Host $(if ($DryRun) { "Would copy" } else { "Copied" }): "$($file.Name) -> $destination"
}

Write-Host ""
Write-Host "File copy complete."
Write-Host ""

# ==========================================================
# Git Commit & Push
# ==========================================================

if ($DryRun) {
    Write-Host "Dry run complete. No files copied, no Git operations."
    exit
}

if (!(Test-Path "$repo\.git")) {
    Write-Host "Git repo not detected. Skipping Git step."
    exit
}

Set-Location $repo

# Run lint/build before commit to prevent broken pushes
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Running pre-commit checks (lint + build)..."
    $lintResult = npm run lint 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Lint failed. Fix errors before committing." -ForegroundColor Red
        Write-Host $lintResult
        exit 1
    }
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Build failed. Fix errors before committing." -ForegroundColor Red
        Write-Host $buildResult
        exit 1
    }
    Write-Host "Pre-commit checks passed." -ForegroundColor Green
}

git add .
$status = git status --porcelain
if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host ""
    Write-Host "No changes to commit (working tree clean)."
    exit
}

$commitMessage = "docs: add architecture specs and formatter prompts $(Get-Date -Format yyyy-MM-dd)"
git commit -m $commitMessage
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git commit failed." -ForegroundColor Red
    exit 1
}

git push
if ($LASTEXITCODE -ne 0) {
    Write-Host "Git push failed. Run 'git push' manually if needed." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Git push complete." -ForegroundColor Green
Write-Host ""
