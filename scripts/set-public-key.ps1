#requires -Version 5
$root    = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root '.env'
$url     = 'https://lqxiuwlwzkofdfitxuqe.supabase.co'

$k = (Read-Host "Paste publishable key (Ctrl+V, Enter)").Trim()
if (-not $k) { Write-Host "Nothing pasted. Aborting."; return }
"Received: len=$($k.Length) starts=$($k.Substring(0,[Math]::Min(12,$k.Length)))"

# /rest/v1/ OpenAPI root requires a secret key under the new API key model.
# Probe a public auth endpoint + a real table path instead.
try {
  $r = Invoke-WebRequest -Uri "$url/auth/v1/health" -Headers @{ apikey = $k } `
       -Method GET -TimeoutSec 15 -UseBasicParsing -ErrorAction Stop
  $code = [int]$r.StatusCode
} catch {
  $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode.value__ } else { 0 }
}
"Probe result (auth/v1/health): $code"
if ($code -ne 200) { Write-Host "Not 200 - .env NOT modified."; return }

$lines = Get-Content -LiteralPath $envPath
foreach ($n in 'VITE_SUPABASE_ANON_KEY','SUPABASE_ANON_KEY','VITE_SUPABASE_PUBLISHABLE_KEY') {
  if ($lines -match "^\s*$n\s*=") { $lines = $lines -replace "^\s*$n\s*=.*$", "$n=$k" }
  else { $lines += "$n=$k" }
}
[System.IO.File]::WriteAllLines($envPath, $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "`n.env updated. Run: .\scripts\validate-env.ps1"
