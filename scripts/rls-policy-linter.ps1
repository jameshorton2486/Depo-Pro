param()

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

function Invoke-PsqlJson {
  param([string]$Sql)

  $raw = & psql -X -v ON_ERROR_STOP=1 --dbname "$env:DIRECT_URL" -t -A -c $Sql
  if ($LASTEXITCODE -ne 0) {
    throw 'psql command failed'
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

function Has-OrgMembershipCheck {
  param([string]$Expression)

  if ([string]::IsNullOrWhiteSpace($Expression)) {
    return $false
  }

  $normalized = $Expression.ToLowerInvariant()
  $hasMembership = $normalized -match 'organization_memberships'
  $hasAuthUid = $normalized -match 'auth\.uid\s*\(\s*\)'
  $hasOrgField = ($normalized -match 'organization_id') -or ($normalized -match 'org_id') -or ($normalized -match 'organizationid')
  return ($hasMembership -and $hasAuthUid -and $hasOrgField)
}

function Has-TrueWithoutOrgCheck {
  param([string]$Expression)

  if ([string]::IsNullOrWhiteSpace($Expression)) {
    return $false
  }

  $normalized = $Expression.ToLowerInvariant()
  if ($normalized -notmatch '\btrue\b') {
    return $false
  }

  return -not (Has-OrgMembershipCheck -Expression $Expression)
}

if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) {
  Write-Error 'DIRECT_URL is required'
  exit 1
}

$reportPath = 'reports/rls-lint-report.json'
$violations = @()

try {
  $tables = Invoke-PsqlJson -Sql @"
SELECT COALESCE(
  json_agg(
    json_build_object(
      'tableName', t.table_name,
      'hasOrgColumn', t.has_org_column,
      'hasOrganizationIdColumn', t.has_organization_id_column,
      'rlsEnabled', t.rls_enabled
    )
    ORDER BY t.table_name
  ),
  '[]'::json
)
FROM (
  SELECT
    c.relname AS table_name,
    bool_or(ic.column_name IN ('organizationId', 'organization_id', 'org_id')) AS has_org_column,
    bool_or(ic.column_name = 'organizationId') AS has_organization_id_column,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  LEFT JOIN information_schema.columns ic
    ON ic.table_schema = 'public'
   AND ic.table_name = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  GROUP BY c.relname, c.relrowsecurity
) t;
"@

  $policies = Invoke-PsqlJson -Sql @"
SELECT COALESCE(
  json_agg(
    json_build_object(
      'schemaname', p.schemaname,
      'tablename', p.tablename,
      'policyname', p.policyname,
      'cmd', p.cmd,
      'qual', p.qual,
      'withCheck', p.with_check,
      'roles', p.roles,
      'permissive', p.permissive
    )
    ORDER BY p.tablename, p.policyname
  ),
  '[]'::json
)
FROM pg_policies p
WHERE p.schemaname = 'public';
"@

  $policiesByTable = @{}
  foreach ($policy in $policies) {
    $tableName = [string]$policy.tablename
    if ([string]::IsNullOrWhiteSpace($tableName)) {
      continue
    }
    if (-not $policiesByTable.ContainsKey($tableName)) {
      $policiesByTable[$tableName] = @()
    }
    $policiesByTable[$tableName] += $policy

    $qual = [string]$policy.qual
    $withCheck = [string]$policy.withCheck
    $combined = "$qual $withCheck"
    if ($combined.ToLowerInvariant() -match 'service_role') {
      $violations += [ordered]@{
        table = $tableName
        policy = [string]$policy.policyname
        reason = 'Policy references service_role (forbidden)'
      }
    }
  }

  foreach ($table in $tables) {
    $tableName = [string]$table.tableName
    if ([string]::IsNullOrWhiteSpace($tableName)) {
      continue
    }

    $isOrgTable = [bool]$table.hasOrgColumn
    if (-not $isOrgTable) {
      continue
    }

    if (-not [bool]$table.rlsEnabled) {
      $violations += [ordered]@{
        table = $tableName
        policy = ''
        reason = 'RLS is disabled on table containing organization column'
      }
    }

    $tablePolicies = @()
    if ($policiesByTable.ContainsKey($tableName)) {
      $tablePolicies = @($policiesByTable[$tableName])
    }

    $selectPolicies = @($tablePolicies | Where-Object {
      $cmd = [string]$_.cmd
      $cmdLower = $cmd.ToLowerInvariant()
      $cmdLower -eq 'select' -or $cmdLower -eq 'all'
    })

    if ($selectPolicies.Count -eq 0) {
      $violations += [ordered]@{
        table = $tableName
        policy = ''
        reason = 'Missing SELECT policy on org-scoped table'
      }
    }

    foreach ($policy in $selectPolicies) {
      $qual = [string]$policy.qual
      if (-not (Has-OrgMembershipCheck -Expression $qual)) {
        $violations += [ordered]@{
          table = $tableName
          policy = [string]$policy.policyname
          reason = 'SELECT policy missing organization_memberships + auth.uid() org validation'
        }
      }

      if ($qual.Trim().ToLowerInvariant() -eq 'true') {
        $violations += [ordered]@{
          table = $tableName
          policy = [string]$policy.policyname
          reason = 'USING (true) not allowed on org-scoped table'
        }
      }
    }

    foreach ($policy in $tablePolicies) {
      $qual = [string]$policy.qual
      $withCheck = [string]$policy.withCheck
      if (Has-TrueWithoutOrgCheck -Expression $qual) {
        $violations += [ordered]@{
          table = $tableName
          policy = [string]$policy.policyname
          reason = 'USING clause contains true without org validation'
        }
      }
      if (Has-TrueWithoutOrgCheck -Expression $withCheck) {
        $violations += [ordered]@{
          table = $tableName
          policy = [string]$policy.policyname
          reason = 'WITH CHECK clause contains true without org validation'
        }
      }
    }
  }

  $report = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    tablesChecked = @($tables | ForEach-Object { $_.tableName })
    violations = @($violations)
  }

  Write-JsonReport -Path $reportPath -Payload $report

  if (@($violations).Count -gt 0) {
    Write-Host "RLS POLICY LINTER: FAIL ($(@($violations).Count) violation(s))"
    Write-Host "RLS linter found violations. See $reportPath"
    exit 1
  }

  Write-Host "RLS POLICY LINTER: PASS (tablesChecked=$(@($tables).Count), violations=0)"
  Write-Host "Report written to $reportPath"
  exit 0
} catch {
  Write-Host "RLS policy linter execution error: $($_.Exception.Message)"
  exit 1
}
