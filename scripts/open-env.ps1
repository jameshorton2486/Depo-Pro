#requires -Version 5
<#
.SYNOPSIS
  Open the repo-root .env in Notepad for editing.
.DESCRIPTION
  Resolves the repo root from this script's location, then opens .env in Notepad.
  If .env is missing, use -Create to seed it from .env.scaffold (or .env.example).
  Never prints or logs file contents.
.EXAMPLE
  .\scripts\open-env.ps1
.EXAMPLE
  .\scripts\open-env.ps1 -Create
#>
param(
  [switch]$Create
)

$ErrorActionPreference = 'Stop'

# scripts/ is one level under the repo root.
$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath  = Join-Path $repoRoot '.env'

if (-not (Test-Path -LiteralPath $envPath)) {
  if ($Create) {
    $seed = @('.env.scaffold', '.env.example') |
      ForEach-Object { Join-Path $repoRoot $_ } |
      Where-Object   { Test-Path -LiteralPath $_ } |
      Select-Object -First 1
    if (-not $seed) {
      Write-Error "No .env, and no .env.scaffold/.env.example to seed from. Create .env manually."
      return
    }
    Copy-Item -LiteralPath $seed -Destination $envPath
    Write-Host "Created .env from $(Split-Path -Leaf $seed) — fill in your values." -ForegroundColor Yellow
  }
  else {
    Write-Warning ".env not found at $envPath. Re-run with -Create to seed it from .env.scaffold/.env.example."
    return
  }
}

# Safety reminder — never commit real secrets.
if (-not (& git -C $repoRoot check-ignore .env 2>$null)) {
  Write-Warning ".env does NOT appear to be git-ignored. Do not commit it. Check .gitignore before saving secrets."
}

Write-Host "Opening $envPath" -ForegroundColor Cyan
Start-Process -FilePath 'notepad.exe' -ArgumentList $envPath
