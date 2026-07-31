<#
.SYNOPSIS
  Open the repo-root .env file in Notepad.

.DESCRIPTION
  Resolves <repo>/.env. If missing, offers to copy .env.example → .env first.
  Does not print secret values.

.EXAMPLE
  .\scripts\open-env.ps1
#>

[CmdletBinding()]
param(
  [switch]$CreateFromExample
)

$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvPath = Join-Path $RepoRoot ".env"
$ExamplePath = Join-Path $RepoRoot ".env.example"

Set-Location $RepoRoot

if (-not (Test-Path -LiteralPath $EnvPath)) {
  if (-not $CreateFromExample) {
    $answer = Read-Host ".env not found at $EnvPath. Create from .env.example? (Y/n)"
    if ($answer -match '^[Nn]') {
      Write-Host "Aborted. Expected location: $EnvPath"
      exit 1
    }
  }

  if (-not (Test-Path -LiteralPath $ExamplePath)) {
    throw "Missing both .env and .env.example under $RepoRoot"
  }

  Copy-Item -LiteralPath $ExamplePath -Destination $EnvPath
  Write-Host "Created .env from .env.example"
}

$ignore = git check-ignore -v -- .env 2>$null
if (-not $ignore) {
  Write-Warning ".env does not appear to be git-ignored. Do not commit it."
} else {
  Write-Host "OK  git-ignored: $ignore"
}

Write-Host "Opening: $EnvPath"
notepad.exe $EnvPath
