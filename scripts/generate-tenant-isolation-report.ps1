param(
  [Parameter(Mandatory = $false)]
  [string]$UserA = $(if ($env:TEST_USER_A) { $env:TEST_USER_A } else { $env:USER_A }),

  [Parameter(Mandatory = $false)]
  [string]$UserB = $(if ($env:TEST_USER_B) { $env:TEST_USER_B } else { $env:USER_B })
)

$ErrorActionPreference = 'Stop'

function Write-JsonReport {
  param(
    [string]$Path,
    [object]$Payload
  )

  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory -Force | Out-Null
  }

  $Payload | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Run-Step {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [hashtable]$NamedArguments = @{},
    [string]$ReportPath = $null
  )

  $result = [ordered]@{
    name = $Name
    script = $ScriptPath
    exitCode = 1
    passed = $false
    reportPath = $ReportPath
    reportLoaded = $false
    report = $null
    error = $null
  }

  try {
    & $ScriptPath @NamedArguments
    if ($null -ne $LASTEXITCODE) {
      $result.exitCode = $LASTEXITCODE
    } else {
      $result.exitCode = 0
    }
    $result.passed = ($result.exitCode -eq 0)
  } catch {
    $result.exitCode = 1
    $result.passed = $false
    $result.error = $_.Exception.Message
  }

  if (-not [string]::IsNullOrWhiteSpace($ReportPath) -and (Test-Path -LiteralPath $ReportPath)) {
    try {
      $result.report = Get-Content -LiteralPath $ReportPath -Raw | ConvertFrom-Json
      $result.reportLoaded = $true
    } catch {
      $result.reportLoaded = $false
      if ([string]::IsNullOrWhiteSpace($result.error)) {
        $result.error = "Failed reading report ${ReportPath}: $($_.Exception.Message)"
      }
    }
  }

  return $result
}

$steps = @()
$steps += (Run-Step -Name 'RLS Audit' -ScriptPath "$PSScriptRoot/rls-audit.ps1" -ReportPath 'reports/rls-policy-report.json')
$steps += (Run-Step -Name 'RLS Policy Linter' -ScriptPath "$PSScriptRoot/rls-policy-linter.ps1" -ReportPath 'reports/rls-lint-report.json')
$steps += (Run-Step -Name 'Cross-Org Isolation Test' -ScriptPath "$PSScriptRoot/test-org-isolation.ps1" -NamedArguments @{ UserA = $UserA; UserB = $UserB } -ReportPath 'reports/org-isolation-test.json')
$steps += (Run-Step -Name 'Service Role Scan' -ScriptPath "$PSScriptRoot/service-role-scan.ps1" -ReportPath 'reports/service-role-scan.json')

$rlsReport = $steps[0].report
$linterReport = $steps[1].report
$orgReport = $steps[2].report
$serviceReport = $steps[3].report

$tablesTotal = 0
$rlsEnabled = 0
if ($null -ne $rlsReport -and $null -ne $rlsReport.tables) {
  $tablesTotal = @($rlsReport.tables).Count
  $rlsEnabled = @($rlsReport.tables | Where-Object { [bool]$_.relrowsecurity }).Count
}

$rlsViolations = if ($null -ne $rlsReport -and $null -ne $rlsReport.violations) { @($rlsReport.violations).Count } else { 0 }
$linterViolations = if ($null -ne $linterReport -and $null -ne $linterReport.violations) { @($linterReport.violations).Count } else { 0 }
$serviceViolations = if ($null -ne $serviceReport -and $null -ne $serviceReport.violations) { @($serviceReport.violations).Count } else { 0 }
$overlapDetected = if ($null -ne $orgReport) { [bool]$orgReport.overlapDetected } else { $true }

$totalViolations = $rlsViolations + $linterViolations + $serviceViolations
$allStepsPassed = @($steps | Where-Object { -not $_.passed }).Count -eq 0
$serviceRoleExposure = $serviceViolations -gt 0

$status = if ($allStepsPassed -and $totalViolations -eq 0 -and -not $overlapDetected) { 'PASS' } else { 'FAIL' }

$dashboard = [ordered]@{
  timestamp = (Get-Date).ToUniversalTime().ToString('o')
  summary = [ordered]@{
    tablesTotal = $tablesTotal
    rlsEnabled = $rlsEnabled
    violations = $totalViolations
    overlapDetected = $overlapDetected
    serviceRoleExposure = $serviceRoleExposure
  }
  status = $status
  checks = @($steps)
}

$dashboardPath = 'reports/tenant-isolation-dashboard.json'
Write-JsonReport -Path $dashboardPath -Payload $dashboard

Write-Host "TENANT ISOLATION DASHBOARD STATUS: $status"
Write-Host "Summary: tablesTotal=$tablesTotal rlsEnabled=$rlsEnabled violations=$totalViolations overlapDetected=$overlapDetected serviceRoleExposure=$serviceRoleExposure"
Write-Host "Dashboard written to $dashboardPath"

if ($status -ne 'PASS') {
  exit 1
}

exit 0
