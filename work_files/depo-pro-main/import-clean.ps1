# ======================================================
# DEPO-PRO AUTO-IMPORT SCRIPT (CUSTOM FOR JAMES)
# Pre-configured with your specific paths
# ======================================================

Write-Host "DEPO-PRO FILE IMPORT SCRIPT" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# PRE-CONFIGURED PATHS
$sourcePath = "C:\Users\james\Local Sites\ZIP FILES\depo-pro"
$destPath = "C:\Users\james\depo-pro"

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "   Source: $sourcePath" -ForegroundColor White
Write-Host "   Destination: $destPath" -ForegroundColor White
Write-Host ""

# Validate source path exists
if (-Not (Test-Path $sourcePath)) {
    Write-Host "ERROR: Source folder not found!" -ForegroundColor Red
    Write-Host "   Looking for: $sourcePath" -ForegroundColor Red
    Write-Host ""
    Write-Host "   Did you extract depo-pro-complete.zip to a different location?" -ForegroundColor Yellow
    Write-Host "   If yes, please update the path in this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "This will copy files from ZIP to your project." -ForegroundColor Yellow
Write-Host "Existing files will be BACKED UP with .backup extension" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cancelled by user" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Starting file copy..." -ForegroundColor Green
Write-Host ""

# Function to safely copy files
function Safe-Copy {
    param($source, $destination)
    
    # Create parent directory if it doesn't exist
    $parentDir = Split-Path $destination -Parent
    if (-Not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    if (Test-Path $destination) {
        # Backup existing file
        $backupPath = "$destination.backup"
        Write-Host "   [BACKUP] $(Split-Path $destination -Leaf)" -ForegroundColor Yellow
        Copy-Item $destination $backupPath -Force
    }
    
    Copy-Item $source $destination -Force
    Write-Host "   [OK] Copied: $(Split-Path $destination -Leaf)" -ForegroundColor Green
}

# Create directories if they don't exist
$directories = @(
    "prisma",
    "scripts", 
    "src",
    "src\config",
    "src\lib",
    "src\lib\audio",
    "src\lib\deepgram",
    "src\lib\ai",
    "src\lib\storage",
    "src\lib\transcription",
    "src\lib\notifications",
    "src\queue",
    "src\workers",
    "src\routes",
    "src\types",
    "tests"
)

Write-Host "Creating directory structure..." -ForegroundColor Cyan
foreach ($dir in $directories) {
    $fullPath = Join-Path $destPath $dir
    if (-Not (Test-Path $fullPath)) {
        New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
        Write-Host "   [OK] Created: $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Copying configuration files..." -ForegroundColor Cyan

# Copy root config files
$rootFiles = @(
    "package.json",
    "tsconfig.json",
    ".eslintrc.json",
    ".gitignore",
    ".env.example",
    "README.md",
    "AI_AGENT_TASKS.md",
    "PROJECT_SETUP.md"
)

foreach ($file in $rootFiles) {
    $src = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $src) {
        Safe-Copy $src $dest
    } else {
        Write-Host "   [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Copying Prisma files..." -ForegroundColor Cyan

# Copy prisma files
$prismaFiles = @(
    "prisma\schema.prisma",
    "prisma\seed.ts"
)

foreach ($file in $prismaFiles) {
    $src = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $src) {
        Safe-Copy $src $dest
    } else {
        Write-Host "   [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Copying scripts..." -ForegroundColor Cyan

# Copy scripts
$scriptFiles = @(
    "scripts\setup.ps1",
    "scripts\setup.sh",
    "scripts\run-all.ps1",
    "scripts\verify-install.ts"
)

foreach ($file in $scriptFiles) {
    $src = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $src) {
        Safe-Copy $src $dest
    } else {
        Write-Host "   [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Copying source code files..." -ForegroundColor Cyan

# Copy all src files
$srcFiles = @(
    "src\server.ts",
    "src\config\env.ts",
    "src\lib\prisma.ts",
    "src\lib\redis.ts",
    "src\lib\audio\preprocessor.ts",
    "src\lib\deepgram\transcription-config.ts",
    "src\lib\ai\notice-parser.ts",
    "src\lib\transcription\quality-checker.ts",
    "src\queue\index.ts",
    "src\workers\transcription-worker.ts",
    "src\routes\jobs.ts",
    "src\routes\webhooks.ts",
    "src\types\index.ts"
)

foreach ($file in $srcFiles) {
    $src = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $src) {
        Safe-Copy $src $dest
    } else {
        Write-Host "   [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Copying test files..." -ForegroundColor Cyan

# Copy test files
$testFiles = @(
    "tests\smoke.test.ts"
)

foreach ($file in $testFiles) {
    $src = Join-Path $sourcePath $file
    $dest = Join-Path $destPath $file
    
    if (Test-Path $src) {
        Safe-Copy $src $dest
    } else {
        Write-Host "   [SKIP] Not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "FILE IMPORT COMPLETE!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "   All files copied to: $destPath" -ForegroundColor White
Write-Host "   Existing files backed up with .backup extension" -ForegroundColor White
Write-Host "   Directory structure created" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Refresh VS Code (Ctrl+Shift+P -> Reload Window)" -ForegroundColor White
Write-Host "   2. Copy .env.example to .env" -ForegroundColor White
Write-Host "   3. Add your API keys to .env" -ForegroundColor White
Write-Host "   4. Run: .\scripts\setup.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Tip: Check .backup files if anything looks wrong" -ForegroundColor Gray
Write-Host ""
