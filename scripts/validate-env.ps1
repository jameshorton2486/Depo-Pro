#requires -Version 5
<#
.SYNOPSIS
  Auth-probe the API keys in repo-root .env and print PASS/FAIL.
.DESCRIPTION
  Reads .env, makes READ-ONLY authentication checks against Supabase, Anthropic,
  and Deepgram, and prints only the result. Never prints or logs key values.
  Keys are sent only to their own configured services.
.EXAMPLE
  .\scripts\validate-env.ps1
#>

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
if (-not (Test-Path -LiteralPath $envPath)) { Write-Error ".env not found at $envPath"; return }

# Parse KEY=VALUE (values never echoed).
$cfg = @{}
foreach ($line in Get-Content -LiteralPath $envPath) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
    $cfg[$matches[1]] = $matches[2].Trim().Trim('"').Trim("'")
  }
}

function Probe([string]$Url, [hashtable]$Headers) {
  try {
    $r = Invoke-WebRequest -Uri $Url -Headers $Headers -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode.value__ }
    return 0
  }
}
function Verdict([int]$c) {
  if ($c -ge 200 -and $c -lt 300) { "PASS ($c)" }
  elseif ($c -eq 401 -or $c -eq 403) { "FAIL - key rejected ($c)" }
  elseif ($c -eq 0) { "FAIL - no response" }
  else { "CHECK ($c)" }
}
function Row([string]$name, [string]$result) { "{0,-34} {1}" -f $name, $result }

$u = $cfg['SUPABASE_URL']
Write-Host "Auth probes (status only; key values never shown):`n"

# Public keys: /rest/v1/ OpenAPI root requires a secret key under the new key model.
# Probe auth health + a real table path instead.
if ($u -and $cfg['VITE_SUPABASE_ANON_KEY']) {
  $k = $cfg['VITE_SUPABASE_ANON_KEY']
  Row 'VITE_SUPABASE_ANON_KEY (auth)' (Verdict (Probe "$u/auth/v1/health" @{ apikey = $k }))
  Row 'VITE_SUPABASE_ANON_KEY (rest)' (Verdict (Probe "$u/rest/v1/cases?select=case_id&limit=1" @{ apikey = $k }))
}
if ($u -and $cfg['SUPABASE_ANON_KEY']) {
  $k = $cfg['SUPABASE_ANON_KEY']
  Row 'SUPABASE_ANON_KEY (auth)' (Verdict (Probe "$u/auth/v1/health" @{ apikey = $k }))
  Row 'SUPABASE_ANON_KEY (rest)' (Verdict (Probe "$u/rest/v1/cases?select=case_id&limit=1" @{ apikey = $k }))
}
if ($u -and $cfg['VITE_SUPABASE_PUBLISHABLE_KEY']) {
  $k = $cfg['VITE_SUPABASE_PUBLISHABLE_KEY']
  Row 'VITE_SUPABASE_PUBLISHABLE_KEY (auth)' (Verdict (Probe "$u/auth/v1/health" @{ apikey = $k }))
}
if ($u -and $cfg['SUPABASE_SECRET_KEY']) {
  $k = $cfg['SUPABASE_SECRET_KEY']
  Row 'SUPABASE_SECRET_KEY' (Verdict (Probe "$u/rest/v1/" @{ apikey = $k; 'User-Agent' = 'DepoPro-KeyProbe/1.0' }))
}
if ($u -and $cfg['SUPABASE_SERVICE_ROLE_KEY']) {
  $sr = $cfg['SUPABASE_SERVICE_ROLE_KEY']
  Row 'SUPABASE_SERVICE_ROLE_KEY' (Verdict (Probe "$u/auth/v1/admin/users?per_page=1" @{ apikey = $sr; Authorization = "Bearer $sr" }))
}
if ($cfg['ANTHROPIC_API_KEY']) {
  Row 'ANTHROPIC_API_KEY' (Verdict (Probe 'https://api.anthropic.com/v1/models' @{ 'x-api-key' = $cfg['ANTHROPIC_API_KEY']; 'anthropic-version' = '2023-06-01' }))
}
if ($cfg['DEEPGRAM_API_KEY']) {
  Row 'DEEPGRAM_API_KEY' (Verdict (Probe 'https://api.deepgram.com/v1/projects' @{ Authorization = "Token $($cfg['DEEPGRAM_API_KEY'])" }))
}
Write-Host "`nFAIL - key rejected => that value is wrong/stale; refresh it from the provider console."
