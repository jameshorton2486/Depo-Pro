param(
  [Parameter(Mandatory = $false)]
  [string]$BaselinePath = 'security-baseline/rls-policies.json',

  [Parameter(Mandatory = $false)]
  [string]$CurrentPath = 'reports/rls-policies-current.json'
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

  $Payload | ConvertTo-Json -Depth 30 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function CanonicalLine {
  param([object]$Policy)

  function AsText {
    param([object]$Value)
    if ($null -eq $Value) { return '' }
    return [string]$Value
  }

  $roles = ''
  if ($null -ne $Policy.roles) {
    if ($Policy.roles -is [System.Array]) {
      $roles = ($Policy.roles | ForEach-Object { [string]$_ } | Sort-Object) -join ','
    } else {
      $roles = [string]$Policy.roles
    }
  }

  $parts = @(
    (AsText $Policy.schemaname),
    (AsText $Policy.tablename),
    (AsText $Policy.policyname),
    (AsText $Policy.permissive),
    (AsText $roles),
    (AsText $Policy.cmd),
    (AsText $Policy.qual),
    (AsText $Policy.with_check)
  )
  return ($parts -join '|')
}

if (-not (Test-Path -LiteralPath $BaselinePath)) {
  Write-Error "Baseline file missing: $BaselinePath"
  exit 1
}
if (-not (Test-Path -LiteralPath $CurrentPath)) {
  Write-Error "Current policy snapshot missing: $CurrentPath"
  exit 1
}

try {
  $baselineJson = Get-Content -LiteralPath $BaselinePath -Raw | ConvertFrom-Json
  $currentJson = Get-Content -LiteralPath $CurrentPath -Raw | ConvertFrom-Json

  $baselinePolicies = @($baselineJson.policies)
  $currentPolicies = @($currentJson.policies)

  $baselineLines = @($baselinePolicies | ForEach-Object { CanonicalLine -Policy $_ } | Sort-Object)
  $currentLines = @($currentPolicies | ForEach-Object { CanonicalLine -Policy $_ } | Sort-Object)

  $diff = Compare-Object -ReferenceObject $baselineLines -DifferenceObject $currentLines
  $removed = @($diff | Where-Object { $_.SideIndicator -eq '<=' } | ForEach-Object { $_.InputObject })
  $added = @($diff | Where-Object { $_.SideIndicator -eq '=>' } | ForEach-Object { $_.InputObject })

  $violations = @()

  if ($removed.Count -gt 0) {
    foreach ($line in $removed) {
      $violations += [ordered]@{
        type = 'policy_removed_or_changed'
        detail = $line
      }
    }
  }

  if ($added.Count -gt 0) {
    foreach ($line in $added) {
      $violations += [ordered]@{
        type = 'policy_added_or_changed'
        detail = $line
      }
    }
  }

  foreach ($line in $currentLines) {
    $lower = $line.ToLowerInvariant()
    if ($lower -match '\|select\|' -and $lower -notmatch 'organization_memberships') {
      $violations += [ordered]@{
        type = 'missing_org_clause'
        detail = $line
      }
    }
    if ($lower -match '\|true\|' -and $lower -notmatch 'organization_memberships') {
      $violations += [ordered]@{
        type = 'relaxed_condition'
        detail = $line
      }
    }
  }

  $reportPath = 'reports/rls-policy-diff-report.json'
  $report = @{}
  $report.timestamp = (Get-Date).ToUniversalTime().ToString('o')
  $report.baselinePolicyCount = $baselineLines.Count
  $report.currentPolicyCount = $currentLines.Count
  $report.removed = @($removed)
  $report.added = @($added)
  $report.violations = @($violations)

  Write-JsonReport -Path $reportPath -Payload $report

  if (@($violations).Count -gt 0) {
    Write-Host "RLS POLICY DIFF: FAIL ($(@($violations).Count) violation(s))"
    Write-Host "Policy drift/weakening detected. See $reportPath"
    exit 1
  }

  Write-Host "RLS POLICY DIFF: PASS (baseline=$($baselineLines.Count), current=$($currentLines.Count))"
  Write-Host "Report written to $reportPath"
  exit 0
} catch {
  Write-Host "RLS policy diff error: $($_.Exception.Message)"
  if ($_.InvocationInfo -and $_.InvocationInfo.PositionMessage) {
    Write-Host $_.InvocationInfo.PositionMessage
  }
  if ($_.ScriptStackTrace) {
    Write-Host $_.ScriptStackTrace
  }
  exit 1
}
