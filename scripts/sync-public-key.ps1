#requires -Version 5
<#
.SYNOPSIS
  Pull the LIVE Supabase anon/publishable key and write it into .env — no hand-copying.
.DESCRIPTION
  Requires you to be logged in: run `supabase login` first if needed.
  Fetches the project's keys, probes them against the real API, and writes ONLY a
  value that already returned HTTP 200 into the three public-tier names. Backs up
  .env first. Key values are never printed (only length + first 12 chars).
#>
$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
$ref     = 'lqxiuwlwzkofdfitxuqe'
$url     = "https://$ref.supabase.co"

if (-not (Test-Path -LiteralPath $envPath)) { Write-Error ".env not found at $envPath"; return }

function Get-KeyValue($o) {
  foreach ($p in 'api_key','apiKey','value','key') {
    if ($o.PSObject.Properties.Name -contains $p -and $o.$p) { return $o.$p }
  }
  return $null
}
function Test-PublicKey([string]$k) {
  # /rest/v1/ OpenAPI root requires a secret key; public keys probe auth health.
  try {
    $r = Invoke-WebRequest -Uri "$url/auth/v1/health" -Headers @{ apikey = $k } `
         -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
    return [int]$r.StatusCode
  } catch {
    if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode.value__ }
    return 0
  }
}

Write-Host "Fetching live keys from Supabase (must be logged in)..."
# CLI prints "new version available" on stderr; with $ErrorActionPreference=Stop
# PowerShell treats that as a fatal ErrorRecord. Drop ErrorRecords, keep JSON.
$prevEap = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
$raw = & supabase projects api-keys --project-ref $ref --output json 2>&1 |
       Where-Object { $_ -isnot [System.Management.Automation.ErrorRecord] }
$cliExit = $LASTEXITCODE
$ErrorActionPreference = $prevEap
if ($cliExit -ne 0) {
  Write-Error "supabase CLI could not read keys. Run 'supabase login' (and 'supabase link --project-ref $ref'), then retry.`n$raw"
  return
}
$json = ($raw -join "`n") | ConvertFrom-Json

$anon = $null; $pub = $null
foreach ($row in $json) {
  $v = Get-KeyValue $row
  if (-not $v) { continue }
  if     ($v -like 'sb_publishable_*') { $pub  = $v }
  elseif ($row.name -eq 'anon')        { $anon = $v }
}

Write-Host "`nProbing live keys (values never shown):"
$chosen = $null
if ($pub)  { $c = Test-PublicKey $pub;  "  publishable  -> $c"; if ($c -eq 200) { $chosen = $pub } }
if ($anon) { $c = Test-PublicKey $anon; "  legacy anon  -> $c"; if (-not $chosen -and $c -eq 200) { $chosen = $anon } }
if (-not $chosen) { Write-Error "Neither live key returned 200. Stopping WITHOUT changes."; return }

"`nSelected key: len=$($chosen.Length) starts=$($chosen.Substring(0,[Math]::Min(12,$chosen.Length)))"

Copy-Item -LiteralPath $envPath -Destination "$envPath.bak" -Force
Write-Host "Backup written to .env.bak"

$lines = Get-Content -LiteralPath $envPath
foreach ($n in 'VITE_SUPABASE_ANON_KEY','SUPABASE_ANON_KEY','VITE_SUPABASE_PUBLISHABLE_KEY') {
  if ($lines -match "^\s*$n\s*=") { $lines = $lines -replace "^\s*$n\s*=.*$", "$n=$chosen" }
  else { $lines += "$n=$chosen" }
}
# FIX #2: write UTF-8 WITHOUT a BOM. PS5 'Set-Content -Encoding UTF8' prepends a
# BOM that corrupts the first line's key and would leave you rejected again.
[System.IO.File]::WriteAllLines($envPath, $lines, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Updated .env (3 public-tier names). Next:" -ForegroundColor Green
Write-Host "  .\scripts\validate-env.ps1     # expect anon rows -> PASS"
Write-Host "  Remove-Item .\.env.bak          # after it validates (holds old keys)"
Write-Host "  # then restart dev server (Vite reads .env only at startup)"
