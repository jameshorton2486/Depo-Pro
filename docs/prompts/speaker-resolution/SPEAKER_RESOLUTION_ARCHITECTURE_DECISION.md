# SPEAKER_RESOLUTION_ARCHITECTURE_DECISION

**Status: ADOPTED / FROZEN.** This document records the architectural decision for speaker
resolution in DEPO-PRO. Implementation proceeds against this; changes to these principles
require an explicit new decision, not an in-flight reinterpretation.

Derived from the read-only architecture audit (Option-B recommendation, alias-vs-merge
analysis, post-ingest mutation inventory, Stage S confirmation).

---

## The problem this resolves

Deepgram diarization is imperfect on real deposition audio: it over-segments (8 labels for 4
people), under-segments, and mislabels. Today, reporter corrections (labelling, role
assignment, reassignment, normalization) are written **back onto the raw Deepgram tables**,
collapsing two distinct things — *what Deepgram said* and *what the reporter decided* — into
one mutable structure. That destroys provenance and forecloses auditability.

The fix: separate the two models. Raw Deepgram output is immutable evidence; all human
interpretation is an overlay resolved at read time.

---

## Adopted principles

1. **Raw Deepgram output is immutable after ingest.** No exceptions.
2. **`transcript_speakers` is part of the raw record.** It is Deepgram-originated evidence, not
   an editable object. Writing `assigned_name` / `role` / `speaker_label` / `display_name` onto
   it is a violation to be migrated away.
3. **Alias, not merge.** Multiple raw diarization labels *resolve to* one participant via the
   overlay; raw speaker rows are never collapsed or rewritten. ("Deepgram didn't change; the
   reporter added interpretation.")
4. **Dedicated overlay tables**, not a column on a raw table:
   `speaker_resolution_current` (the live resolution) and `speaker_resolution_history`
   (append-only supersession record).
5. **All resolution occurs at read time** through a single resolver
   (`src/lib/transcript/speakerResolution.ts`) that turns (raw rows + overlay) → resolved
   participant view.
6. **The formatter consumes resolved participants**, not raw labels. Stage S already supports
   this (`buildIndexMap` accepts one participant with many `speakerIndices`); no formatter
   algorithm change is required — only the participant feed changes.
7. **Raw speaker linkage becomes write-protected** post-ingest as the final hardening step,
   once all readers and writers are migrated off raw.

**The rule, stated once:** *Deepgram writes RAW. Humans write OVERLAYS.*

---

## What moves to the overlay (the full set)

The overlay becomes the **single authority** for ALL of:
- speaker **labelling** (`Speaker 2` → `MR. NUNEZ`)
- **role** assignment (`MR. NUNEZ` → ATTORNEY)
- **normalization** / aliasing (many labels → one participant)
- **reassignment** (this label is actually a different person)

No speaker-related human decision is stored on a raw table after this migration.

### Post-ingest mutation sites to migrate (from the audit)
Reassignment (raw `utterances`/`words` rewrites — the core violation):
- `src/api/workspaceService.ts:618` (`transcript_utterances`)
- `src/api/workspaceService.ts:631` (`transcript_words`)
- `supabase/functions/editor-api/index.ts:536` (`transcript_utterances`)
- `supabase/functions/editor-api/index.ts:548` (`transcript_words`)

Labelling/role (writes onto raw `transcript_speakers` — also migrates, per Principle 2):
- `src/api/workspaceService.ts:591`
- `supabase/functions/editor-api/index.ts:516`

---

## Overlay schema (smallest durable shape)

`speaker_resolution_current`
- `transcript_id`
- `raw_speaker_index` (and/or `raw_speaker_id`) — the immutable raw key
- `participant_id` — the resolved participant
- `resolved_role`
- `resolved_label`
- `resolved_by`
- `resolved_at`

`speaker_resolution_history` (append-only)
- `resolution_id`
- `transcript_id`
- `raw_speaker_index` / `raw_speaker_id`
- `participant_id`
- `resolved_role`
- `resolved_label`
- `resolved_by`
- `resolved_at`
- `supersedes_resolution_id` (nullable)

Human-readable events continue to flow to the existing append-only `transcript_audit_log`
(already logs `assign_speaker`). The history table is the authoritative reconstruction record;
the audit log is the event-visibility surface.

---

## Build sequence (each an independently verifiable commit)

1. **Schema only** — `speaker_resolution_current` + `speaker_resolution_history`. Additive,
   non-destructive, nothing reads/writes them yet. No behavior change.
2. **Read-time resolver** — `src/lib/transcript/speakerResolution.ts`. Pure logic, tested, not
   wired. (raw rows + overlay) → resolved participant view.
3. **Normalization** — speaker-mapping UI/save writes the overlay; many labels → one
   participant; the one-row-one-name revert bug disappears.
4. **Reassignment migration** — replace the raw `utterances`/`words` rewrites
   (`:618/631`, `:536/548`) with overlay writes; raw rows untouched.
5. **Downstream readers** — migrate `buildEditorContent.ts:16`, `exportDocx.ts:108`,
   `docxFormatter.ts:181`, `exportAssembly.ts:13`, `ExportScreen.tsx:366` to the resolved view.
6. **Hardening** — write-protect raw speaker columns (`speaker_id`, `speaker_index`,
   `speaker_label`) post-ingest. Final step, after all readers/writers migrated.

Steps 1–2 are zero-risk (overlay is dark). The overlay goes live at step 3.

---

## Known provenance debt (tracked separately, does NOT block this work)

Transcripts already touched by the current reassignment path have raw speaker linkage that no
longer matches original Deepgram output. This is a provenance concern. Resolution:
- **New transcripts are clean** under the overlay model from the moment it ships.
- **Already-mutated transcripts** are a separate tracked item. Recovery depends on whether the
  original Deepgram payload (`deepgram_response.json` or an immutable snapshot) was retained;
  a follow-up audit identifies the storage location and which transcripts are recoverable.
- This debt does **not** block the overlay architecture.

---

## Why this matters to the roadmap

This layer sits directly beneath Formatting, Correction, Exhibits, and Templates. Getting it
right now means all four consume one resolved participant authority instead of each
re-deriving speakers from raw labels. Because Stage S already works with resolved participants,
this architecture *supports* the roadmap rather than delaying it — the formatter doesn't change,
it just gets correct input.
