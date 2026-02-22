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

function Invoke-PsqlJson {
  param(
    [string]$Sql
  )

  $raw = & psql -X -v ON_ERROR_STOP=1 --dbname "$env:DIRECT_URL" -t -A -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw "psql command failed"
  }

  $text = ($raw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    return @()
  }

  $parsed = $text | ConvertFrom-Json
  if ($null -eq $parsed) {
    return @()
  }

  if ($parsed -is [System.Array]) {
    return $parsed
  }

  return @($parsed)
}

if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) {
  Write-Error "DIRECT_URL is required"
  exit 1
}

$reportPath = "reports/rls-policy-report.json"
$timestamp = (Get-Date).ToUniversalTime().ToString("o")
$violations = New-Object System.Collections.Generic.List[object]

try {
  $tables = Invoke-PsqlJson -Sql @"
SELECT COALESCE(
  json_agg(
    json_build_object(
      'tablename', t.tablename,
      'relrowsecurity', t.relrowsecurity
    )
    ORDER BY t.tablename
  ),
  '[]'::json
)
FROM (
  SELECT
    c.relname AS tablename,
    c.relrowsecurity
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
) t;
"@

  $policies = Invoke-PsqlJson -Sql @"
SELECT COALESCE(
  json_agg(
    json_build_object(
      'schemaname', p.schemaname,
      'tablename', p.tablename,
      'policyname', p.policyname,
      'cmd', p.cmd
    )
    ORDER BY p.tablename, p.policyname
  ),
  '[]'::json
)
FROM pg_policies p
WHERE p.schemaname = 'public';
"@

  $orgScopedTables = @(
    "organizations",
    "organization_memberships",
    "jobs",
    "transcripts",
    "profiles",
    "AuditLog",
    "TranscriptEdits",
    "WebhookDelivery"
  )

  $tableLookup = @{}
  foreach ($table in $tables) {
    $tableLookup[$table.tablename.ToString().ToLowerInvariant()] = $table
  }

  foreach ($requiredTable in $orgScopedTables) {
    $requiredKey = $requiredTable.ToLowerInvariant()
    if (-not $tableLookup.ContainsKey($requiredKey)) {
      $violations.Add([ordered]@{
          type = "missing_table"
          table = $requiredTable
          message = "Expected org-scoped table not found in public schema"
        })
      continue
    }

    if (-not [bool]$tableLookup[$requiredKey].relrowsecurity) {
      $violations.Add([ordered]@{
          type = "rls_disabled"
          table = $requiredTable
          message = "Row level security is disabled for org-scoped table"
        })
    }
  }

  $report = [ordered]@{
    timestamp = $timestamp
    tables = @($tables)
    policies = @($policies)
    violations = @($violations)
  }

  Write-JsonReport -Path $reportPath -Payload $report

  if ($violations.Count -gt 0) {
    Write-Host "RLS AUDIT: FAIL ($($violations.Count) violation(s))"
    Write-Error "RLS audit failed. See $reportPath"
    exit 1
  }

  Write-Host "RLS AUDIT: PASS (tables=$($tables.Count), policies=$($policies.Count))"
  Write-Host "Report written to $reportPath"
} catch {
  Write-Error "RLS audit execution error: $($_.Exception.Message)"
  exit 1
}
