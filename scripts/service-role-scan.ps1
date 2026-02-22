param()

$ErrorActionPreference = "Stop"

function Write-JsonReport {
  param(
    [string]$Path,
    [object]$Payload
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $Payload | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Is-AllowedPath {
  param([string]$Path)

  $normalized = ($Path -replace "\\", "/")

  if ($normalized -match "^lib/server/") {
    return $true
  }

  if ($normalized -match "^app/api/.+/route\.(ts|tsx|js|jsx)$") {
    return $true
  }

  if ($normalized -match "^pages/api/.+\.(ts|tsx|js|jsx)$") {
    return $true
  }

  return $false
}

$searchRoots = @("app", "components", "client", "lib", "pages") | Where-Object { Test-Path -LiteralPath $_ }
$gitArgs = @("grep", "-n", "SUPABASE_SERVICE_ROLE_KEY")
if ($searchRoots.Count -gt 0) {
  $gitArgs += "--"
  $gitArgs += $searchRoots
}

$gitOutput = & git @gitArgs
$exitCode = $LASTEXITCODE

$matches = @()
if ($exitCode -eq 0) {
  $matches = $gitOutput
} elseif ($exitCode -ne 1) {
  throw "git grep failed with exit code $exitCode"
}

$violations = New-Object System.Collections.Generic.List[object]
$parsedMatches = New-Object System.Collections.Generic.List[object]

foreach ($line in $matches) {
  $parts = $line -split ":", 3
  if ($parts.Count -lt 3) {
    continue
  }

  $path = $parts[0]
  $lineNumber = $parts[1]
  $content = $parts[2]

  $entry = [ordered]@{
    path = $path
    line = [int]$lineNumber
    text = $content.Trim()
    allowed = (Is-AllowedPath -Path $path)
  }

  $parsedMatches.Add($entry)
  if (-not $entry.allowed) {
    $violations.Add($entry)
  }
}

$reportPath = "reports/service-role-scan.json"
$report = [ordered]@{}
$report.timestamp = (Get-Date).ToUniversalTime().ToString("o")
$report.totalMatches = $parsedMatches.Count
$report.matches = @($parsedMatches.ToArray())
$report.violations = @($violations.ToArray())

Write-JsonReport -Path $reportPath -Payload $report

if ($violations.Count -gt 0) {
  Write-Host "SERVICE ROLE SCAN: FAIL ($($violations.Count) violation(s))"
  Write-Error "Service role key usage violations found: $($violations.Count). See $reportPath"
  exit 1
}

Write-Host "SERVICE ROLE SCAN: PASS (matches=$($parsedMatches.Count), violations=0)"
Write-Host "Report written to $reportPath"
