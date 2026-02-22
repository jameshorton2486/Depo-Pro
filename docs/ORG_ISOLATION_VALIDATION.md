# Org Isolation Validation

This project includes an automated organization-isolation proof suite to validate that tenant boundaries cannot be bypassed through RLS or application-layer access.

## Required GitHub Secrets

Set these repository secrets in GitHub Actions:

- `DIRECT_URL`
- `TEST_USER_A`
- `TEST_USER_B`

`TEST_USER_A` and `TEST_USER_B` must be users in different organizations.

## Manual MCP Trigger

Use Claude MCP to run the isolation audit flow manually:

```bash
claude mcp run rls audit
```

If your local Claude MCP setup names the command differently, run the equivalent project MCP command that executes the RLS audit and isolation checks.

## Local Execution

Run the full suite locally:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-isolation-suite.ps1 -UserA "<TEST_USER_A_UUID>" -UserB "<TEST_USER_B_UUID>"
```

Or by environment variables:

```powershell
$env:DIRECT_URL="<postgres-direct-url>"
$env:TEST_USER_A="<TEST_USER_A_UUID>"
$env:TEST_USER_B="<TEST_USER_B_UUID>"
powershell -ExecutionPolicy Bypass -File scripts/run-isolation-suite.ps1
```

## What CI Enforces

Workflow: `.github/workflows/org-isolation.yml`

Triggered on:

- Pull requests
- Pushes to `main`

The workflow runs `scripts/run-isolation-suite.ps1`, which executes:

1. `scripts/rls-audit.ps1`
2. `scripts/test-org-isolation.ps1`
3. `scripts/service-role-scan.ps1`

CI fails automatically if any script exits non-zero. That includes:

- Missing/disabled RLS on required org-scoped tables
- Cross-org organization ID overlap between test users
- `SUPABASE_SERVICE_ROLE_KEY` usage outside approved server-only locations

Each script writes JSON output into `reports/` for traceability.
