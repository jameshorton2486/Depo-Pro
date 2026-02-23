# Schema Audit & Data Integrity Report

**Generated**: 2026-02-23
**Scope**: Full Supabase SQL schema audit — org isolation, RBAC, transcript storage, edit trail, indexes, migration stability, security, scalability

---

## STEP 1 — Full Schema Map

| Model | Purpose | Key Relations | Risk Level |
|-------|---------|--------------|------------|
| `profiles` | User accounts | → `firms` (firm_id FK), → `auth.users` (PK = auth UID) | LOW |
| `firms` | Tenant/org boundary | ← `profiles`, ← `jobs` | LOW |
| `jobs` | Deposition job | → `firms` (firm_id), → `profiles` (reporter, scopist, locked_by, sealed_by) | LOW |
| `transcriptions` | AI output + current state | → `jobs` (UNIQUE, CASCADE) | LOW |
| `transcription_chunks` | Audio chunk results | → `transcriptions` (CASCADE) | LOW |
| `flagged_words` | Low-confidence words | → `transcriptions` (CASCADE) | LOW |
| `silent_segments` | Off-record annotations | → `transcriptions` (CASCADE) | LOW |
| `transcription_edits` | Immutable edit log | → `transcriptions` (CASCADE), → `profiles` | LOW |
| `transcript_integrity_chain` | Version hash chain | → `transcriptions` (CASCADE), → `transcription_edits` | LOW |
| `processing_errors` | Pipeline error log | → `jobs`, `transcriptions`, `transcription_chunks` | LOW |
| `audit_log` | Action audit trail | → `profiles` (actor_id) | LOW |
| `transcript_shares` | Attorney access grants | → `jobs`, → `profiles` (shared_by, shared_with) | MEDIUM |
| `custom_vocabularies` | Job-level word boosts | → `jobs` (CASCADE), → `profiles` | LOW |
| `firm_vocabularies` | Firm-level word boosts | → `firms` (CASCADE), → `profiles` | LOW |

---

## STEP 2 — Multi-Tenant Org Isolation Audit

### Core Isolation Architecture

The tenant boundary is the `firms` table. Every user has a `firm_id` on their profile. Every job has a `firm_id`. All RLS policies enforce firm-scoped access.

| Model | Org Bound | Safe? | Notes |
|-------|----------|-------|-------|
| `profiles` | YES — `firm_id` (nullable FK) | ✅ Safe | Null firm_id = not yet onboarded. RLS admin policies check `p.firm_id = profiles.firm_id` (C-1 fix). |
| `firms` | N/A — is the boundary | ✅ Safe | Admins only read their own firm. |
| `jobs` | YES — `firm_id NOT NULL` | ✅ Safe | RLS: ADMIN sees same firm only, reporter sees own, scopist sees assigned. |
| `transcriptions` | Indirect via `job_id → jobs.firm_id` | ✅ Safe | Access always routed through jobs FK. |
| `transcription_chunks` | Indirect via `transcription_id` | ✅ Safe | Cascades from transcriptions. |
| `flagged_words` | Indirect via `transcription_id` | ✅ Safe | |
| `silent_segments` | Indirect via `transcription_id` | ✅ Safe | |
| `transcription_edits` | Indirect via `transcription_id` | ✅ Safe | |
| `transcript_integrity_chain` | Indirect via `transcription_id` | ✅ Safe | |
| `processing_errors` | Indirect via `job_id` | ✅ Safe | |
| `audit_log` | Indirect via `actor_id` firm | ✅ Safe (C-1 fixed) | Admin sees events where actor OR target is in their firm. |
| `transcript_shares` | Via `job_id → jobs.firm_id` | ⚠️ Medium | See below. |
| `custom_vocabularies` | Via `job_id → jobs.firm_id` | ✅ Safe | |
| `firm_vocabularies` | YES — `firm_id NOT NULL` | ✅ Safe | |

### `transcript_shares` — Medium Risk

**Issue**: The soft-delete migration (`20260212_add_soft_delete_columns`) rewrites `jobs_select` and references `ts.shared_with_id` and `ts.transcription_id`. But the base schema defines `transcript_shares.shared_with` (no `_id` suffix) and no `transcription_id` column (shares are on `job_id`).

**Impact**: If the soft-delete migration ran against production, the `jobs_select` RLS policy may have a column name mismatch that silently prevents attorney share access.

**Action Required**: Verify the `transcript_shares` table structure against the running DB:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'transcript_shares';
```
Expected columns: `id, job_id, shared_by, shared_with, access_level, expires_at, ...`

---

## STEP 3 — Role & Permission Structure

### User Role Enum (DB level)

The `user_role` enum in the base schema defines:
```sql
CREATE TYPE user_role AS ENUM ('ADMIN', 'COURT_REPORTER', 'SCOPIST', 'ATTORNEY');
```

> **Warning**: The application-level enum in `lib/enums/roles.ts` defines 13 roles. The DB enum has only 4. This is intentional — the extended roles are v2.2 application-layer roles managed in `org_memberships`. However, any RLS policy that checks `role = 'COURT_REPORTER'` would not match v2.2 sub-roles like `AGENCY_REPORTER`.

**Recommendation**: Verify whether v2.2 org roles affect any existing RLS `role =` checks.

### Privilege Escalation Analysis

| Risk | Present? | Notes |
|------|---------|-------|
| User can elevate own role | NO | `profiles_update` policy only allows own profile updates, not role field |
| Attorney can read internal operations | NO | RESTRICTIVE policies block attorney on chain/audit tables (C-2 fix) |
| Scopist can access unassigned jobs | NO | `jobs_select` requires `scopist_id = auth.uid()` |
| Cross-firm admin access | NO | C-1 fix enforces `p.firm_id = target.firm_id` |
| Reporter assigned as attorney | NO | `prevent_attorney_assignment` trigger fires on INSERT/UPDATE |

---

## STEP 4 — Transcription Data Storage Audit

### Field Inventory

| Field | Type | Present | Notes |
|-------|------|---------|-------|
| `words` | JSONB | ✅ Yes | Word-level Deepgram output |
| `segments` | JSONB | ✅ Yes | Segment-level output |
| `speakers` | JSONB | ✅ Yes | Speaker diarization data |
| `deepgram_raw_json` | JSONB | ✅ Yes | Immutable raw response |
| `original_transcript` | TEXT | ✅ Yes | Immutable original text |
| `full_transcript` | TEXT | ✅ Yes | Current editable transcript |
| `original_integrity_hash` | TEXT | ✅ Yes | Immutable SHA-256 of original |
| `current_integrity_hash` | TEXT | ✅ Yes | Updated by integrity chain |
| `status` | ENUM | ✅ Yes | 8-state pipeline enum |
| `flagged_word_count` | INT | ✅ Yes | Cached count |
| `reviewed_word_count` | INT | ✅ Yes | Cached count |
| `audio_duration_seconds` | FLOAT | ✅ Yes | |
| `chunk_count` | INT | ✅ Yes | |
| `completedAt` | — | ⚠️ Not on transcriptions | `completed_at` is on `jobs`, not `transcriptions` |

### Risks

| Risk | Classification | Action |
|------|---------------|--------|
| `words` JSONB size for 8-hour depositions | MVP Acceptable | Deepgram returns ~100KB/hour; 8h = ~800KB. JSONB handles this fine. Consider pagination at review layer, not storage layer. |
| `deepgram_raw_json` size | MVP Acceptable | Same size profile. Immutable so no write amplification. |
| No `completedAt` on `transcriptions` | Low Risk | Use `jobs.completed_at` or derive from `status = 'COMPLETE'`. Can add if needed. |
| Concurrent writes to `current_integrity_hash` | Low Risk | `append_integrity_chain` uses `FOR UPDATE` lock on the chain table. |

---

## STEP 5 — Edit Audit Trail Safety

### `transcription_edits` Model

| Field | Present | Notes |
|-------|---------|-------|
| `id` | ✅ | UUID PK |
| `transcription_id` | ✅ | FK → transcriptions (CASCADE) |
| `editor_id` | ✅ | FK → profiles (NOT NULL) |
| `edit_type` | ✅ | ENUM: WORD_CORRECTION, SEGMENT_EDIT, SPEAKER_RELABEL, BULK_EDIT |
| `word_index` | ✅ | Nullable — used for word corrections |
| `segment_index` | ✅ | Nullable — used for segment edits |
| `original_value` | ✅ | NOT NULL — original text before edit |
| `new_value` | ✅ | NOT NULL — text after edit |
| `pre_edit_hash` | ✅ | SHA-256 state before edit |
| `post_edit_hash` | ✅ | SHA-256 state after edit |
| `chain_version` | ✅ | Links to integrity chain version |
| `ip_address` | ✅ | Forensic provenance |
| `user_agent` | ✅ | Forensic provenance |
| `created_at` | ✅ | Immutable timestamp |
| `updated_at` | — | NOT PRESENT — correct. Edits should be immutable. |

**Verdict**: Edit trail is SAFE. Records are append-only by design (no `updated_at`, no UPDATE trigger). The combination of `pre_edit_hash`, `post_edit_hash`, and the integrity chain provides full legal-grade auditability.

---

## STEP 6 — Index & Performance Review

| Model | Index Coverage | Gaps | Row Volume Estimate |
|-------|---------------|------|---------------------|
| `profiles` | role, firm_id, email | None | Low (< 10k) |
| `firms` | PK only | Consider name index for admin search | Low (< 1k) |
| `jobs` | firm_id, status, reporter, scopist, locked_by, created_at, due_date, composite active | None | Medium (< 100k/firm) |
| `transcriptions` | job_id, status | Consider `(status, created_at)` for admin queries | 1:1 with jobs |
| `transcription_chunks` | transcription_id, pending composite | None | Medium (10-20 per transcription) |
| `flagged_words` | transcription_id, confidence, pending composite, status count | None | High (100-500 per transcription) |
| `silent_segments` | transcription_id, time composite | None | Low |
| `transcription_edits` | transcription_id, editor_id, created_at, replay composite | None | Medium (10-200 per transcription) |
| `transcript_integrity_chain` | transcription_id, latest (DESC) composite | None | 1 per edit |
| `audit_log` | action, actor_id, entity timeline composite | None | High — **must archive after 1 year** |
| `transcript_shares` | job_id, shared_with, active (partial) | None | Low |

**High-risk table**: `audit_log` has no partition or archival strategy. At scale, this table will grow unboundedly. **Recommend**: Add a `created_at` partition or quarterly archival job before reaching 1M rows.

---

## STEP 7 — Migration Stability Report

| Finding | Severity | Status |
|---------|---------|--------|
| 1 malformed migration (8-digit timestamp) | Medium | Documented — requires CLI verification |
| Previously deleted malformed migrations (20260209–20260213) in backup | Low | Backup only — no action needed |
| No destructive SQL (DROP TABLE, TRUNCATE) in active migrations | ✅ Safe | Verified |
| CASCADE DELETEs scoped correctly | ✅ Safe | Jobs → cascade to transcriptions, chunks, edits. Firms → RESTRICT on jobs. |
| Missing constraint on `profiles.firm_id` being NOT NULL | Low Risk | New users have null firm_id until onboarded. Intentional. |

---

## STEP 8 — Security Hardening Check

| Check | Status | Notes |
|-------|--------|-------|
| Soft deletes | ✅ Present | `deleted_at` on jobs, transcriptions, flagged_words, medical_records, chronology_entries, custom_vocabularies, exhibits |
| `created_at` / `updated_at` on all mutable tables | ✅ Present | `update_updated_at()` trigger on all mutable tables |
| Immutability guard on original transcript | ✅ Present | DB trigger raises exception on any attempt to overwrite |
| Attorney role blocked from writing jobs | ✅ Present | `prevent_attorney_assignment` trigger |
| C-1: Admin firm isolation fix | ✅ Applied | 20260209000001 migration |
| C-2: Attorney RESTRICTIVE blocks | ✅ Applied | 20260209000001 migration |
| RLS enabled on all tables | ✅ Confirmed per prior RLS audit | See `docs/RLS_AUDIT.md` |
| Service role key used only server-side | ✅ Verified | Only in `lib/supabase/admin.ts` and protected API routes |

---

## STEP 9 — Scalability Risk Classification

| Model | Risk Level | Reason | Action Timeline |
|-------|-----------|--------|-----------------|
| `audit_log` | HIGH | Unbounded append-only table | Add archival/partition before public beta |
| `flagged_words` | MEDIUM | 100-500 rows per transcription, high read frequency during review | Current indexes sufficient for < 1M rows; add partition at scale |
| `transcription_edits` | MEDIUM | Append-only log; grows with usage | Archive old sessions; indexes adequate for MVP |
| `transcript_integrity_chain` | LOW | 1 row per edit; small payload | Safe long-term |
| `jobs` | LOW | Well-indexed; firm-scoped queries | Safe long-term |
| `transcriptions` | LOW | 1:1 with jobs; JSONB well-indexed | Monitor JSONB size for 8h+ sessions |
| `transcript_shares` | LOW | Low cardinality | Safe |
| `firms` / `profiles` | LOW | Low row count by nature | Safe |

---

## Final Readiness Score: **88 / 100**

### Deductions
| Issue | Points |
|-------|--------|
| One malformed migration (`20260124`) — pending CLI verification | -5 |
| `transcript_shares` soft-delete RLS column name mismatch risk | -4 |
| `audit_log` has no archival strategy — needs plan before beta | -3 |

### Conditional Pass Items
| Item | Condition |
|------|-----------|
| Migration state | Run `supabase migration list` + `db push --dry-run` |
| `transcript_shares` RLS | Verify column names in running DB |

---

## Is the schema safe for Beta launch?

**YES — Conditional**

The schema is architecturally sound with proper org isolation, immutability guards, edit audit trail, integrity chain, and role-based access controls. The three items above should be verified/resolved before opening to beta users, but none represent a blocking design flaw.

**Blocking before beta**:
1. Verify migration state (CLI command — 10 minutes)
2. Confirm `transcript_shares` RLS column names (one SQL query)

**Non-blocking before beta, required before GA**:
3. Design `audit_log` archival strategy
