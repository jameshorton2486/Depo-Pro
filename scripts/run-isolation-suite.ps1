param(
  [Parameter(Mandatory = $false)]
  [string]$UserA = $(if ($env:TEST_USER_A) { $env:TEST_USER_A } else { $env:USER_A }),

  [Parameter(Mandatory = $false)]
  [string]$UserB = $(if ($env:TEST_USER_B) { $env:TEST_USER_B } else { $env:USER_B })
)

$ErrorActionPreference = "Stop"

function Run-Step {
  param(
    [string]$Name,
    [string]$ScriptPath,
    [hashtable]$NamedArguments = @{}
  )

  Write-Host "Running $Name..."
  $exitCode = 0
  try {
    & $ScriptPath @NamedArguments
    if ($null -ne $LASTEXITCODE) {
      $exitCode = $LASTEXITCODE
    }
  } catch {
    $exitCode = 1
    Write-Host "$Name failed: $($_.Exception.Message)"
  }

  return [ordered]@{
    name = $Name
    exitCode = $exitCode
    passed = ($exitCode -eq 0)
  }
}

try {
  $steps = New-Object System.Collections.Generic.List[object]
  $failed = $false

  $rlsResult = Run-Step -Name "RLS Audit" -ScriptPath "$PSScriptRoot/rls-audit.ps1"
  $steps.Add($rlsResult)
  if (-not $rlsResult.passed) { $failed = $true }

  $orgArgs = @{}
  if (-not [string]::IsNullOrWhiteSpace($UserA)) {
    $orgArgs["UserA"] = $UserA
  }
  if (-not [string]::IsNullOrWhiteSpace($UserB)) {
    $orgArgs["UserB"] = $UserB
  }
  $orgResult = Run-Step -Name "Cross-Org Isolation Test" -ScriptPath "$PSScriptRoot/test-org-isolation.ps1" -NamedArguments $orgArgs
  $steps.Add($orgResult)
  if (-not $orgResult.passed) { $failed = $true }

  $serviceRoleResult = Run-Step -Name "Service Role Scan" -ScriptPath "$PSScriptRoot/service-role-scan.ps1"
  $steps.Add($serviceRoleResult)
  if (-not $serviceRoleResult.passed) { $failed = $true }

  $status = if ($failed) { "FAIL" } else { "PASS" }
  Write-Host ""
  Write-Host "ORG ISOLATION STATUS: $status"

  foreach ($step in $steps) {
    $stepStatus = if ($step.passed) { "PASS" } else { "FAIL" }
    Write-Host "$($step.name): $stepStatus"
  }

  if ($failed) {
    exit 1
  }
  exit 0
} catch {
  Write-Host ""
  Write-Host "ORG ISOLATION STATUS: FAIL"
  Write-Error "Isolation suite execution error: $($_.Exception.Message)"
  exit 1
}
