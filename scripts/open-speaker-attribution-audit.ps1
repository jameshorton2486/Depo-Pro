$repoRoot = Split-Path -Parent $PSScriptRoot
$auditPath = Join-Path $repoRoot "docs\audits\SPEAKER_ATTRIBUTION_AUDIT_2026-06-15.md"

if (-not (Test-Path -LiteralPath $auditPath)) {
  New-Item -ItemType File -Path $auditPath | Out-Null
}

Start-Process notepad.exe -ArgumentList $auditPath
