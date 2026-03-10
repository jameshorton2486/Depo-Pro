# Depo-Pro — Next Steps Verification Guide

**Date:** 2026-03-10

---

## Step 1 — Apply Database Migrations

**Status:** Migration version conflict detected.

```bash
npx supabase db push
```

**Error:** `duplicate key value violates unique constraint "schema_migrations_pkey"` — version `20260310` already exists.

**Workaround:** Apply manually via Supabase Dashboard SQL Editor or:
```bash
psql $DATABASE_URL -f supabase/migrations/20260312_018_document_ingestion.sql
psql $DATABASE_URL -f supabase/migrations/20260312_019_job_requests.sql
```

**Tables:** deposition_documents, case_metadata, case_parties, case_attorneys, deposition_sessions, transcript_requests.

---

## Step 2 — Intake Flow (UI)

- `/dashboard/jobs/new` — upload notice
- `/dashboard/requests` — your requests
- `/admin/requests` — admin review

---

## Step 3 — Extraction Data

```sql
SELECT raw_extraction FROM case_metadata ORDER BY created_at DESC LIMIT 5;
```

Fields: case_style, cause_number, deponent_name, attorneys, deposition_date.

---

## Step 4 — Keywords

```sql
SELECT * FROM vocabulary_terms WHERE source = 'document_ingestion' ORDER BY created_at DESC LIMIT 20;
```

Keywords feed Deepgram via buildKeywords (participants, vocabulary_terms, custom_vocabularies).

---

## Step 5 — Formatter Trigger

**Current:** Manual from review UI. Pipeline does NOT auto-call format after AI_COMPLETE.

**Note:** Formatter reads transcript_words. Pipeline stores in transcriptions.words (JSONB). transcript_words table may need hydration step.

---

## Step 6 — Olivarez Test

```bash
npx vitest run tests/integration/formatter-pipeline.test.ts
```
✓ 3 tests pass (in-memory fixture, no DB).

---

## Step 7 — DOCX Verification

Export transcript → Courier New, 25 lines/page, line numbers, no em dashes, THE REPORTER.

---

## Roadmap

1. Phase 1 — Formatter ✓
2. Phase 2 — Transcript editor
3. Phase 3 — Speaker assignment + keyterms
4. Phase 4 — Attorney portal
5. Phase 5 — Billing + multi-tenant
