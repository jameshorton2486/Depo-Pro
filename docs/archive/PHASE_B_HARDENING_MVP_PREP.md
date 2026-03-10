# Depo-Pro — Phase B+C: Production Hardening + MVP Foundation

**Version:** 5.0
**Date:** February 23, 2026
**Target:** Codex CLI or Cursor Agent mode
**Estimated runtime:** 30–45 minutes

---

## ⚠️ MANUAL PREREQUISITES — Complete Before Running

**You must complete these before running this prompt.** If any are missing, WS1 will detect and halt with instructions.

| Step | Command / Action |
|------|------------------|
| 1 | `supabase link --project-ref ildhcfspbmhuemzgvzyx` |
| 2 | `supabase migration repair --status reverted <old_version>` for each malformed version |
| 3 | `supabase migration list` → all Local/Remote aligned |
| 4 | `npx tsx scripts/create-test-users.ts` |
| 5 | `gh secret set DIRECT_URL` / `TEST_USER_A` / `TEST_USER_B` / `ORG_TEST_USER_A` / `ORG_TEST_USER_B` |

---

## Strategic Roadmap (What We Do vs. Don’t)

### ✅ Do First (in order)

1. Fix migrations manually
2. Confirm clean migration list
3. Fix GitHub secrets
4. Confirm CI green
5. Run schema audit (if not done)
6. Apply only critical schema fixes
7. Run production hardening
8. Then start MVP implementation (Phases 1–3 only)

### ❌ Do Not (post-MVP)

- Monetization / Stripe
- Autosave
- AI review automation
- Performance load simulation
- Architecture redesign
- Background job redesign

---

## Workstreams (8 total)

| WS | Name | Commit |
|----|------|--------|
| WS1 | Pre-flight verification (gates) | — |
| WS2 | Quick cleanup (husky, gitignore, logger) | `cleanup: fix husky, gitignore, logger duplicate` |
| WS3 | Storage URL architecture | `security: store file paths not URLs` |
| WS4 | Rate limiting on P0 routes | `security: add rate limiting to profile + AI review` |
| WS5 | Input validation expansion | `security: add Zod validation to ~14 routes` |
| WS6 | RLS policy gap closure | `security: add RLS policies (REVIEW BEFORE PUSH)` |
| WS7 | Build validation | `fix: resolve typecheck/lint errors` |
| WS8 | Final report | `docs: Phase B hardening complete` |

---

## WS1 — Pre-flight Gates (must all pass)

**If any gate fails → write `PREFLIGHT_FAILURES.md` and STOP.**

### Gate 1: Supabase CLI linked

```bash
supabase migration list 2>&1 | head -20
```

**Pass:** Table of migrations, Local and Remote aligned, no orphaned versions.

### Gate 2: Build passes

```bash
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_placeholder \
SUPABASE_SERVICE_ROLE_KEY=sb_secret_placeholder \
npm run build 2>&1 | tail -5
```

**Pass:** Exit 0, "Compiled successfully".

### Gate 3: GitHub secrets

```bash
gh secret list --repo jameshorton2486/depo-pro 2>&1
```

**Pass:** Output includes `DIRECT_URL`, `TEST_USER_A`, `TEST_USER_B`.
**Fail:** Log warning (non-blocking), proceed to WS2.

### Gate 4: No migration drift

```bash
supabase db push --dry-run 2>&1
```

**Pass:** No errors or drift warnings.

---

## WS2 — Quick Cleanup

### Task 1: Husky pre-commit

Remove deprecated shim at top of `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

Keep only the hook commands (lint, typecheck).

### Task 2: .gitignore

Add exceptions for root markdown:

```gitignore
/*.md
!/README.md
!/CONTRIBUTING.md
!/MANUAL_STEPS.md
!/CHANGELOG.md
```

### Task 3: lib/logger.ts

If duplicate `export const logger` or `type LogLevel` exists, keep only the first implementation (structured logger with `LogContext`, `createRequestContext`). Remove any second block.

---

## WS3 — Storage URL Architecture

**Goal:** DB stores storage paths; URLs generated at read time.

1. Audit write paths for `audio_file_url`, `file_url`, etc.
2. Ensure `uploadFileToSupabase()` returns `{ storagePath, url }` for private buckets.
3. Create `lib/storage/url.ts` with `getFileUrl()`, `extractStoragePath()`.
4. Update read paths that serve URLs to clients to use `getFileUrl()`.
5. Verify build.

---

## WS4 — Rate Limiting

| Route | Limit | Config key |
|-------|-------|------------|
| `POST /api/profile` | 10/min | `PROFILE_UPDATE` |
| `POST /api/transcripts/[id]/ai-review` | 5/hr | `AI_REVIEW` |

Add to `lib/rate-limit-service.ts`:

```typescript
PROFILE_UPDATE: { limit: 10, windowMs: 60_000 },
AI_REVIEW: { limit: 5, windowMs: 3_600_000 },
```

---

## WS5 — Zod Validation

Add schemas and validation to these routes:

- `transcripts/[id]`, `transcripts/[id]/corrections`, `transcripts/[id]/words`, `transcripts/[id]/status`, `transcripts/[id]/unlock`
- `jobs/[id]/status`, `jobs/[id]/dictionary`, `jobs/[id]/proper-nouns`, `jobs/[id]/proper-nouns/[nounId]`
- `attorney/annotations`, `calendar/[id]`, `entities/extract`, `queue`

Use `parseBody()` from `lib/api/schemas.ts`.

---

## WS6 — RLS Policies

**Create migration only — do not auto-push.**

- Add RLS for 24 user-data tables with scope columns.
- Use firm_id, user_id, job_id, transcript_id scoping.
- Create `docs/RLS_REVIEW_CHECKLIST.md`.
- Developer must review and run `supabase db push` manually.

---

## WS7 — Build Validation

- `npx tsc --noEmit`
- `npm run lint --max-warnings=0`
- `npm run build`
- Fix any new errors; do not fix pre-existing ones.

---

## WS8 — Final Report

Create `docs/PHASE_B_HARDENING_COMPLETE.md` with:

- Infrastructure status
- Security changes
- Metrics (before/after)
- Manual steps before MVP Phase 1
- MVP readiness assessment

---

## Manual Tasks Checklist (from prior runs)

### Block 1–2 (critical path, ~25–40 min)

- [ ] `supabase link`
- [ ] Migration repair for malformed versions
- [ ] `supabase migration list` clean
- [ ] GitHub secrets set
- [ ] Org-isolation CI passing

### Block 3–4 (hygiene, ~7 min)

- [ ] Husky deprecation fixed
- [ ] .gitignore root .md rule fixed

### Block 5 (data audit)

- [ ] Run SQL in Supabase to check `jobs.audio_file_url` and `medical_records.file_url` format
- [ ] If full URLs stored, plan backfill to storage paths

### Block 6 (next Codex run)

- [ ] Rate limiting on profile + AI review
- [ ] RLS for tables flagged in schema audit

---

## MVP Phase 1 Readiness

After this prompt and manual steps:

| Criterion | Status |
|-----------|--------|
| Infrastructure stable | ✅ |
| Migrations clean | ✅ |
| CI passing | ✅ |
| Schema audited | ✅ |
| Production hardened | ✅ |
| RLS coverage | ⚠ Pending manual push |
| Env vars documented | ✅ |

**Conditional yes:** Push RLS migration and verify org-isolation CI, then proceed to MVP Phases 1–3 (Deepgram, audio player, synced transcript).

---

## Transcription Module Status (post-consolidation)

- `lib/transcription.ts` is the single entry point.
- `lib/transcription/deepgram.ts` removed.
- Pipeline and scheduler use `transcribeAudio`, `transcribeFile`, `toPipelineFormat`.
- `lib/deepgram/client.ts` provides `LEGAL_TRANSCRIPTION_OPTIONS` and `LEGAL_VOCABULARY`.
