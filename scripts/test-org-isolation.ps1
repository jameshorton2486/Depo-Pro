param(
  [Parameter(Mandatory = $false)]
  [string]$UserA = $(if ($env:TEST_USER_A) { $env:TEST_USER_A } else { $env:USER_A }),

  [Parameter(Mandatory = $false)]
  [string]$UserB = $(if ($env:TEST_USER_B) { $env:TEST_USER_B } else { $env:USER_B })
)

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

function Escape-SqlLiteral {
  param([string]$Value)
  return $Value.Replace("'", "''")
}

function Invoke-PsqlJson {
  param([string]$Sql)

  $raw = & psql -X -v ON_ERROR_STOP=1 --dbname "$env:DIRECT_URL" -t -A -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed"
  }

  $text = ($raw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return $null
  }

  return ($text | ConvertFrom-Json)
}

function Resolve-OrgExpression {
  param([string]$TableName)

  $safeTableName = Escape-SqlLiteral -Value $TableName
  $columns = Invoke-PsqlJson -Sql @"
SELECT COALESCE(
  json_agg(column_name ORDER BY ordinal_position),
  '[]'::json
)
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = '$safeTableName';
"@

  if ($null -eq $columns) {
    return $null
  }

  $columnSet = @{}
  foreach ($column in $columns) {
    $columnSet[$column] = $true
  }

  if ($columnSet.ContainsKey("org_id")) { return "org_id::text" }
  if ($columnSet.ContainsKey("organization_id")) { return "organization_id::text" }
  if ($columnSet.ContainsKey("organizationId")) { return """organizationId""::text" }
  if ($columnSet.ContainsKey("firm_id")) { return "firm_id::text" }
  if ($columnSet.ContainsKey("firmId")) { return """firmId""::text" }

  if ($TableName -eq "organization_memberships" -and $columnSet.ContainsKey("organization")) {
    return "organization::text"
  }

  return $null
}

function Get-UserTableSnapshot {
  param(
    [string]$UserId,
    [string]$TableName
  )

  $safeTableName = Escape-SqlLiteral -Value $TableName
  $tableExists = Invoke-PsqlJson -Sql @"
SELECT to_regclass('public.$safeTableName') IS NOT NULL AS exists;
"@

  if (-not [bool]$tableExists.exists) {
    return [ordered]@{
      tableExists = $false
      orgColumnExpression = $null
      rowCount = 0
      orgIds = @()
      note = "table_not_found"
    }
  }

  $orgExpr = Resolve-OrgExpression -TableName $TableName
  if ([string]::IsNullOrWhiteSpace($orgExpr)) {
    $safeUserId = Escape-SqlLiteral -Value $UserId
    $countOnly = Invoke-PsqlJson -Sql @"
BEGIN;
SET LOCAL ROLE authenticated;
WITH _ AS (
  SELECT set_config('request.jwt.claim.role', 'authenticated', true)
),
__ AS (
  SELECT set_config('request.jwt.claim.sub', '$safeUserId', true)
)
SELECT json_build_object(
  'tableExists', true,
  'orgColumnExpression', NULL,
  'rowCount', COUNT(*),
  'orgIds', '[]'::json,
  'note', 'no_org_column_detected'
)
FROM public."$TableName";
ROLLBACK;
"@

    return [ordered]@{
      tableExists = [bool]$countOnly.tableExists
      orgColumnExpression = $null
      rowCount = [int]$countOnly.rowCount
      orgIds = @()
      note = "no_org_column_detected"
    }
  }

  $safeUserId = Escape-SqlLiteral -Value $UserId
  $snapshot = Invoke-PsqlJson -Sql @"
BEGIN;
SET LOCAL ROLE authenticated;
WITH _ AS (
  SELECT set_config('request.jwt.claim.role', 'authenticated', true)
),
__ AS (
  SELECT set_config('request.jwt.claim.sub', '$safeUserId', true)
)
SELECT json_build_object(
  'tableExists', true,
  'orgColumnExpression', '$orgExpr',
  'rowCount', COUNT(*),
  'orgIds', COALESCE(
    json_agg(DISTINCT $orgExpr) FILTER (WHERE $orgExpr IS NOT NULL),
    '[]'::json
  ),
  'note', NULL
)
FROM public."$TableName";
ROLLBACK;
"@

  return $snapshot
}

if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) {
  Write-Error "DIRECT_URL is required"
  exit 1
}

$uuidPattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
if ([string]::IsNullOrWhiteSpace($UserA) -or [string]::IsNullOrWhiteSpace($UserB)) {
  Write-Error "TEST_USER_A and TEST_USER_B are required (parameters or environment variables)."
  exit 1
}
if ($UserA -notmatch $uuidPattern -or $UserB -notmatch $uuidPattern) {
  Write-Error "TEST_USER_A and TEST_USER_B must be valid UUID values."
  exit 1
}

$tablesToCheck = @("jobs", "transcripts", "organization_memberships")
$userAResults = [ordered]@{}
$userBResults = [ordered]@{}

foreach ($table in $tablesToCheck) {
  $userAResults[$table] = Get-UserTableSnapshot -UserId $UserA -TableName $table
  $userBResults[$table] = Get-UserTableSnapshot -UserId $UserB -TableName $table
}

$userAOrgIds = New-Object System.Collections.Generic.HashSet[string]
$userBOrgIds = New-Object System.Collections.Generic.HashSet[string]

foreach ($table in $tablesToCheck) {
  foreach ($orgId in $userAResults[$table].orgIds) {
    if (-not [string]::IsNullOrWhiteSpace([string]$orgId)) {
      [void]$userAOrgIds.Add([string]$orgId)
    }
  }
  foreach ($orgId in $userBResults[$table].orgIds) {
    if (-not [string]::IsNullOrWhiteSpace([string]$orgId)) {
      [void]$userBOrgIds.Add([string]$orgId)
    }
  }
}

$overlap = New-Object System.Collections.Generic.List[string]
foreach ($orgId in $userAOrgIds) {
  if ($userBOrgIds.Contains($orgId)) {
    $overlap.Add($orgId)
  }
}

$overlapDetected = $overlap.Count -gt 0
$reportPath = "reports/org-isolation-test.json"
$report = [ordered]@{
  timestamp = (Get-Date).ToUniversalTime().ToString("o")
  userA = [ordered]@{
    id = $UserA
    tables = $userAResults
    allOrgIds = @($userAOrgIds)
  }
  userB = [ordered]@{
    id = $UserB
    tables = $userBResults
    allOrgIds = @($userBOrgIds)
  }
  overlapDetected = $overlapDetected
  overlappingOrgIds = @($overlap)
}

Write-JsonReport -Path $reportPath -Payload $report

if ($overlapDetected) {
  Write-Host "ORG ISOLATION TEST: FAIL (overlap detected)"
  Write-Error "Cross-org overlap detected: $($overlap -join ', ')"
  exit 1
}

Write-Host "ORG ISOLATION TEST: PASS (userA_orgs=$($userAOrgIds.Count), userB_orgs=$($userBOrgIds.Count))"
Write-Host "Report written to $reportPath"
