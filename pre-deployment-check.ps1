# ═══════════════════════════════════════════════════════════════
# DEPO-PRO PRE-DEPLOYMENT VERIFICATION SCRIPT
# ═══════════════════════════════════════════════════════════════
# This script checks your environment setup before deploying to Vercel
# Run this in VS Code terminal or PowerShell in your project directory

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"

Write-Host "
╔════════════════════════════════════════════════════════════╗
║  DEPO-PRO PRE-DEPLOYMENT VERIFICATION                      ║
║  Checking your setup before Vercel deployment...           ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

$script:issuesFound = 0
$script:warningsFound = 0

# ───────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ───────────────────────────────────────────────────────────────

function Test-EnvVariable {
    param(
        [string]$Name,
        [string]$Pattern,
        [string]$Description,
        [switch]$Required
    )
    
    $value = [Environment]::GetEnvironmentVariable($Name) ?? 
             (Get-Content .env -ErrorAction SilentlyContinue | 
              Select-String "^$Name=" | 
              ForEach-Object { $_.Line.Split('=', 2)[1] })
    
    if (-not $value) {
        if ($Required) {
            Write-Host "  ❌ $Name" -ForegroundColor Red
            Write-Host "     Missing required variable: $Description" -ForegroundColor Gray
            $script:issuesFound++
        } else {
            Write-Host "  ⚠️  $Name" -ForegroundColor Yellow
            Write-Host "     Optional variable not set: $Description" -ForegroundColor Gray
            $script:warningsFound++
        }
        return $false
    }
    
    if ($Pattern -and $value -notmatch $Pattern) {
        Write-Host "  ⚠️  $Name" -ForegroundColor Yellow
        Write-Host "     Value doesn't match expected pattern" -ForegroundColor Gray
        $script:warningsFound++
        return $false
    }
    
    $displayValue = if ($value.Length -gt 40) { 
        $value.Substring(0, 40) + "..." 
    } else { 
        $value 
    }
    
    Write-Host "  ✅ $Name" -ForegroundColor Green
    if ($Verbose) {
        Write-Host "     Value: $displayValue" -ForegroundColor Gray
    }
    return $true
}

function Test-Command {
    param([string]$Command)
    
    try {
        $null = Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ───────────────────────────────────────────────────────────────
# 1. PROJECT STRUCTURE CHECK
# ───────────────────────────────────────────────────────────────

Write-Host "`n📁 Checking Project Structure..." -ForegroundColor Cyan

$requiredFiles = @(
    "package.json",
    "next.config.ts",
    "tsconfig.json"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file missing" -ForegroundColor Red
        $script:issuesFound++
    }
}

# ───────────────────────────────────────────────────────────────
# 2. DEPENDENCIES CHECK
# ───────────────────────────────────────────────────────────────

Write-Host "`n📦 Checking Dependencies..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    Write-Host "  ✅ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  node_modules missing - run 'npm install'" -ForegroundColor Yellow
    $script:warningsFound++
}

if (Test-Path "package-lock.json") {
    Write-Host "  ✅ package-lock.json exists" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  package-lock.json missing" -ForegroundColor Yellow
    $script:warningsFound++
}

# ───────────────────────────────────────────────────────────────
# 3. REQUIRED TOOLS CHECK
# ───────────────────────────────────────────────────────────────

Write-Host "`n🔧 Checking Required Tools..." -ForegroundColor Cyan

$tools = @(
    @{Name="node"; DisplayName="Node.js"},
    @{Name="npm"; DisplayName="npm"},
    @{Name="git"; DisplayName="Git"}
)

foreach ($tool in $tools) {
    if (Test-Command $tool.Name) {
        Write-Host "  ✅ $($tool.DisplayName) installed" -ForegroundColor Green
        if ($Verbose) {
            $version = & $tool.Name --version 2>$null
            Write-Host "     Version: $version" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ $($tool.DisplayName) not found" -ForegroundColor Red
        $script:issuesFound++
    }
}

# ───────────────────────────────────────────────────────────────
# 4. ENVIRONMENT VARIABLES CHECK
# ───────────────────────────────────────────────────────────────

Write-Host "`n🔑 Checking Environment Variables..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "  ⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "     Create .env file with required variables" -ForegroundColor Gray
    $script:warningsFound++
}

Write-Host "`n  Database & Supabase:" -ForegroundColor White
Test-EnvVariable "DATABASE_URL" "^postgresql://" "PostgreSQL connection string" -Required
Test-EnvVariable "NEXT_PUBLIC_SUPABASE_URL" "^https://" "Supabase project URL" -Required
Test-EnvVariable "NEXT_PUBLIC_SUPABASE_ANON_KEY" "^ey" "Supabase anon key" -Required
Test-EnvVariable "SUPABASE_SERVICE_ROLE_KEY" "^ey" "Supabase service role key" -Required

Write-Host "`n  Storage:" -ForegroundColor White
Test-EnvVariable "USE_CLOUD_STORAGE" "^true" "Enable cloud storage" -Required
Test-EnvVariable "SUPABASE_STORAGE_BUCKET" "^depo-files" "Storage bucket name" -Required

Write-Host "`n  Authentication:" -ForegroundColor White
Test-EnvVariable "NEXTAUTH_SECRET" ".{32,}" "NextAuth secret (32+ chars)" -Required
Test-EnvVariable "NEXTAUTH_URL" "^https?://" "NextAuth URL"

Write-Host "`n  Email (SMTP):" -ForegroundColor White
Test-EnvVariable "SMTP_HOST" "smtp\." "SMTP server hostname"
Test-EnvVariable "SMTP_PORT" "^(587|465|25)$" "SMTP port"
Test-EnvVariable "SMTP_USER" "@" "SMTP username/email"
Test-EnvVariable "SMTP_PASSWORD" ".+" "SMTP password"
Test-EnvVariable "FROM_EMAIL" "@" "From email address"

Write-Host "`n  Transcription:" -ForegroundColor White
Test-EnvVariable "USE_DEEPGRAM" "^true" "Enable Deepgram"
Test-EnvVariable "DEEPGRAM_API_KEY" ".{20,}" "Deepgram API key"

Write-Host "`n  Features:" -ForegroundColor White
Test-EnvVariable "USE_REAL_EXPORT" "^true" "Enable real exports"
Test-EnvVariable "NODE_ENV" "^(development|production)$" "Node environment"

# ───────────────────────────────────────────────────────────────
# 5. GIT STATUS CHECK
# ───────────────────────────────────────────────────────────────

Write-Host "`n🌿 Checking Git Status..." -ForegroundColor Cyan

if (Test-Command "git") {
    $gitStatus = git status --porcelain 2>$null
    
    if ($gitStatus) {
        Write-Host "  ⚠️  Uncommitted changes detected" -ForegroundColor Yellow
        Write-Host "     Run 'git add . && git commit -m \"message\"'" -ForegroundColor Gray
        $script:warningsFound++
    } else {
        Write-Host "  ✅ Working tree clean" -ForegroundColor Green
    }
    
    $branch = git branch --show-current 2>$null
    Write-Host "  📍 Current branch: $branch" -ForegroundColor White
    
    # Check if commits are pushed
    $unpushed = git log origin/$branch..$branch --oneline 2>$null
    if ($unpushed) {
        Write-Host "  ⚠️  Unpushed commits detected" -ForegroundColor Yellow
        Write-Host "     Run 'git push origin $branch'" -ForegroundColor Gray
        $script:warningsFound++
    } else {
        Write-Host "  ✅ All commits pushed to origin" -ForegroundColor Green
    }
}

# ───────────────────────────────────────────────────────────────
# 6. BUILD TEST
# ───────────────────────────────────────────────────────────────

Write-Host "`n🔨 Testing Build Process..." -ForegroundColor Cyan

Write-Host "  Running type check..." -ForegroundColor Gray
$typecheckResult = npm run typecheck 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ TypeScript type check passed" -ForegroundColor Green
} else {
    Write-Host "  ❌ TypeScript errors found" -ForegroundColor Red
    $script:issuesFound++
}

Write-Host "  Running linter..." -ForegroundColor Gray
$lintResult = npm run lint 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Linting passed" -ForegroundColor Green
} else {
    Write-Host "  ❌ Linting errors found" -ForegroundColor Red
    $script:issuesFound++
}

# ───────────────────────────────────────────────────────────────
# 7. SUMMARY
# ───────────────────────────────────────────────────────────────

Write-Host "
╔════════════════════════════════════════════════════════════╗
║  VERIFICATION SUMMARY                                      ║
╚════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

if ($script:issuesFound -eq 0 -and $script:warningsFound -eq 0) {
    Write-Host "🎉 ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "`n✅ Your project is ready for deployment to Vercel!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor White
    Write-Host "  1. Push your code to GitHub (if not already)" -ForegroundColor Gray
    Write-Host "  2. Go to https://vercel.com/dashboard" -ForegroundColor Gray
    Write-Host "  3. Import your depo-pro repository" -ForegroundColor Gray
    Write-Host "  4. Add environment variables from .env" -ForegroundColor Gray
    Write-Host "  5. Deploy!" -ForegroundColor Gray
    exit 0
}

if ($script:issuesFound -eq 0) {
    Write-Host "✅ No critical issues found" -ForegroundColor Green
} else {
    Write-Host "❌ $script:issuesFound critical issue(s) found" -ForegroundColor Red
}

if ($script:warningsFound -gt 0) {
    Write-Host "⚠️  $script:warningsFound warning(s) found" -ForegroundColor Yellow
}

if ($script:issuesFound -gt 0) {
    Write-Host "`n⚠️  DEPLOYMENT NOT RECOMMENDED" -ForegroundColor Red
    Write-Host "   Fix critical issues before deploying" -ForegroundColor Gray
    exit 1
} else {
    Write-Host "`n✅ SAFE TO DEPLOY" -ForegroundColor Green
    Write-Host "   Address warnings when possible" -ForegroundColor Gray
    exit 0
}
