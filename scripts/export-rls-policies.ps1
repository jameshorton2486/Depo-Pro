param(
  [Parameter(Mandatory = $false)]
  [string]$OutputPath = 'reports/rls-policies-current.json'
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

if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) {
  Write-Error 'DIRECT_URL is required'
  exit 1
}

try {
  $raw = & psql -X -v ON_ERROR_STOP=1 --dbname "$env:DIRECT_URL" -t -A -c @"
SELECT COALESCE(
  json_agg(
    json_build_object(
      'schemaname', schemaname,
      'tablename', tablename,
      'policyname', policyname,
      'permissive', permissive,
      'roles', roles,
      'cmd', cmd,
      'qual', qual,
      'with_check', with_check
    )
    ORDER BY tablename, policyname
  ),
  '[]'::json
)
FROM pg_policies
WHERE schemaname = 'public';
"@

  if ($LASTEXITCODE -ne 0) {
    throw 'psql export failed'
  }

  $text = ($raw | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($text)) {
    $policies = @()
  } else {
    $parsed = $text | ConvertFrom-Json
    if ($parsed -is [System.Array]) {
      $policies = $parsed
    } elseif ($null -eq $parsed) {
      $policies = @()
    } else {
      $policies = @($parsed)
    }
  }

  $payload = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    source = 'pg_policies'
    schema = 'public'
    policies = @($policies)
  }

  Write-JsonReport -Path $OutputPath -Payload $payload
  Write-Host "RLS policy export complete. policies=$($policies.Count) output=$OutputPath"
  exit 0
} catch {
  Write-Error "RLS policy export error: $($_.Exception.Message)"
  exit 1
}
