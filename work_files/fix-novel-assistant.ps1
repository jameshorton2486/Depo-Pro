<#
.SYNOPSIS
    Novel Assistant Repository Fix Script
    
.DESCRIPTION
    This script fixes all issues identified in the code review:
    - Replaces corrupted/wrong files with corrected versions
    - Deletes files that shouldn't be in the repo
    - Adds missing files
    - Commits and pushes changes to GitHub
    
.NOTES
    Run this from: C:\Users\james\novel_assistant\work_files\
    The repo should be at: C:\Users\james\novel_assistant\
    The fixes folder should be at: C:\Users\james\novel_assistant\work_files\fixes\
#>

param(
    [switch]$SkipGitPush,
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Success { param($msg) Write-Host $msg -ForegroundColor Green }
function Write-Info { param($msg) Write-Host $msg -ForegroundColor Cyan }
function Write-Warn { param($msg) Write-Host $msg -ForegroundColor Yellow }
function Write-Err { param($msg) Write-Host $msg -ForegroundColor Red }

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  NOVEL ASSISTANT - REPOSITORY FIXER   " -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# Paths - updated for work_files location
$repoPath = ".."                    # Parent directory (novel_assistant)
$fixesPath = ".\fixes"              # Fixes folder in current directory

Write-Info "Current directory: $(Get-Location)"
Write-Info "Repo path: $((Resolve-Path $repoPath -ErrorAction SilentlyContinue).Path)"
Write-Info "Fixes path: $((Resolve-Path $fixesPath -ErrorAction SilentlyContinue).Path)"
Write-Host ""

# Check if we're in the right place
if (-not (Test-Path "$repoPath\main.py")) {
    Write-Err "ERROR: Cannot find 'main.py' in parent directory."
    Write-Err "Make sure you're running this from: C:\Users\james\novel_assistant\work_files\"
    Write-Info "Current directory: $(Get-Location)"
    exit 1
}

if (-not (Test-Path $fixesPath)) {
    Write-Err "ERROR: Cannot find 'fixes' folder in current directory."
    Write-Info "Make sure you extracted all the fix files to work_files\"
    exit 1
}

# Confirmation
if (-not $Force) {
    Write-Warn "This script will modify your novel_assistant repository:"
    Write-Host ""
    Write-Host "  FILES TO DELETE:" -ForegroundColor Red
    Write-Host "    - AI_AGENT_TASKS.md (Kollect-It content)"
    Write-Host "    - .idea/ folder (IDE files)"
    Write-Host "    - .github/copilot-instructions.md (empty)"
    Write-Host "    - agent/agent_core.md (placeholder)"
    Write-Host "    - examples/sample_workflow.md (empty)"
    Write-Host ""
    Write-Host "  FILES TO REPLACE:" -ForegroundColor Yellow
    Write-Host "    - README.md (remove Kollect-It content)"
    Write-Host "    - .gitignore (add .idea/ exclusion)"
    Write-Host "    - .env.example (add example values)"
    Write-Host "    - requirements.txt (add version pins)"
    Write-Host "    - agent/claude_client.py (fix model name)"
    Write-Host "    - agent/agent_core.py (remove duplicates)"
    Write-Host ""
    Write-Host "  FILES TO ADD:" -ForegroundColor Green
    Write-Host "    - agent/__init__.py"
    Write-Host "    - gui/__init__.py"
    Write-Host ""
    
    $confirm = Read-Host "Continue? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Info "Aborted."
        exit 0
    }
}

Write-Host ""
Write-Info "Starting repository fixes..."
Write-Host ""

# Step 1: Delete files/folders that shouldn't exist
Write-Info "[1/4] Deleting incorrect files..."

$toDelete = @(
    "$repoPath\AI_AGENT_TASKS.md",
    "$repoPath\.idea",
    "$repoPath\.github\copilot-instructions.md",
    "$repoPath\agent\agent_core.md",
    "$repoPath\examples\sample_workflow.md"
)

foreach ($item in $toDelete) {
    if (Test-Path $item) {
        Remove-Item -Path $item -Recurse -Force
        Write-Success "  Deleted: $item"
    } else {
        Write-Host "  Skipped (not found): $item" -ForegroundColor Gray
    }
}

# Step 2: Copy fixed files
Write-Host ""
Write-Info "[2/4] Copying fixed files..."

# Root level files
$rootFiles = @(
    "README.md",
    ".gitignore",
    ".env.example",
    "requirements.txt"
)

foreach ($file in $rootFiles) {
    $src = "$fixesPath\$file"
    $dst = "$repoPath\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Success "  Replaced: $file"
    } else {
        Write-Warn "  Source not found: $src"
    }
}

# Agent folder files
$agentFiles = @(
    "agent\__init__.py",
    "agent\claude_client.py",
    "agent\agent_core.py"
)

foreach ($file in $agentFiles) {
    $src = "$fixesPath\$file"
    $dst = "$repoPath\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Success "  Replaced: $file"
    } else {
        Write-Warn "  Source not found: $src"
    }
}

# GUI folder files
$guiFiles = @(
    "gui\__init__.py"
)

foreach ($file in $guiFiles) {
    $src = "$fixesPath\$file"
    $dst = "$repoPath\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination $dst -Force
        Write-Success "  Added: $file"
    } else {
        Write-Warn "  Source not found: $src"
    }
}

# Step 3: Git operations
Write-Host ""
Write-Info "[3/4] Staging changes in git..."

Push-Location $repoPath

try {
    # Stage all changes
    git add -A
    Write-Success "  Changes staged"
    
    # Show status
    Write-Host ""
    Write-Info "Git status:"
    git status --short
    
    # Commit
    Write-Host ""
    Write-Info "[4/4] Committing changes..."
    git commit -m "Fix: Remove Kollect-It contamination and add missing files

- Removed AI_AGENT_TASKS.md (wrong project)
- Removed .idea/ folder (IDE files)
- Fixed README.md (removed Kollect-It content)
- Fixed claude_client.py (corrected model name)
- Fixed agent_core.py (removed duplicate code)
- Added __init__.py files to agent/ and gui/
- Updated .gitignore to exclude IDE files
- Updated .env.example with example values
- Updated requirements.txt with version pins"
    
    Write-Success "  Changes committed"
    
    # Push (unless skipped)
    if (-not $SkipGitPush) {
        Write-Host ""
        $pushConfirm = Read-Host "Push to GitHub? (Y/n)"
        if ($pushConfirm -ne "n" -and $pushConfirm -ne "N") {
            Write-Info "Pushing to origin..."
            git push
            Write-Success "  Pushed to GitHub!"
        } else {
            Write-Info "  Skipped push. Run 'git push' manually when ready."
        }
    } else {
        Write-Info "  Push skipped (-SkipGitPush was specified)"
    }
    
} catch {
    Write-Err "Git operation failed: $_"
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  REPOSITORY FIX COMPLETE!             " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Your novel_assistant repository has been cleaned up."
Write-Info "All Kollect-It contamination has been removed."
Write-Host ""
Write-Warn "NOTE: You can delete the work_files folder after verifying everything works."
Write-Host ""
