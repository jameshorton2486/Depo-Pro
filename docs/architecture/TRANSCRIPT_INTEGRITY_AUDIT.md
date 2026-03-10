# Transcript Integrity Audit

> Depo-Pro — Legal Transcript Verbatim Record Protection
> Date: 2026-03-10
> Auditor: System Architecture Review
> Scope: transcript_words, transcript_corrections, transcript_paragraphs

---

## 1 — Schema Integrity Assessment

### Current State

Depo-Pro uses a **word-level transcript storage model** — the correct architecture for legal transcription. Every word from Deepgram is stored as an individual row in `transcript_words` with immutable source fields and mutable correction fields.

**Schema (from `20260310000100_transcript_words.sql`):**

| Column | Type | Mutability | Purpose |
|--------|------|-----------|---------|
| `id` | UUID | Immutable | Primary key |
| `transcription_id` | UUID | Immutable | Parent transcription |
| `firm_id` | UUID | Immutable | Tenant isolation |
| `position_index` | INTEGER | Immutable | Word position in transcript |
| `original_word` | TEXT NOT NULL | **MUST BE IMMUTABLE** | Verbatim Deepgram output |
| `word` | TEXT NOT NULL | Immutable | Normalized form |
| `punctuated_word` | TEXT NOT NULL | Immutable | With punctuation |
| `display_word` | TEXT NOT NULL | Mutable | Current display value |
| `corrected_word` | TEXT | Mutable | Scopist/reporter correction |
| `start_time` | NUMERIC(12,3) | Immutable | Audio sync start |
| `end_time` | NUMERIC(12,3) | Immutable | Audio sync end |
| `confidence` | NUMERIC(4,3) | Immutable | Deepgram confidence (0-1) |
| `confidence_class` | GENERATED | Immutable | HIGH/MEDIUM/LOW/CRITICAL |
| `speaker_index` | INTEGER | Mutable | Speaker assignment |
| `is_corrected` | BOOLEAN | Mutable | Correction flag |
| `is_deleted` | BOOLEAN | Mutable | Soft delete flag |
| `is_filler` | BOOLEAN | Mutable | Filler word flag |

**What the schema gets right:**
- Separate `original_word` (source) and `corrected_word` (editable) columns
- `is_deleted` soft delete instead of hard delete
- `confidence` preserved from Deepgram with CHECK constraint
- `deepgram_raw_json` stored on `transcriptions` table (immutable backup)
- Corrections logged in `transcription_corrections` table with full context

**What is missing:**
- No database trigger enforcing `original_word` immutability
- No database trigger preventing hard deletes
- No trigger preventing mutation of `word`, `punctuated_word`, `start_time`, `end_time`, `confidence`
- Enforcement is application-level only — a direct SQL query or bug could destroy the verbatim record

### Verdict: Schema design is correct. Database enforcement is absent.

---

## 2 — Failure Scenario Analysis

### Scenario 1: Developer accidentally modifies `original_word`

```sql
-- Accidental or malicious query
UPDATE transcript_words SET original_word = corrected_word WHERE is_corrected = TRUE;
```

**Current protection:** NONE. This query would succeed and destroy the verbatim record permanently.

**Risk level:** CRITICAL. The original AI transcript is irrecoverable. This invalidates reporter certification, legal auditability, and transcript authenticity.

**Required protection:** Database trigger that raises an exception on any UPDATE to `original_word` after initial INSERT.

### Scenario 2: Row in transcript_words is deleted

```sql
DELETE FROM transcript_words WHERE confidence < 0.3;
```

**Current protection:** Application code uses `is_deleted = TRUE` but no database constraint prevents hard deletes. The `ON DELETE CASCADE` from `transcriptions` would also cascade-delete all words if a transcription is deleted.

**Risk level:** HIGH. Hard deletion removes words from the audit trail entirely. Soft-deleted words remain queryable and reconstructable.

**Required protection:** Database trigger that converts DELETE to soft delete (sets `is_deleted = TRUE` instead).

### Scenario 3: Corrections occur without audit trail

**Current protection:** PARTIAL. The `transcription_corrections` table exists and logs corrections with context (original_word, corrected_word, action, confidence, speaker, surrounding context). The `transcription_edits` table also tracks edit history with pre/post hashes.

However, a direct UPDATE to `transcript_words.corrected_word` via SQL bypasses both logging systems.

**Risk level:** MEDIUM. Application code correctly logs corrections, but no database-level enforcement exists.

**Required protection:** Database trigger on UPDATE to `corrected_word` that auto-inserts a `transcription_corrections` record.

### Scenario 4: Paragraphs become inconsistent with words

**Current protection:** CORRECT BY DESIGN. `transcript_paragraphs` is a derived table rebuilt by the formatter from `transcript_words`. The architecture explicitly states paragraphs are rebuildable, not canonical.

**Risk level:** LOW. If paragraphs drift, the formatter can regenerate them. The quality gate validates consistency before export.

**Gap:** The `transcript_paragraphs` table has no CREATE TABLE migration in the database. Code references it but the DDL is missing. This must be resolved before the formatter can write to it.

---

## 3 — Missing Constraints

### 3.1 — CHECK Constraints (Already Present)

```sql
-- Exists: confidence range validation
CHECK (confidence >= 0 AND confidence <= 1)
```

### 3.2 — NOT NULL Constraints (Already Present)

All critical source columns are NOT NULL: `original_word`, `word`, `punctuated_word`, `start_time`, `end_time`, `confidence`, `position_index`, `transcription_id`, `firm_id`.

### 3.3 — Missing Constraints

| Constraint | Table | Purpose |
|-----------|-------|---------|
| Immutability trigger on `original_word` | `transcript_words` | Prevent modification of verbatim record |
| Immutability trigger on `word`, `punctuated_word` | `transcript_words` | Protect normalized source forms |
| Immutability trigger on `start_time`, `end_time` | `transcript_words` | Protect audio sync points |
| Immutability trigger on `confidence` | `transcript_words` | Protect AI confidence scores |
| Hard delete prevention trigger | `transcript_words` | Convert DELETE to soft delete |
| Correction audit trigger | `transcript_words` | Auto-log corrections to `transcription_corrections` |
| Immutability on `transcription_id`, `firm_id`, `position_index` | `transcript_words` | Prevent identity mutation |

---

## 4 — Recommended Database Triggers

### Trigger 1: Immutable Source Fields

```sql
-- Prevent modification of verbatim record fields
CREATE OR REPLACE FUNCTION protect_transcript_word_source()
RETURNS TRIGGER AS $$
BEGIN
  -- Block changes to immutable source fields
  IF OLD.original_word IS DISTINCT FROM NEW.original_word THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: original_word cannot be modified after hydration';
  END IF;

  IF OLD.word IS DISTINCT FROM NEW.word THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: word cannot be modified after hydration';
  END IF;

  IF OLD.punctuated_word IS DISTINCT FROM NEW.punctuated_word THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: punctuated_word cannot be modified after hydration';
  END IF;

  IF OLD.start_time IS DISTINCT FROM NEW.start_time THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: start_time cannot be modified after hydration';
  END IF;

  IF OLD.end_time IS DISTINCT FROM NEW.end_time THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: end_time cannot be modified after hydration';
  END IF;

  IF OLD.confidence IS DISTINCT FROM NEW.confidence THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: confidence cannot be modified after hydration';
  END IF;

  IF OLD.transcription_id IS DISTINCT FROM NEW.transcription_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: transcription_id cannot be modified';
  END IF;

  IF OLD.firm_id IS DISTINCT FROM NEW.firm_id THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: firm_id cannot be modified';
  END IF;

  IF OLD.position_index IS DISTINCT FROM NEW.position_index THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELD: position_index cannot be modified';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_transcript_word_source
  BEFORE UPDATE ON transcript_words
  FOR EACH ROW
  EXECUTE FUNCTION protect_transcript_word_source();
```

### Trigger 2: Soft Delete Enforcement

```sql
-- Convert hard deletes to soft deletes
CREATE OR REPLACE FUNCTION enforce_transcript_word_soft_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Instead of deleting, set is_deleted = TRUE
  UPDATE transcript_words
  SET is_deleted = TRUE
  WHERE id = OLD.id;

  -- Block the actual DELETE
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_transcript_word_soft_delete
  BEFORE DELETE ON transcript_words
  FOR EACH ROW
  EXECUTE FUNCTION enforce_transcript_word_soft_delete();
```

**Note:** This trigger uses `RETURN NULL` to cancel the DELETE and performs a soft-delete UPDATE instead. The immutability trigger (Trigger 1) allows `is_deleted` to change since it only guards source fields.

### Trigger 3: Correction Audit Trail

```sql
-- Auto-log corrections when corrected_word changes
CREATE OR REPLACE FUNCTION log_transcript_word_correction()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when corrected_word actually changes
  IF OLD.corrected_word IS DISTINCT FROM NEW.corrected_word THEN
    INSERT INTO transcription_corrections (
      transcription_id,
      job_id,
      firm_id,
      reviewer_id,
      word_index,
      original_word,
      corrected_word,
      action,
      confidence_at_time,
      created_at
    ) VALUES (
      NEW.transcription_id,
      (SELECT job_id FROM transcriptions WHERE id = NEW.transcription_id),
      NEW.firm_id,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
      NEW.position_index,
      NEW.original_word,
      NEW.corrected_word,
      CASE WHEN NEW.corrected_word IS NOT NULL THEN 'CORRECTED' ELSE 'CONFIRMED' END,
      NEW.confidence,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_transcript_word_correction
  AFTER UPDATE ON transcript_words
  FOR EACH ROW
  EXECUTE FUNCTION log_transcript_word_correction();
```

---

## 5 — Security Risks

### Risk 1: CASCADE DELETE from transcriptions

```sql
-- Current FK definition
transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE
```

If a `transcriptions` row is deleted, all `transcript_words` are cascade-deleted — bypassing the soft-delete trigger entirely (CASCADE fires the FK constraint, not per-row triggers in all cases).

**Mitigation:** Change to `ON DELETE RESTRICT`:

```sql
ALTER TABLE transcript_words
  DROP CONSTRAINT transcript_words_transcription_id_fkey,
  ADD CONSTRAINT transcript_words_transcription_id_fkey
    FOREIGN KEY (transcription_id)
    REFERENCES transcriptions(id)
    ON DELETE RESTRICT;
```

This forces transcriptions to be soft-deleted first, preserving all words.

### Risk 2: Service Role Key Bypass

The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. Any server-side code using the admin client can modify `original_word` directly.

**Mitigation:** The immutability trigger fires regardless of RLS bypass because triggers execute at the database level, not the RLS level. Trigger 1 protects against this.

### Risk 3: Direct Database Access

Developers with direct database credentials (via `DIRECT_URL`) can:
- Disable triggers: `ALTER TABLE transcript_words DISABLE TRIGGER ALL;`
- Modify data freely

**Mitigation:** Restrict `DIRECT_URL` access to migrations-only. Production data access should use the Supabase client with RLS. Document this in operational runbooks.

### Risk 4: Hydration Re-Run

The `hydrateWords()` function uses UPSERT with `onConflict: 'transcription_id,position_index'`. If hydration runs twice, it could overwrite words.

**Current protection:** The immutability trigger (Trigger 1) would block re-hydration attempts that try to change source fields. This is the correct behavior — hydration is idempotent only if the source data is identical.

**Mitigation:** The idempotency model should check `transcript_words` count before re-hydrating (already specified in EVENT_WORKFLOW_ORCHESTRATION.md).

---

## 6 — Existing Correction Infrastructure

The system already has a robust correction tracking system:

### `transcription_corrections` table (migration `20260213010000`)

| Column | Purpose |
|--------|---------|
| `original_word` | What Deepgram heard |
| `corrected_word` | What the reviewer changed it to (NULL if confirmed/skipped) |
| `action` | CORRECTED, CONFIRMED, or SKIPPED |
| `confidence_at_time` | Deepgram confidence when flagged |
| `category` | medical, proper_noun, number_date, legal, general |
| `context_before`, `context_after` | 3 words before/after for pattern detection |
| `speaker_label` | Speaker context |
| `audio_position_seconds` | Audio timestamp |
| `reviewer_id` | Who made the correction |

This table feeds the vocabulary learning system — corrections become future Deepgram vocabulary boosts.

### `transcription_edits` table (base schema)

| Column | Purpose |
|--------|---------|
| `transcription_id` | Parent transcription |
| `word_index` | Position in transcript |
| `edited_text` | New text |
| `edit_type` | WORD_CORRECTION |
| `editor_id`, `editor_role` | Who and what role |
| `pre_edit_hash`, `post_edit_hash` | Integrity verification |

Two separate correction tracking systems exist for complementary purposes:
- `transcription_corrections`: Vocabulary intelligence and accuracy analytics
- `transcription_edits`: Edit history with integrity hashing for legal audit

---

## 7 — transcript_paragraphs Gap

**Critical finding:** The `transcript_paragraphs` table is referenced by the formatter (`lib/transcription/formatter/index.ts`) and the export route (`app/api/transcripts/[id]/export/route.ts`), but **no CREATE TABLE migration exists**.

A migration already exists for `transcript_words` (`20260310000100_transcript_words.sql`) but the corresponding paragraph table DDL is missing from the migrations directory.

**Required action:** Create the migration before the formatter can write to production. The table schema should match the `PaginatedParagraph` type from `lib/transcription/formatter/types.ts`:

```sql
CREATE TABLE IF NOT EXISTS transcript_paragraphs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id    UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
  firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE RESTRICT,
  paragraph_index     INTEGER NOT NULL,
  paragraph_type      TEXT NOT NULL,
  section_type        TEXT,
  speaker_index       INTEGER,
  speaker_label       TEXT,
  text                TEXT NOT NULL,
  raw_text            TEXT,
  word_ids            UUID[],
  line_count          INTEGER NOT NULL DEFAULT 1,
  page_number         INTEGER,
  line_number_start   INTEGER,
  line_number_end     INTEGER,
  created_at          TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(transcription_id, paragraph_index)
);
```

Note: `ON DELETE CASCADE` is appropriate here because paragraphs are derived and rebuildable. Unlike `transcript_words`, paragraphs are not canonical.

---

## 8 — Production Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Word-level storage model** | 10/10 | Correct architecture — individual words, not text blobs |
| **Immutable/mutable separation** | 9/10 | `original_word` vs `corrected_word` design is correct; enforcement is application-only |
| **Soft delete pattern** | 8/10 | `is_deleted` column exists; no trigger enforcement |
| **Correction audit trail** | 9/10 | Two complementary correction tracking tables with rich context |
| **Paragraph derivation model** | 9/10 | Paragraphs explicitly non-canonical and rebuildable; missing DDL migration |
| **Database-level enforcement** | 3/10 | No immutability triggers, no soft-delete triggers, CASCADE allows hard deletion |
| **Deepgram source preservation** | 10/10 | `deepgram_raw_json` stored immutably on `transcriptions` — ultimate backup |
| **RLS protection** | 8/10 | firm_id isolation on transcript_words; service role bypasses RLS |
| **Integrity hashing** | 9/10 | SHA-256 integrity hash computed and stored after transcription |

**Overall Transcript Integrity Score: 7.5 / 10**

The application-level design is excellent (9/10). The database-level enforcement is the gap (3/10). Adding the three recommended triggers raises the overall score to **9.5/10**.

---

## 9 — Implementation Priority

| Priority | Action | Risk Mitigated |
|----------|--------|---------------|
| **P0** | Add immutability trigger (Trigger 1) | Verbatim record corruption |
| **P0** | Add soft-delete trigger (Trigger 2) | Permanent word loss |
| **P1** | Change `ON DELETE CASCADE` to `ON DELETE RESTRICT` on transcription FK | Cascade word loss |
| **P1** | Create `transcript_paragraphs` migration | Formatter/export runtime errors |
| **P2** | Add correction audit trigger (Trigger 3) | Untracked direct SQL corrections |
| **P3** | Document operational runbook for `DIRECT_URL` access restrictions | Developer error |

---

## 10 — Summary

Depo-Pro's transcript storage architecture is **correctly designed** for legal transcription:

- Words are individually stored (not text blobs)
- Source fields are separated from correction fields
- Soft delete replaces hard delete
- Two correction audit systems provide rich history
- Paragraphs are derived and rebuildable
- The Deepgram raw JSON is preserved as an immutable backup

The single critical gap is **database-level enforcement**. The three recommended triggers close this gap and make the verbatim record protection legally defensible at the database layer, not just the application layer.
