<#
.SYNOPSIS
  Safely configure Depo-Pro local .env, Supabase Edge secrets, and Vercel VITE_* vars via PowerShell CLI.

.DESCRIPTION
  Never prints secret values. Prompts with SecureString where needed.
  Does NOT commit .env. Does NOT put server secrets into Vercel.

  Correct editor API base (note /editor-api suffix):
    https://lqxiuwlwzkofdfitxuqe.supabase.co/functions/v1/editor-api

.PARAMETER ProjectRef
  Supabase project ref. Default: lqxiuwlwzkofdfitxuqe

.PARAMETER LocalEnv
  Create/update local .env with browser-safe VITE_* keys only.

.PARAMETER SupabaseSecrets
  Set Edge Function secrets via `supabase secrets set`.

.PARAMETER VercelEnv
  Set Production/Preview/Development VITE_* vars via `vercel env`.

.PARAMETER Validate
  Probe configured credentials (pass/fail only; never prints secret values).

.PARAMETER DeployFunctions
  After setting secrets, run `supabase functions deploy`.

.PARAMETER All
  Run LocalEnv + SupabaseSecrets + VercelEnv + Validate.

.EXAMPLE
  .\scripts\setup-env.ps1 -All

.EXAMPLE
  .\scripts\setup-env.ps1 -LocalEnv -Validate

.EXAMPLE
  .\scripts\setup-env.ps1 -SupabaseSecrets -DeployFunctions
#>

[CmdletBinding()]
param(
  [string]$ProjectRef = "lqxiuwlwzkofdfitxuqe",
  [switch]$LocalEnv,
  [switch]$SupabaseSecrets,
  [switch]$VercelEnv,
  [switch]$Validate,
  [switch]$DeployFunctions,
  [switch]$All
)

$ErrorActionPreference = "Stop"

if ($All) {
  $LocalEnv = $true
  $SupabaseSecrets = $true
  $VercelEnv = $true
  $Validate = $true
}

if (-not ($LocalEnv -or $SupabaseSecrets -or $VercelEnv -or $Validate -or $DeployFunctions)) {
  Write-Host @"
Depo-Pro secret setup (CLI)

Usage examples:
  .\scripts\setup-env.ps1 -All
  .\scripts\setup-env.ps1 -LocalEnv -Validate
  .\scripts\setup-env.ps1 -SupabaseSecrets -DeployFunctions
  .\scripts\setup-env.ps1 -VercelEnv
  .\scripts\setup-env.ps1 -Validate

Nothing selected — exiting.
"@
  exit 1
}

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$ProjectUrl = "https://$ProjectRef.supabase.co"
$EditorApiBase = "$ProjectUrl/functions/v1/editor-api"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found on PATH: $Name"
  }
}

function ConvertFrom-SecureStringPlain([SecureString]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Read-RequiredSecure([string]$Prompt) {
  $value = Read-Host -Prompt $Prompt -AsSecureString
  $plain = ConvertFrom-SecureStringPlain $value
  if ([string]::IsNullOrWhiteSpace($plain)) {
    throw "A value is required for: $Prompt"
  }
  return $plain
}

function Read-Text([string]$Prompt, [string]$Default = "", [switch]$AllowEmpty) {
  $suffix = if ($Default) { " [$Default]" } else { "" }
  $value = Read-Host -Prompt "$Prompt$suffix"
  if ([string]::IsNullOrWhiteSpace($value)) {
    if ($AllowEmpty) { return "" }
    if ($Default -ne "") { return $Default }
    throw "A value is required for: $Prompt"
  }
  return $value.Trim()
}

function Get-DotEnvMap([string]$Path) {
  $map = @{}
  if (-not (Test-Path $Path)) { return $map }
  foreach ($line in Get-Content -LiteralPath $Path) {
    if ($line -match '^\s*#' -or $line -match '^\s*$') { continue }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
      $key = $Matches[1]
      $val = $Matches[2]
      if ($val.StartsWith('"') -and $val.EndsWith('"')) {
        $val = $val.Substring(1, $val.Length - 2)
      } elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
        $val = $val.Substring(1, $val.Length - 2)
      }
      $map[$key] = $val
    }
  }
  return $map
}

function Set-DotEnvKeys([string]$Path, [hashtable]$Updates) {
  $lines = @()
  if (Test-Path $Path) {
    $lines = Get-Content -LiteralPath $Path
  } elseif (Test-Path (Join-Path $RepoRoot ".env.example")) {
    $lines = Get-Content -LiteralPath (Join-Path $RepoRoot ".env.example")
  }

  $seen = @{}
  $out = foreach ($line in $lines) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
      $key = $Matches[1]
      if ($Updates.ContainsKey($key)) {
        $seen[$key] = $true
        "$key=$($Updates[$key])"
        continue
      }
    }
    $line
  }

  foreach ($key in $Updates.Keys) {
    if (-not $seen.ContainsKey($key)) {
      $out += "$key=$($Updates[$key])"
    }
  }

  Set-Content -LiteralPath $Path -Value $out -Encoding utf8
}

function Assert-EnvGitIgnored {
  $check = git check-ignore -v .env 2>$null
  if (-not $check) {
    throw ".env is NOT git-ignored. Add '.env' to .gitignore before continuing."
  }
  Write-Host "OK  .env is git-ignored ($check)"
}

function Mask-Status([bool]$Ok, [string]$Label) {
  if ($Ok) { Write-Host "PASS  $Label" }
  else { Write-Host "FAIL  $Label" }
}

Write-Host ""
Write-Host "Depo-Pro env setup"
Write-Host "Repo:        $RepoRoot"
Write-Host "Project ref: $ProjectRef"
Write-Host "Project URL: $ProjectUrl"
Write-Host "Editor API:  $EditorApiBase"
Write-Host ""

Assert-EnvGitIgnored

# -----------------------------------------------------------------------------
# Local .env (browser-safe VITE_* only)
# -----------------------------------------------------------------------------
if ($LocalEnv) {
  Write-Host "=== Local .env (VITE_* only) ==="
  $envPath = Join-Path $RepoRoot ".env"
  if (-not (Test-Path $envPath)) {
    Copy-Item (Join-Path $RepoRoot ".env.example") $envPath
    Write-Host "Created .env from .env.example"
  } else {
    Write-Host "Updating existing .env"
  }

  $anon = Read-RequiredSecure "Paste Supabase anon/publishable key (hidden)"
  $updates = @{
    VITE_SUPABASE_URL            = $ProjectUrl
    VITE_SUPABASE_ANON_KEY       = $anon
    VITE_USE_REAL_API            = "1"
    VITE_EDITOR_API_BASE_URL     = $EditorApiBase
    VITE_REQUIRE_BINDING_CONFIRM = "true"
  }
  Set-DotEnvKeys -Path $envPath -Updates $updates
  $anon = $null
  [GC]::Collect()

  Write-Host "OK  Wrote browser-safe VITE_* keys to .env"
  Write-Host "    VITE_EDITOR_API_BASE_URL ends with /editor-api (required)"
  Write-Host ""
}

# -----------------------------------------------------------------------------
# Supabase Edge secrets (server-only)
# -----------------------------------------------------------------------------
if ($SupabaseSecrets) {
  Write-Host "=== Supabase Edge secrets ==="
  Assert-Command "npx"

  Write-Host "Linking project (opens browser / uses existing login if needed)..."
  npx supabase login
  npx supabase link --project-ref $ProjectRef

  $anon = Read-RequiredSecure "Paste Supabase anon/publishable key (hidden)"
  $service = Read-RequiredSecure "Paste Supabase service_role/secret key (hidden)"
  $anthropic = Read-RequiredSecure "Paste Anthropic API key (hidden)"
  $deepgram = Read-RequiredSecure "Paste Deepgram API key (hidden)"

  $generate = Read-Text "Generate new WATCHDOG_SECRET? (Y/n)" "Y"
  if ($generate -match '^[Yy]') {
    $bytes = New-Object byte[] 36
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $watchdog = [Convert]::ToBase64String($bytes)
    Write-Host "Generated WATCHDOG_SECRET (48-char base64). Store it in your password manager now."
    Write-Host "Length: $($watchdog.Length)  (value NOT printed)"
    Read-Text "Press Enter after you have stored it in your password manager" -AllowEmpty | Out-Null
  } else {
    $watchdog = Read-RequiredSecure "Paste existing WATCHDOG_SECRET (hidden)"
  }

  # supabase secrets set accepts KEY=value pairs; values stay out of our logs.
  $env:SUPABASE_URL = $ProjectUrl
  npx supabase secrets set `
    "SUPABASE_URL=$ProjectUrl" `
    "SUPABASE_ANON_KEY=$anon" `
    "SUPABASE_SERVICE_ROLE_KEY=$service" `
    "ANTHROPIC_API_KEY=$anthropic" `
    "DEEPGRAM_API_KEY=$deepgram" `
    "WATCHDOG_SECRET=$watchdog"

  $anon = $null; $service = $null; $anthropic = $null; $deepgram = $null; $watchdog = $null
  [GC]::Collect()

  Write-Host "OK  Edge secrets set (names only below):"
  npx supabase secrets list
  Write-Host ""
}

if ($DeployFunctions) {
  Write-Host "=== Deploy Edge Functions ==="
  Assert-Command "npx"
  npx supabase functions deploy
  Write-Host "OK  Functions deploy finished"
  Write-Host ""
}

# -----------------------------------------------------------------------------
# Vercel (VITE_* only — never server secrets)
# -----------------------------------------------------------------------------
if ($VercelEnv) {
  Write-Host "=== Vercel environment (VITE_* only) ==="
  Assert-Command "npx"

  Write-Host "Ensure you are logged in and linked..."
  npx vercel login
  if (-not (Test-Path (Join-Path $RepoRoot ".vercel/project.json"))) {
    npx vercel link
  }

  $envMap = Get-DotEnvMap (Join-Path $RepoRoot ".env")
  $anon = $envMap["VITE_SUPABASE_ANON_KEY"]
  if ([string]::IsNullOrWhiteSpace($anon)) {
    $anon = Read-RequiredSecure "Paste Supabase anon/publishable key for Vercel (hidden)"
  } else {
    Write-Host "Using VITE_SUPABASE_ANON_KEY from local .env (value not printed)"
  }

  $targets = @("production", "preview", "development")
  foreach ($target in $targets) {
    Write-Host "Setting VITE_* for $target ..."
    # vercel env add is interactive; use `vercel env pull` pattern via stdin pipe where supported.
    # Explicit add with --force overwrite for non-interactive updates:
    $pairs = @{
      VITE_SUPABASE_URL        = $ProjectUrl
      VITE_SUPABASE_ANON_KEY   = $anon
      VITE_USE_REAL_API        = "1"
      VITE_EDITOR_API_BASE_URL = $EditorApiBase
    }
    foreach ($key in $pairs.Keys) {
      $value = $pairs[$key]
      $value | npx vercel env add $key $target --force 2>$null
      if ($LASTEXITCODE -ne 0) {
        # Fallback for older CLI: remove then add
        npx vercel env rm $key $target -y 2>$null | Out-Null
        $value | npx vercel env add $key $target
      }
      if ($LASTEXITCODE -ne 0) {
        throw "Failed to set $key for $target. Run: npx vercel env add $key $target"
      }
    }
  }

  $anon = $null
  [GC]::Collect()

  Write-Host "OK  Vercel VITE_* vars set for production/preview/development"
  Write-Host "    Reminder: Vite inlines these at build time — redeploy after changes."
  Write-Host "    Do NOT add SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, or DEEPGRAM_API_KEY to Vercel."
  Write-Host ""
}

# -----------------------------------------------------------------------------
# Validate (pass/fail only)
# -----------------------------------------------------------------------------
if ($Validate) {
  Write-Host "=== Connectivity validation (no secret values printed) ==="
  $envMap = Get-DotEnvMap (Join-Path $RepoRoot ".env")

  $url = $envMap["VITE_SUPABASE_URL"]
  $anon = $envMap["VITE_SUPABASE_ANON_KEY"]
  $editor = $envMap["VITE_EDITOR_API_BASE_URL"]

  $supabaseOk = $false
  if ($url -and $anon) {
    try {
      $resp = Invoke-WebRequest -Uri "$url/auth/v1/health" -Headers @{
        apikey = $anon
        Authorization = "Bearer $anon"
      } -UseBasicParsing -TimeoutSec 20
      $supabaseOk = ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300)
    } catch {
      $supabaseOk = $false
    }
  }
  Mask-Status $supabaseOk "Supabase URL + anon key (auth health)"

  $editorShapeOk = $editor -match '/functions/v1/editor-api/?$'
  Mask-Status $editorShapeOk "VITE_EDITOR_API_BASE_URL ends with /functions/v1/editor-api"

  $editorReachable = $false
  if ($editor) {
    try {
      # Unauthenticated probe: 401/403 means the function is up; 404 means wrong base.
      $resp = Invoke-WebRequest -Uri "$editor/" -Method GET -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
      $editorReachable = $true
    } catch {
      $code = $null
      if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
      $editorReachable = ($code -eq 401 -or $code -eq 403 -or $code -eq 400 -or $code -eq 405)
      if ($code -eq 404) { $editorReachable = $false }
    }
  }
  Mask-Status $editorReachable "editor-api Edge Function reachable"

  Write-Host ""
  Write-Host "Anthropic / Deepgram / service_role cannot be validated from the browser bundle."
  Write-Host "After supabase secrets set + deploy, validate server keys with:"
  Write-Host "  npx supabase secrets list"
  Write-Host "  Invoke-RestMethod -Method POST -Uri `"$ProjectUrl/functions/v1/anthropic-healthcheck`""
  Write-Host ""

  if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm run env:audit
  }
}

Write-Host "Done."
Write-Host "Next: npm run env:audit ; npm run dev"
Write-Host "Prod: npx vercel --prod   (after Vercel env vars are set)"
)
