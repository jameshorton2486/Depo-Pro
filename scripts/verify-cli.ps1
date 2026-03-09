# verify-cli.ps1 — Check all required CLI tools for Depo-Pro development

Write-Host "`n=== Depo-Pro CLI Verification ===" -ForegroundColor Cyan
Write-Host ""

$tools = @(
    @{ Name = "Node.js";   Cmd = "node";     Args = "-v" },
    @{ Name = "npm";       Cmd = "npm";      Args = "-v" },
    @{ Name = "pnpm";      Cmd = "pnpm";     Args = "--version" },
    @{ Name = "Supabase";  Cmd = "supabase"; Args = "--version" },
    @{ Name = "Vercel";    Cmd = "vercel";   Args = "--version" },
    @{ Name = "GitHub CLI";Cmd = "gh";       Args = "--version" },
    @{ Name = "Stripe CLI";Cmd = "stripe";   Args = "version" },
    @{ Name = "Prisma";    Cmd = "prisma";   Args = "--version" },
    @{ Name = "tsx";       Cmd = "tsx";      Args = "--version" },
    @{ Name = "Git";       Cmd = "git";      Args = "--version" }
)

$passed = 0
$failed = 0

foreach ($tool in $tools) {
    try {
        $output = & $tool.Cmd $tool.Args 2>&1 | Select-Object -First 1
        Write-Host ("  [OK] {0,-12} {1}" -f $tool.Name, $output) -ForegroundColor Green
        $passed++
    }
    catch {
        Write-Host ("  [MISSING] {0}" -f $tool.Name) -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "=== Auth Status ===" -ForegroundColor Cyan

try {
    $ghAuth = & gh auth status 2>&1 | Select-String "Logged in"
    if ($ghAuth) { Write-Host "  [AUTH] GitHub: Logged in" -ForegroundColor Green }
    else { Write-Host "  [AUTH] GitHub: Not logged in — run: gh auth login" -ForegroundColor Yellow }
} catch { Write-Host "  [AUTH] GitHub: CLI not available" -ForegroundColor Yellow }

try {
    $vercelUser = & vercel whoami 2>&1 | Select-Object -Last 1
    if ($vercelUser -and $vercelUser -notmatch "Error") { Write-Host "  [AUTH] Vercel: $vercelUser" -ForegroundColor Green }
    else { Write-Host "  [AUTH] Vercel: Not logged in — run: vercel login" -ForegroundColor Yellow }
} catch { Write-Host "  [AUTH] Vercel: CLI not available" -ForegroundColor Yellow }

try {
    $sbOutput = & supabase projects list 2>&1
    if ($sbOutput -match "depo-pro") { Write-Host "  [AUTH] Supabase: Linked (depo-pro)" -ForegroundColor Green }
    else { Write-Host "  [AUTH] Supabase: Not logged in — run: supabase login" -ForegroundColor Yellow }
} catch { Write-Host "  [AUTH] Supabase: CLI not available" -ForegroundColor Yellow }

Write-Host ""
Write-Host "Results: $passed passed, $failed failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""
