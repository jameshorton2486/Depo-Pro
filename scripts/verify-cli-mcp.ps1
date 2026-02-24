# =============================================================================
# DEPO-PRO CLI & MCP VERIFICATION SCRIPT
# Run after completing CLI and MCP setup
# =============================================================================

Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  DEPO-PRO CLI & MCP VERIFICATION REPORT" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# ── CLI Installations ──
Write-Host "── CLI INSTALLATIONS ──" -ForegroundColor Yellow

$checks = @(
    @{ Name = "Node.js"; Cmd = "node --version" },
    @{ Name = "npm"; Cmd = "npm --version" },
    @{ Name = "Git"; Cmd = "git --version" },
    @{ Name = "Vercel CLI"; Cmd = "vercel --version" },
    @{ Name = "Supabase CLI"; Cmd = "supabase --version" },
    @{ Name = "GitHub CLI"; Cmd = "gh --version" },
    @{ Name = "Claude Code"; Cmd = "claude --version" }
)

foreach ($check in $checks) {
    try {
        $result = Invoke-Expression $check.Cmd 2>&1 | Select-Object -First 1
        Write-Host "  [PASS] $($check.Name): $result" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($check.Name): NOT INSTALLED" -ForegroundColor Red
    }
}

# ── Authentication Status ──
Write-Host ""
Write-Host "── AUTHENTICATION STATUS ──" -ForegroundColor Yellow

# Vercel
try {
    $vWho = vercel whoami 2>&1
    Write-Host "  [PASS] Vercel: logged in as $vWho" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Vercel: not logged in (run: vercel login)" -ForegroundColor Red
}

# Supabase
try {
    $sProjects = supabase projects list 2>&1 | Select-Object -First 2
    Write-Host "  [PASS] Supabase: connected" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Supabase: not logged in (run: supabase login)" -ForegroundColor Red
}

# GitHub
try {
    $gAuth = gh auth status 2>&1 | Select-Object -First 1
    Write-Host "  [PASS] GitHub: $gAuth" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] GitHub: not logged in (run: gh auth login)" -ForegroundColor Red
}

# ── Environment Variables ──
Write-Host ""
Write-Host "── ENVIRONMENT VARIABLES ──" -ForegroundColor Yellow

$envFile = if (Test-Path ".env.local") { Get-Content ".env.local" } else { @() }
$envChecks = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DEEPGRAM_API_KEY",
    "ANTHROPIC_API_KEY"
)

foreach ($key in $envChecks) {
    $found = $envFile | Where-Object { $_ -match "^$key=" -and $_ -notmatch "^#" }
    $sysVal = [System.Environment]::GetEnvironmentVariable($key, "User")

    if ($found) {
        Write-Host "  [PASS] $key (in .env.local)" -ForegroundColor Green
    } elseif ($sysVal) {
        Write-Host "  [PASS] $key (in system env)" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $key: NOT SET" -ForegroundColor Red
    }
}

# ── MCP Config Files ──
Write-Host ""
Write-Host "── MCP CONFIGURATION FILES ──" -ForegroundColor Yellow

$mcpPaths = @(
    @{ Name = "Cursor (project)"; Path = ".cursor\mcp.json" },
    @{ Name = "VS Code (project)"; Path = ".vscode\mcp.json" },
    @{ Name = "Codex"; Path = ".codex\config.json" }
)

foreach ($mcp in $mcpPaths) {
    if (Test-Path $mcp.Path) {
        Write-Host "  [PASS] $($mcp.Name): $($mcp.Path) exists" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] $($mcp.Name): $($mcp.Path) not found" -ForegroundColor Yellow
    }
}

# ── Vercel Project Link ──
Write-Host ""
Write-Host "── PROJECT LINKS ──" -ForegroundColor Yellow

if (Test-Path ".vercel\project.json") {
    $vp = Get-Content ".vercel\project.json" | ConvertFrom-Json
    Write-Host "  [PASS] Vercel project linked: $($vp.projectId)" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Vercel: not linked (run: vercel link)" -ForegroundColor Red
}

if (Test-Path "supabase\.temp\project-ref") {
    $sp = Get-Content "supabase\.temp\project-ref"
    Write-Host "  [PASS] Supabase project linked: $sp" -ForegroundColor Green
} elseif (Test-Path "supabase\config.toml") {
    Write-Host "  [PASS] Supabase: config.toml found" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Supabase: not linked (run: supabase link)" -ForegroundColor Red
}

# ── Summary ──
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Fix any [FAIL] items above, then re-run this script." -ForegroundColor White
Write-Host "  [SKIP] items are optional and depend on your setup." -ForegroundColor Gray
Write-Host ""
