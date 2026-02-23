# CI Secrets Reference

## Secrets Required by Workflow

### `org-isolation.yml` and `org-isolation-suite.yml`

| Secret | Type | Description | Source |
|--------|------|-------------|--------|
| `DIRECT_URL` | PostgreSQL URI | Direct connection (port 5432) for psql-based RLS auditing | Supabase → Project Settings → Database → Connection string → URI (use port 5432, NOT 6543) |
| `TEST_USER_A` | UUID | Auth user ID in CI Test Firm Alpha | Run `npx tsx scripts/create-test-users.ts` |
| `TEST_USER_B` | UUID | Auth user ID in CI Test Firm Beta (DIFFERENT org) | Same script, second output |

### Other Workflows

`version-guard.yml`, `quality-gates.yml`, and `ci.yml` do **not** require any GitHub secrets.
The CI build uses hardcoded placeholder values for `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SERVICE_ROLE_KEY`.

---

## Setup Instructions

### Step 1 — Create test users (run locally with .env.local loaded)

```bash
npx tsx scripts/create-test-users.ts
```

This creates two test users in separate firms and prints the `gh secret set` commands to use.

### Step 2 — Set the database connection secret

```bash
gh secret set DIRECT_URL --repo jameshorton2486/depo-pro
# Paste when prompted:
# postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

> **Important**: Use port `5432` (direct connection), NOT `6543` (pooler). The pooler does not
> support the DDL/RLS audit queries used in the isolation suite.

### Step 3 — Set test user UUIDs (from Step 1 output)

```bash
gh secret set TEST_USER_A --body "<uuid-from-step-1>" --repo jameshorton2486/depo-pro
gh secret set TEST_USER_B --body "<uuid-from-step-1>" --repo jameshorton2486/depo-pro
```

---

## Important Notes

### TEST_USER_A and TEST_USER_B must be in DIFFERENT firms

The org isolation suite verifies that User A **cannot** read User B's jobs, transcriptions, or
profiles. If both users are in the same firm, the test will falsely pass.

### DIRECT_URL is intentionally CI-only

`DIRECT_URL` is documented as "deprecated" in `.env.example` because application code no longer
uses it (Prisma was removed). However, CI security scripts use it for raw `psql` queries to audit
RLS policies. This is intentional and correct.

### Runner OS

The org-isolation workflow runs on `ubuntu-latest`. `psql` (PostgreSQL client) is pre-installed
on Ubuntu GitHub runners. The PowerShell scripts (`.ps1`) work via `pwsh` (PowerShell Core),
which is also pre-installed on ubuntu-latest runners.

> Historical note: The workflow previously used `windows-latest`, but `psql` is not available
> on Windows runners. Fixed in the Feb 2026 infrastructure stabilization pass.

---

## Secret Inventory Summary

| Secret | Workflows | Required |
|--------|-----------|----------|
| `DIRECT_URL` | `org-isolation.yml`, `org-isolation-suite.yml` | YES |
| `TEST_USER_A` | `org-isolation.yml`, `org-isolation-suite.yml` | YES |
| `TEST_USER_B` | `org-isolation.yml`, `org-isolation-suite.yml` | YES |

**Total secrets required: 3**

No secrets are required for: `ci.yml`, `quality-gates.yml`, `version-guard.yml`
