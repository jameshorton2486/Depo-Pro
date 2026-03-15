# Infrastructure Stability Report

**Generated**: 2026-02-23
**Scope**: Full infrastructure stabilization + MVP Phase 1 readiness pass

---

## WORKSTREAM SUMMARY

| # | Workstream | Status | Files Changed |
|---|-----------|--------|---------------|
| 1 | Migration Drift Stabilization | ✅ Audited — manual CLI step required | `docs/MIGRATION_AUDIT.md` (created) |
| 2 | CI & GitHub Actions Hardening | ✅ Fixed | `.github/workflows/org-isolation-suite.yml` |
| 3 | Environment Architecture | ✅ Fixed + Documented | `.env.example`, `docs/ENVIRONMENT_ARCHITECTURE.md` (created) |
| 4 | MVP Phase 1 Backend Prep | ✅ Fixed | `lib/logger.ts` |
| 5 | Pre-Build Validation | ✅ Clean | — |

---

## WORKSTREAM 1 — MIGRATION DRIFT

### Audit Table

| File | Valid? | Action |
|------|--------|--------|
| `20260124_wkt_quiz_tables.sql` | ⚠️ Malformed (8-digit date) | See repair steps below |
| `20260208000000_base_schema.sql` | ✅ Valid | No action |
| `20260209000001_critical_fixes_C1_C2_C4.sql` | ✅ Valid | No action |
| `20260209010000_placeholder.sql` | ✅ Valid | No action |
| `20260209010100_critical_fixes_rc1_to_rc5.sql` | ✅ Valid | No action |
| `20260209010200_critical_fixes_rc6_to_rc8.sql` | ✅ Valid | No action |
| `20260211120000_fix_wkt_questions_admin_policy.sql` | ✅ Valid | No action |
| `20260211140000_add_bates_prefix_to_jobs.sql` | ✅ Valid | No action |
| `20260211150000_add_confidence_analytics.sql` | ✅ Valid | No action |

### Before State
- 1 malformed migration file using `YYYYMMDD` (8-digit) format
- Previously removed malformed files (20260209/211/212/213 prefixes) still in backup folder for reference

### After State
- All active migration files documented
- `docs/MIGRATION_AUDIT.md` created with full repair decision tree

### Manual Steps Required
```bash
supabase login
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase migration list              # Confirm remote state of "20260124"
supabase db push --dry-run           # Confirm zero drift
```
See `docs/MIGRATION_AUDIT.md` for the full repair decision tree.

---

## WORKSTREAM 2 — CI & GITHUB ACTIONS

### Before State
- `org-isolation.yml` used secrets: `TEST_USER_A`, `TEST_USER_B`
- `org-isolation-suite.yml` used secrets: `ORG_TEST_USER_A`, `ORG_TEST_USER_B` → mapped to `USER_A/B` env vars
- Result: Two separate GitHub secrets required for functionally identical values

### After State
- Both workflows now use `TEST_USER_A` / `TEST_USER_B` secrets
- Zero duplicate secrets needed
- `run-isolation-suite.ps1` already supported both variable names (prefers `TEST_USER_A`)

### Secret Inventory

| Secret | Used In Workflows | Required |
|--------|-----------------|---------|
| `DIRECT_URL` | `org-isolation.yml`, `org-isolation-suite.yml` | YES — CI only |
| `TEST_USER_A` | `org-isolation.yml`, `org-isolation-suite.yml` | YES — CI only |
| `TEST_USER_B` | `org-isolation.yml`, `org-isolation-suite.yml` | YES — CI only |

No secrets are needed for: `ci.yml`, `quality-gates.yml`, `version-guard.yml`

### gh secret set commands (run once in GitHub repo)
```bash
gh secret set DIRECT_URL
gh secret set TEST_USER_A
gh secret set TEST_USER_B
```

---

## WORKSTREAM 3 — ENVIRONMENT ARCHITECTURE

### Before State
- `.env.example` listed legacy SMTP variable names but code reads `RESEND_API_KEY` → email silently broken for anyone copying the example
- `NEXT_PUBLIC_APP_URL` used by transcription routes but undocumented
- `INTERNAL_API_SECRET` used by process-chunk endpoint but undocumented
- `DIRECT_URL`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` undocumented in example
- No comprehensive env architecture doc existed

### After State
- `.env.example` now uses correct `EMAIL_HOST/PORT/USER/PASSWORD` names
- All 4 CI/ops variables documented in `.env.example`
- `NEXT_PUBLIC_APP_URL` and `INTERNAL_API_SECRET` added
- `docs/ENVIRONMENT_ARCHITECTURE.md` created — canonical reference for all variables

### Variables Fixed in `.env.example`

| Old | New | Impact |
|-----|-----|--------|
| legacy SMTP vars | `RESEND_API_KEY` | Email was silently broken |
| (missing) | `NEXT_PUBLIC_APP_URL` | Transcription scheduler base URL |
| (missing) | `INTERNAL_API_SECRET` | Chunk endpoint auth |
| (missing) | `DIRECT_URL` | CLI/CI direct DB |
| (missing) | `SUPABASE_ACCESS_TOKEN` | CLI auth |
| (missing) | `SUPABASE_PROJECT_ID` | CLI project reference |
| (missing) | `SUPABASE_DB_PASSWORD` | CLI migrations |

---

## WORKSTREAM 4 — MVP PHASE 1 BACKEND PREP

### Logger Audit

| File | Status | Issue |
|------|--------|-------|
| `lib/logger.ts` | ✅ Fixed | See below |
| `lib/logger/index.ts` | ✅ OK | Clean, used internally |
| `lib/logger/enhanced-logger.server.ts` | ✅ OK | Server-only, file-writing logger |

### Critical Bug Fixed: `lib/logger.ts`

**Root cause**: The `switch(level)` block had a `case 'debug': case 'info': logger.debug(output)` fallthrough. This called `logger.debug(output)` recursively.

**Production impact**: In production (`LOG_LEVEL=info`), `shouldLog('debug')` returns false, so the recursion terminates. However, **`logger.info()` messages were silently dropped** because:
1. `logger.info("msg")` → `log('info', 'msg')` → `shouldLog('info')` = true
2. Switch falls to `case 'info': logger.debug(output)` → `log('debug', output)`
3. `shouldLog('debug')` = false in production → early return → **nothing logged**

**Fix**: Split the cases to use `console.debug` and `console.info` directly.

```typescript
// Before (BROKEN):
case 'debug':
case 'info':
  logger.debug(output);  // recursive, silently drops info in production
  break;

// After (FIXED):
case 'debug':
  console.debug(output);
  break;
case 'info':
  console.info(output);
  break;
```

**Scope**: All ~80 API routes importing `@/lib/logger` now correctly emit `info`-level logs.

### Schema Verification (No Prisma — Supabase SQL)

All required fields from MVP Phase 1 checklist are confirmed present:

| Field | Table | Status |
|-------|-------|--------|
| `words` (JSONB) | `transcriptions` | ✅ Present |
| `segments` (JSONB) | `transcriptions` | ✅ Present |
| `original_transcript` | `transcriptions` | ✅ Present + immutable trigger |
| `full_transcript` | `transcriptions` | ✅ Present |
| `status` (enum) | `transcriptions` | ✅ Present |
| Edit audit model | `transcription_edits` | ✅ Full model present |
| `original_value` / `new_value` | `transcription_edits` | ✅ Present |
| `pre_edit_hash` / `post_edit_hash` | `transcription_edits` | ✅ Present |
| Integrity chain | `transcript_integrity_chain` | ✅ Present with append function |

Job ↔ Transcription relationship:
- `transcriptions.job_id` → `jobs.id` (UNIQUE FK, CASCADE DELETE) ✅
- One-to-one relationship enforced at DB level ✅

---

## WORKSTREAM 5 — PRE-BUILD VALIDATION

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Clean — 0 errors |
| `npm run lint` | ✅ Clean — 0 warnings |
| Build (requires `.env.local` or CI env) | Not run locally — CI validates |

---

## INFRASTRUCTURE STABILITY REPORT

### Migration Status
**Partially clean.** 8 of 9 active migration files are valid. One malformed file (`20260124`) requires a manual `supabase migration list` check before it can be renamed. See `docs/MIGRATION_AUDIT.md`.

### CI Readiness
**Ready.** Workflows are syntactically valid. Secret naming is now consistent across both org-isolation workflows. Only 3 secrets required (`DIRECT_URL`, `TEST_USER_A`, `TEST_USER_B`).

### Environment Status
**Fully documented.** `docs/ENVIRONMENT_ARCHITECTURE.md` is the canonical reference. `.env.example` now matches variable names actually read by code. Four previously undocumented variables added.

### Schema Integrity
**Strong.** The Supabase SQL schema has:
- Org isolation via `firm_id` on `jobs`, `profiles`, `firms`, `custom_vocabularies`, `firm_vocabularies`
- RLS policies with firm-scoping (C-1 fixes applied)
- Immutability triggers on `original_transcript`, `deepgram_raw_json`, `original_integrity_hash`
- Full edit audit trail with integrity chain
- Soft-delete columns on key tables
- All transcription fields required for Deepgram Phase 1

### Ready for MVP Phase 1?

**YES — with one pre-condition:**

Before beginning product features, complete the migration repair:
```bash
supabase link --project-ref $SUPABASE_PROJECT_ID
supabase migration list
supabase db push --dry-run
```
If dry-run shows zero drift, the project is fully ready for Deepgram Phase 1 development.
