# DEPO-PRO SYSTEM BLUEPRINT
## Authoritative Architecture Specification — Version 1.0

**Prepared for:** James Horton · Kollect-It / Depo-Pro · San Antonio, Texas  
**Date:** March 2026  
**Classification:** Confidential Internal Engineering Reference  
**Status:** Canonical — supersedes all prior roadmap, architecture, and spec documents  
**Authority Documents Synthesized:**
- Master Roadmap v2–v5
- Architecture Review v1
- Transcript Formatting Guide v1
- Error Analysis Roadmap (Bourbois Case Study)
- State Legal Transcript Formatting Guidelines (10 jurisdictions)
- Formatter Specification v1.0
- Database Schema v2.0 (Phase A + B)
- Formatter Rule Engine v1.0

---

## Table of Contents

| Section | Title |
|---|---|
| 1 | Executive Summary & Platform Value |
| 2 | Complete System Workflow (11 Stages) |
| 3 | Technology Stack & Infrastructure |
| 4 | User Roles, Permissions & Security Model |
| 5 | Database Architecture — Table Inventory |
| 6 | Deposition Intake System & AI Document Parser |
| 7 | Deepgram Transcription Pipeline |
| 8 | Speaker Assignment System |
| 9 | Interactive Transcript Editor |
| 10 | Transcript Formatting Engine |
| 11 | Pagination Engine |
| 12 | Inclusion Pages — Automatic Generation |
| 13 | Multi-Format Export Engine |
| 14 | Multi-State Compliance Standards (10 Jurisdictions) |
| 15 | AI Proofreading & Style Guide Engine |
| 16 | Pre-Certification Quality Gate |
| 17 | Transcript Versioning & Integrity Chain |
| 18 | Exhibit Management System |
| 19 | Bourbois Case Study — Error Analysis Reference |
| 20 | Billing, Subscriptions & Stripe Architecture |
| 21 | API Route Structure |
| 22 | Development Phases & Timeline |
| 23 | Consolidation & Deprecation Plan |
| 24 | WKT Module Decision |
| 25 | Long-Term Vision |

---

## SECTION 1 — Executive Summary & Platform Value

Depo-Pro is a cloud-native legal transcription platform engineered to automate the complete deposition production lifecycle for court reporters, scopists, law firms, and court reporting agencies. The platform integrates AI transcription, word-level editing, jurisdiction-specific formatting, and certified export into a single SaaS environment.

**The core problem Depo-Pro solves:** Court reporters currently use disconnected tools — one application for audio playback, another for text editing, email for file delivery, and manual reformatting per jurisdiction. Depo-Pro eliminates this fragmentation.

**Estimated time reduction:** 40–60% compared to current manual workflows.

**Platform differentiators:**
- SHA-256 integrity chain — every edit version-stamped, legally defensible
- Word-level timestamp storage — every word knows its exact audio position
- Automatic section detection with reporter confirmation
- Automatic inclusion page generation from intake data
- 10-jurisdiction compliance engine from a single formatter
- Pre-certification quality gate that blocks legally defective exports

**The non-negotiable success criterion:** A licensed Texas CSR can attach their license number to a Depo-Pro-produced transcript and deliver it to a law firm for use in litigation. All platform development decisions trace back to this requirement.

---

## SECTION 2 — Complete System Workflow (11 Stages)

Each stage produces structured output that the next stage consumes. A deposition can be paused at any stage and resumed. Stages are independently executable and independently testable.

```
Stage 1  →  Deposition Notice Upload
            PDF/DOCX/scanned notice from law firm

Stage 2  →  AI Document Parser
            Extracts case metadata, participants, vocabulary

Stage 3  →  Deposition Record Creation
            depositions + participants + vocabulary_terms rows created
            Deepgram keyword array auto-populated from extracted proper nouns

Stage 4  →  Scheduling
            Reporter, scopist, videographer assigned
            Calendar event created (Zoom / in-person / pre-recorded upload)

Stage 5  →  Audio/Video Capture
            Zoom recording, uploaded file, or live browser mic
            Stored in Supabase Storage / S3

Stage 6  →  Deepgram Transcription
            Nova-3 with keyterm boost, diarization, timestamps, confidence
            Raw JSON stored in transcriptions.deepgram_raw_json (IMMUTABLE)
            Words hydrated to transcript_words rows

Stage 7  →  Speaker Assignment
            Reporter maps Speaker 0/1/2 to real participant names
            speaker_assignments rows created
            Q/A labels and colloquy labels auto-derived from role

Stage 8  →  Transcript Editing
            Audio sync, confidence highlighting, inline corrections
            Scopist assignment workflow
            [VERIFY] tag insertion and resolution

Stage 9  →  AI Proofreading
            Grammar, punctuation, legal terminology, consistency
            Suggestions stored in ai_suggestions (never auto-applied)
            Reporter approves or rejects each suggestion

Stage 10 →  Pre-Certification Quality Gate
            12 checks — errors block export, warnings require acknowledgment
            Date consistency, verbatim integrity, speaker mapping completeness

Stage 11 →  Export & Certified Delivery
            DOCX (Q/A, full-name, condensed), PDF, ASCII, E-Trans
            Reporter certifies — export_certifications record created
            Transcript locked and delivered
```

---

## SECTION 3 — Technology Stack & Infrastructure

### Core Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React, Tailwind CSS, TypeScript |
| Backend | Supabase (Postgres 15, Edge Functions, Auth, RLS) |
| Transcription | Deepgram Nova-3 |
| AI Review | Claude Sonnet (claude-sonnet-4-6) |
| AI Intake Parser | Claude Opus (claude-opus-4-6) |
| File Storage | Supabase Storage (S3-compatible) |
| Deployment | Vercel |
| Background Jobs | Supabase Edge Functions + Postgres triggers |
| Real-time | Supabase Realtime (WebSocket) |

### Storage Buckets

```
audio-files/           Raw audio recordings (original upload)
video-files/           Video recordings
transcripts/           Generated transcript files
exhibits/              Exhibit documents and images
exports/               Certified export DOCX/PDF files
documents/             Deposition notices, intake documents
```

### Environment Configuration

All secrets managed via Vercel environment variables and Supabase secrets. See `.env.example` in repository. Critical variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEEPGRAM_API_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## SECTION 3B — Background Services Architecture

### Seven Independent Services

The Depo-Pro backend is composed of seven services that run independently. Failures in one service do not cascade into others.

```
                    ┌─────────────────────────┐
                    │      Next.js UI          │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │       API Layer          │
                    │  (Supabase Edge + Next)  │
                    └──────────┬──────────────┘
                               │
     ┌──────────┬──────────┬───┴──────┬──────────┬──────────┐
     ▼          ▼          ▼          ▼          ▼          ▼
  Audio    Transcript  Formatter   AI Proof   Export   Notifications
 Pipeline   Engine      Engine     Engine     Engine     Service
```

### Named Background Workers

Each worker runs asynchronously via Supabase Edge Functions. All workers implement retry with exponential backoff. All worker events are logged to `audit_log`.

| Worker Name | Trigger | Responsibility |
|---|---|---|
| `audio_transcription_worker` | File uploaded to `audio-files` bucket | Submits audio to Deepgram with keyterm boost; updates job status |
| `token_hydration_worker` | Deepgram webhook fires | Converts `deepgram_raw_json` → `transcript_words` rows; sets `words_hydrated = TRUE` |
| `formatter_worker` | Speaker assignment confirmed | Runs section detection → paragraph builder → post-processor → paginator; writes `transcript_paragraphs` |
| `ai_proofreader_worker` | Formatter completes OR manual trigger | Runs Claude Sonnet AI review engines; stores suggestions in `ai_suggestions` |
| `export_worker` | Reporter initiates export | Runs quality gate → generates inclusion pages → assembles DOCX/PDF/ASCII; stores URL in `exports` |
| `notification_worker` | Status changes on job/transcription/assignment | Dispatches email, in-app, and webhook notifications |

**Important: No worker runs synchronously from an API route.** The audio transcription worker in particular must never block an HTTP response — if Deepgram submission fails inside an API route, the user gets an error with no retry path. All submission goes through the job queue.

### Queue Architecture

Supabase Edge Functions provide the primary queue mechanism. For high-volume firms, a Redis-backed queue (Upstash Redis) can be added as a Layer 2 queue without changing the worker contracts. The worker interface is queue-agnostic — workers pull jobs from whatever queue is configured in the environment.

```typescript
// Worker contract — all workers implement this interface
interface DeproWorker {
  name: string;
  handle(job: WorkerJob): Promise<WorkerResult>;
  onError(job: WorkerJob, error: Error): Promise<void>;
  maxRetries: number;
  retryDelayMs: number; // exponential: delay * 2^attemptNumber
}
```

### Notification Service

The notification worker dispatches alerts across three channels:

**Email** (via Resend):
- Job status: transcription complete → reporter notified
- Scopist assignment: new transcript assigned
- Export ready: certified export delivered to attorney

**In-App (Supabase Realtime)**:
- Formatter run complete → editor unlocked
- AI proofreading complete → suggestions available in sidebar
- Quality gate failure → alert banner with specific failed checks

**Webhooks** (for law firm integration):
- Transcript status changes (configurable per firm)
- Export delivery confirmation
- Certified transcript available for download

```typescript
// Notification payload schema
interface NotificationEvent {
  type: 'JOB_COMPLETE' | 'EXPORT_READY' | 'SCOPIST_ASSIGNED'
      | 'QUALITY_GATE_FAILED' | 'AI_SUGGESTIONS_READY';
  firm_id: string;
  job_id: string;
  transcription_id?: string;
  recipient_ids: string[];     // profile IDs
  channels: ('email' | 'in_app' | 'webhook')[];
  payload: Record<string, unknown>;
}
```

---

## SECTION 4 — User Roles, Permissions & Security Model

### Role Definitions

| Role | Access Level | Key Capabilities |
|---|---|---|
| `ADMIN` | Full firm access | All operations, user management, billing |
| `FIRM_ADMIN` | Full firm access | Firm settings, reporter management |
| `AGENCY_ADMIN` | Multi-firm access | Cross-firm reporting, assignment |
| `COURT_REPORTER` | Own jobs | Create jobs, transcribe, certify |
| `SCOPIST` | Assigned jobs only | Edit transcripts, flag review |
| `ATTORNEY` | Shared transcripts | Read-only, annotation |
| `PARALEGAL` | Shared transcripts | Read-only, download |
| `VIDEOGRAPHER` | Scheduling only | Calendar access |
| `WKT_STUDENT` | Training module only | WKT practice tests |

### Three-Layer Security Architecture

```
Layer 1: Next.js middleware          → Route protection (withRouteProtection)
Layer 2: API route handlers          → Request validation, role verification
Layer 3: Supabase RLS policies       → Database query filtering per firm_id

No single layer is relied upon exclusively.
All three must be satisfied for any data access to succeed.
Service role client (server-side only) can bypass RLS for admin operations.
```

### Critical Security Rules

- Every data table carries `firm_id` for RLS enforcement
- `transcript_words` has hard-delete blocked at DB layer (verbatim mandate)
- `transcript_flags` and `export_certifications` are append-only (no deletes, no updates)
- `transcript_integrity_chain` uses SHA-256 linked hash — every edit version-stamped
- `audit_log` is append-only with 23 action types seeded

---

## SECTION 5 — Database Architecture — Table Inventory

### Complete Table Inventory

All tables with status and phase.

**Existing (Production):**
`profiles` · `firms` · `jobs` · `custom_vocabularies` · `firm_vocabularies` · `transcriptions` · `transcription_chunks` · `flagged_words` · `silent_segments` · `transcription_edits` · `transcript_integrity_chain` · `processing_errors` · `audit_log` · `transcript_shares` · `transcription_corrections` · `extracted_entities` · `medical_records` · `review_sessions` · `extracted_entities` · `entity_relations` · `entity_mentions`

**Phase A (March 2026 — Required before formatter launch):**
`depositions` · `participants` · `documents` · `vocabulary_terms` · `exhibits` · `exhibit_markers` · `transcript_words` · `speaker_assignments` · `transcript_paragraphs` · `transcript_flags` · `ai_suggestions` · `jurisdiction_configs` · `exports`

**Phase B (March-April 2026 — Formatter complete, editor build):**
`transcript_sessions` · `transcript_sections` · `reporter_preferences` · `speaker_voice_profiles` · `proofreading_assignments` · `ai_review_sessions` · `ai_rules` · `transcript_access_log` · `export_certifications` · `audio_annotations` · `realtime_sessions`

**Phase C (Post-editor):**
`transcript_versions` · `style_reference_chunks` (pgvector RAG) · `billing_records`

### Naming Conventions

- Tables: `snake_case`, plural
- PK: always `UUID DEFAULT gen_random_uuid()`
- Timestamps: always `TIMESTAMPTZ` — never `TIMESTAMP`
- Soft deletes: `is_deleted BOOLEAN` or `deleted_at TIMESTAMPTZ` — never hard DELETE
- Tenant isolation: every table includes `firm_id` FK

---

## SECTION 6 — Deposition Intake System & AI Document Parser

### Supported Input Formats

- PDF deposition notices (text-searchable and scanned/OCR)
- DOCX notices from law firm templates
- Court reporting agency scheduling sheets
- Notices of Oral and Videotaped Deposition (standard Texas form)
- Deposition subpoenas
- Agency intake forms (S.A. Legal Solutions format)

### Data Extraction Schema

The AI parser (Claude Opus) extracts and validates:

```typescript
interface IntakeParseResult {
  case_style:         string;    // "Houston v. Olivarez"
  cause_number:       string;    // "DC-25-07070"
  court_name:         string;    // "191st Judicial District Court"
  county:             string;    // "Dallas County"
  state_code:         string;    // "TX"
  deponent_name:      string;    // "Maria Dolores Olivarez"
  deposition_date:    string;    // ISO date
  deposition_time:    string;    // "1:04 PM"
  location:           string;
  is_remote:          boolean;
  platform:           string;    // "Zoom"
  
  examining_attorney: { name, firm, email, phone };
  copy_attorneys:     { name, firm, email, phone }[];
  
  vocabulary_terms:   string[];  // All proper nouns for Deepgram keyterm boost
}
```

### Automatic Deepgram Keyword Generation

Every proper noun extracted during intake is compiled into a Deepgram keyterm boost array. Field testing shows **15–40% improvement in proper noun recognition accuracy** with keyterm boosting active. This is why `buildKeywords.ts` being a stub is a critical bug — every job is currently running with zero keyterm boost.

### Keyterm Sources (Priority Order)

1. `vocabulary_terms` rows for this deposition (intake-extracted)
2. `custom_vocabularies` rows for this job
3. `firm_vocabularies` rows for this firm
4. Deponent name, attorney names, case caption words (always included)

---

## SECTION 7 — Deepgram Transcription Pipeline

### Fixed Configuration Parameters

```typescript
const DEEPGRAM_CONFIG = {
  model:         'nova-3',     // Best legal diarization accuracy available
  punctuate:     true,
  smart_format:  true,
  paragraphs:    true,
  diarize:       true,
  utterances:    true,
  numerals:      true,
  language:      'en-US',
  filler_words:  true,         // uh, um, ah — ALWAYS store, may hide in display
  // keyterms: built from vocabulary sources (not hardcoded here)
};
```

### Filler Word Strategy

Filler words (`uh`, `um`, `ah`, `huh`, `hmm`) **must always be stored** as `transcript_words` rows with `is_filler = TRUE`. They are part of the verbatim record. The reporter preference `show_fillers` controls display — hiding fillers from the editor view is acceptable; deleting them from the database violates the verbatim mandate.

**`uh-huh` and `uh-uh` are NOT filler words.** They are affirmative/negative responses and must never be converted to "Yes" or "No." They appear in the transcript verbatim.

### Webhook Processing Flow

```
Deepgram job submitted (with keyterms)
        ↓
Deepgram processes audio (async)
        ↓
Deepgram webhook fires to /api/deepgram/webhook
        ↓
Store raw JSON → transcriptions.deepgram_raw_json (IMMUTABLE — never modified)
        ↓
Background job: hydrate transcript_words rows from JSON
  (one row per word, position_index sequential from 0)
        ↓
Set transcriptions.words_hydrated = TRUE
        ↓
Notify reporter: transcript ready for speaker assignment
```

### Important: Media Processing Queue

Audio submission must go through a background queue, not the API route directly. If Deepgram submission fails from an API route, the user gets an error with no retry. Use Supabase Edge Function or background job with retry logic and exponential backoff.

---

## SECTION 8 — Speaker Assignment System

### UI Modal Specification

When a transcript loads for the first time, a modal dialog appears **automatically and cannot be dismissed** until all detected speakers are assigned. The reporter sees:

| Detected Speaker | Audio Sample | Assign to Participant | Role |
|---|---|---|---|
| Speaker 0 | ▶ 5-sec clip | [Dropdown — from intake parser] | [Role dropdown] |
| Speaker 1 | ▶ 5-sec clip | [Dropdown — from intake parser] | [Role dropdown] |
| Speaker 2 | ▶ 5-sec clip | [Dropdown — from intake parser] | [Role dropdown] |

The dropdown is pre-populated from `participants` rows extracted by the intake parser. For most depositions, this means the reporter is doing confirmation, not data entry.

### Role-to-Label Mapping (Auto-Derived)

| Role | Colloquy Label | Q/A Label |
|---|---|---|
| `examining_attorney` | `MR. [LAST NAME]:` | `Q.` |
| `cross_examining_attorney` | `MR. [LAST NAME]:` | `Q.` |
| `witness` | `THE WITNESS:` | `A.` |
| `reporter` | `THE REPORTER:` *(never "THE COURT REPORTER")* | — |
| `videographer` | `THE VIDEOGRAPHER:` | — |
| `interpreter` | `THE INTERPRETER:` | — |

### Speaker Assignment Quality Gate

If any `speaker_index` present in `transcript_words` has no row in `speaker_assignments`, the quality gate raises QG-002 (ERROR — blocks export).

---

## SECTION 9 — Interactive Transcript Editor

### Editor Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR: Job name · Deponent · Status · Formatter Run · Export │
├──────────────────┬──────────────────────────────────────────────┤
│  LEFT PANEL      │  TRANSCRIPT BODY                             │
│  (300px)         │  Word-level display                          │
│                  │  Line numbers + page numbers                 │
│  • Flags list    │  Confidence highlighting                     │
│  • Exhibits      │  Inline editing                              │
│  • Sections      │  Speaker labels                              │
│  • AI sidebar    │  [VERIFY] tag indicators                     │
├──────────────────┴──────────────────────────────────────────────┤
│  AUDIO/VIDEO PLAYER                                             │
│  Waveform · Seek · Speed control · Time display                 │
│  Keyboard: Space=play/pause · F7=rewind · F9=forward            │
└─────────────────────────────────────────────────────────────────┘
```

### Audio/Video Synchronization

- Every `transcript_word` row has `start_time` and `end_time` in seconds
- Clicking any word seeks audio to `word.start_time`
- During playback, the editor auto-scrolls and highlights the currently playing word
- Waveform visualization: click any point to seek to that timestamp

### Media Player Controls

- **Variable playback speed:** 0.5×, 0.75×, 1.0×, 1.25×, 1.5×, 2.0× — reporters typically proof at 1.25–1.5×
- **Configurable rewind increment:** 2–5 seconds auto-rewind on each replay (foot pedal equivalent for keyboard workflow)
- **Keyboard shortcuts:** Space (play/pause), F7 (rewind), F9 (forward) — compatible with USB foot pedal controllers
- **Volume control + mute**
- **Video support:** auto-detects MP4/MOV/WebM — same timestamp sync applies

### Confidence Highlighting System

| Confidence Range | Display Color | Review Priority |
|---|---|---|
| ≥ 0.90 | Normal (no highlight) | Low |
| 0.80 – 0.89 | Yellow | Review |
| 0.70 – 0.79 | Orange | Review Required |
| < 0.70 | Red | Critical — must correct |

`confidence_class` is a **generated column** on `transcript_words` for fast indexing:
`HIGH (≥0.90) · MEDIUM (0.80–0.89) · LOW (0.70–0.79) · CRITICAL (<0.70)`

### Confidence Review Mode

Reporter activates "Confidence Review Mode" from toolbar. Editor filters to show only words below 0.80 threshold — creating a focused review queue. Each flagged word shows its confidence score, a one-click audio play button, and edit/confirm controls.

### [VERIFY] Tag System

Scopists insert `[VERIFY]` tags on any word or phrase via the review UI. Tags are stored in `transcript_flags` with `flag_type = 'VERIFY'`. The pre-export quality gate (QG-001) blocks export if any `[VERIFY]` tags remain unresolved.

**[SCOPIST: ...] Notes** are editorial annotations stored as `SCOPIST_NOTE` flags. All `[SCOPIST: ...]` content must be removed before export — the quality gate (QG-006) blocks export if any remain.

### Editing Actions

- Correct a word (logs to `transcription_edits`, preserves `original_word`)
- Split or merge paragraphs
- Reassign speaker on a paragraph (triggers formatter re-run)
- Insert parenthetical from library or freeform
- Insert exhibit marker
- Mark section boundary (manual section override)
- Insert [VERIFY] flag
- Insert [SCOPIST: ...] note

### Non-Verbal Event Insertion Toolbar

Parenthetical library (Texas UFM standard):

| Button | Inserts |
|---|---|
| Nods | `(Moving head up and down.)` |
| Shakes | `(Moving head side to side.)` |
| Indicating | `(Indicating.)` |
| Reviewing | `(Witness reviewing document.)` |
| Pause | `(Pausing.)` |
| Laugh | `(Laughing.)` |
| Inaudible | `(inaudible)` — lowercase, no period |
| Off Record | `(Off the record at _:__ p.m.)` — prompts for time |
| On Record | `(Back on the record at _:__ p.m.)` |
| Exhibit | `(Plaintiff's Exhibit No. __ marked and displayed on screen.)` — prompts for number |

**Objective language rule:** Parenthetical notations must be objective descriptions of observable behavior. Not: `(The witness appeared confused.)` — adds interpretation. Allowed: `(Pausing.)`.

### Consistency Engine

Scans all proper nouns and capitalized terms for spelling variations across the entire transcript. Flags variations for review. This is the most common cause of certification rejection in long depositions. Example: "Olivarez" vs. "Olivares" vs. "Olivariz."

### Date Consistency Checker

Extracts all dates mentioned in the transcript using pattern matching. Compares against case `incident_date` from `depositions` table. Flags any date that does not match as a `DATE_CONFLICT` transcript flag. Critical: both dates in the Bourbois deposition (08/19/2023 vs. 08/16/2023) — this check would have caught that.

---

## SECTION 10 — Transcript Formatting Engine

### Architecture: Three Layers

```
Layer 1 — TRANSCRIPT DATA (transcript_words rows)
          Never modified by the formatter

Layer 2 — FORMATTING RULES (ResolvedRuleSet)
          Jurisdiction config + Reporter preferences + Job overrides
          Merged at formatter startup into a single object

Layer 3 — OUTPUT RENDERING (DOCX/PDF/ASCII)
          Reads transcript_paragraphs; never makes formatting decisions
```

### Formatter Pipeline

```
transcript_words
        ↓
buildResolvedRuleSet()   — load jurisdiction + reporter preferences
        ↓
detectSections()         — identifies deposition phases
        ↓
buildParagraphs()        — assigns paragraph_type, speaker labels
        ↓
postProcessParagraphs()  — em dash fix, time format, label normalization
        ↓
paginateParagraphs()     — assigns page_number, line_number_start/end
        ↓
saveParagraphs()         — writes transcript_paragraphs rows
```

### Zone System (Texas UFM)

| Zone | Tabs | Inches | Used For |
|---|---|---|---|
| Zone 0 | 0 tabs | Left margin | `BY MR. ___:` examination bylines ONLY |
| Zone 1 | 1 tab | 0.5" | `Q.` and `A.` labels ONLY |
| Zone 2 | 2 tabs | 1.0" | Q/A continuation wrap lines |
| Zone 3 | 3 tabs | 1.5" | Everything else |

### Q/A Formatting Rules

```
Q.  Did you see the document?           ← Zone 1, Q., 2 spaces, text
      on February 10, 2023?             ← Zone 2 wrap (continuation)
A.  Yes, I did.                         ← Zone 1, A., 2 spaces, text
```

**Two spaces after Q. and A. — always. Not one space, not a tab.**

### Re-Entry Marker (Critical Rule)

When opposing counsel interrupts and examining attorney resumes:

```
Q.  And would you agree that safety is always a priority?
         MR. MALONEY:  Objection, form.  You can go ahead.
A.  Yes.
Q.  (BY MR. MUNOZ)  And so as a good driver yourself, do
      you make safe driving your top priority?
```

Format: `Q.  (BY MR. [LAST NAME IN CAPS])  [question text]`

- Required only on FIRST Q. after colloquy interruption
- Not required after off-record breaks (BY MR. ___: byline handles that)
- Not italicized, not bold, not bracketed

### "Pass the Witness" — Formatted as Q. Not Colloquy

```
Q.  I'll pass the witness.
         MR. MALONEY:  We'll reserve.
```

"Pass the witness" is spoken by the examining attorney in the Q/A context → formatted as `Q.` "We'll reserve" is spoken by defending attorney outside the examination exchange → formatted as colloquy.

### Section Headers

```
DIRECT EXAMINATION          ← Bold, all caps, Zone 3
BY MR. MUNOZ:               ← Bold, left margin (Zone 0), no tab
```

`BY MR. ___:` byline appears:
1. Immediately after DIRECT/CROSS/REDIRECT/RECROSS header
2. After every `(Back on the record...)` parenthetical
3. When a new attorney takes over examination

### Closing Language (Automatically Inserted)

```
(Deposition of Maria Dolores Olivarez concluded at 2:48 p.m.)

* * * * *

FURTHER DEPONENT SAYETH NOT.
```

These are inserted automatically by the formatter when the section detector identifies the CLOSING section. The reporter never types these manually.

### Three-Level Settings Hierarchy

Reporter preferences operate within a three-level hierarchy. Lower levels can only override style-class rules — never legal-class rules (those are governed by `jurisdiction_configs` exclusively):

```
Level 1 (Baseline) — Firm Settings
  firms.default_format_settings JSONB
  Firm-wide defaults applied to all jobs
  Example: firm standard is 2-space sentence spacing

Level 2 — Reporter Preferences
  reporter_preferences table
  Per-reporter personal style overrides
  Example: this reporter prefers filler words visible in editor

Level 3 (Highest) — Job Settings
  jobs.format_settings JSONB
  Per-job overrides for unusual proceedings
  Example: full name "MR. JOSE GARZA" instead of "MR. GARZA"

Jurisdiction config sits above all three — immutable.
```

### Rule Precedence Summary

`Jurisdiction (immutable) > Job Settings > Reporter Preferences > Firm Settings`



| Rule | Wrong | Correct |
|---|---|---|
| Em dash | `—` (U+2014) | `--` (double hyphen) |
| Time format | `2:12 PM` / `14:12` / `2:12pm` | `2:12 p.m.` |
| Doctor title | `Doctor Gutzman` | `Dr. Gutzman` |
| Court reporter label | `THE COURT REPORTER` | `THE REPORTER` |
| Sentence spacing | 1 space after `.` | 2 spaces (default) |

### Paragraph Rebuild Trigger

The formatter must rebuild `transcript_paragraphs` atomically (not partial updates) whenever:
- Speaker assignments change
- Any word's `display_word` changes
- Any word's `speaker_index` changes
- A manual section override is applied

Use a database function `rebuild_paragraphs(transcription_id)` called from the API after any of these events. Never allow partial paragraph boundary updates.

### locked_type Override

When a reporter manually overrides a paragraph's detected type, store `section_override = TRUE` on the `transcript_paragraphs` row. This flag prevents formatter re-runs from overwriting the manual override. The formatter respects locked overrides.

---

## SECTION 11 — Pagination Engine

### Critical: Pagination Must Happen at the Data Layer

Pagination cannot be deferred to export time. Page numbers must exist in `transcript_paragraphs.page_number` because:
- The exhibit index cannot populate page references without pagination data
- The Index of Examination cannot show page numbers
- The editor cannot display "Page 47 of 183" during review
- The quality gate cannot check line count compliance

### Algorithm

```
For each paragraph in paragraph_order:
  1. Compute line_count based on:
     - Paragraph type (Q/A vs. colloquy vs. header)
     - Text length vs. chars_per_line for jurisdiction
     - Wrap behavior at Zone 1, 2, or 3

  2. If current_page_line + line_count > 25:
     → Advance to next page, reset line counter

  3. Assign: page_number, line_number_start, line_number_end

After pagination:
  4. Update exhibit_markers.page_number from paragraph page_number
  5. Update transcript_sections.start_page / end_page
  6. Update exhibit.transcript_page
```

### Partial Re-Pagination Rule

Any edit to transcript content triggers **re-pagination from the edited point forward** — not full re-pagination. Full re-pagination is O(N) and will be slow on 200-page depositions. Partial re-pagination is O(n) where n = paragraphs after edit point.

Exception: full re-pagination when jurisdiction setting changes.

---

## SECTION 12 — Inclusion Pages — Automatic Generation

All inclusion pages are generated from database fields. The reporter provides zero manual input for these pages — they are fully automatic from intake data.

### Title Page

Sources: `depositions.case_style`, `depositions.cause_number`, `depositions.court_name`, `depositions.deponent_name`, `depositions.deposition_date`, `depositions.start_time`, `depositions.is_remote`, `jobs.volume_number`

### Appearances Page

Sources: `depositions.ordering_attorney`, `depositions.ordering_firm`, `depositions.copy_attorneys` JSONB, `profiles.full_name` (reporter), `profiles.license_number`, `depositions.assigned_videographer_id`

### Index of Examination

Source: `transcript_sections` rows where `section_type IN ('DIRECT','CROSS','REDIRECT','RECROSS')` — `start_page` from pagination. One row per examination section.

### Index of Exhibits

Source: `exhibits` rows joined to `exhibit_markers` → `page_number`. Quality gate QG-007 blocks export if any exhibit has `page_number = NULL`.

### Certificate Page

Source: `profiles.full_name`, `profiles.license_number`, `profiles.license_state`, `profiles.license_expires`, `depositions.deponent_name`, `jurisdiction_configs.certification_language`

The date/signature lines are intentionally blank — only the reporter can complete this at certification time.

---

## SECTION 13 — Multi-Format Export Engine

### Supported Formats

| Format | Use Case |
|---|---|
| `QA_DOCX` | Primary certified format — Q/A examination labels |
| `FULLNAME_DOCX` | Full name labels throughout — colloquy-heavy depositions |
| `CONDENSED_DOCX` | 4 pages per sheet — law firm exhibit sets |
| `ASCII` / `TXT` | Case Catalyst, Eclipse, Stenograph CAT software import |
| `PDF` | Searchable PDF — required for CA appellate submissions |
| `ETRANS` | E-Trans realtime delivery format |

### Export Pipeline

```
Quality gate check (12 checks, errors block)
        ↓
Load transcript_paragraphs (paginated)
        ↓
Load deposition metadata for inclusion pages
        ↓
Generate inclusion pages
        ↓
Assemble full document in target format
        ↓
Store file URL in exports table
        ↓
Reporter certifies → export_certifications row created
```

### Unified Export Service

**All export routes call a single service:** `src/lib/transcription/formatter/export-service.ts`

The following are deprecated and must be removed after the new formatter is stable:
- `lib/export.ts`
- `lib/services/export.ts`

Both current export routes (`/api/jobs/[id]/export` and `/api/transcripts/[id]/export`) will call the unified service.

---

## SECTION 14 — Multi-State Compliance Standards (10 Jurisdictions)

These specifications populate the `jurisdiction_configs` table. When a reporter selects their jurisdiction at job creation, the formatter and export engine apply the corresponding configuration automatically.

### Jurisdiction Comparison Matrix

| Feature | TX | CA | FL | NY | IL | NJ | PA | GA | OH | SC |
|---|---|---|---|---|---|---|---|---|---|---|
| Lines/page | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| Left margin | 1.0" | 1.25" | 1.0" | 1.75" | 1.0" | 1.0" | 1.75" | 1.75" | 1.0" | 1.75" |
| Min chars/line | 56 | 56 | 56 | 63 | 56 | 52 | 63 | 63 | 56 | 63 |
| Font | Courier | Courier | Arial/Bookman | Courier | Courier | Courier | Courier | Courier | Courier | Courier |
| Font size | 12pt | 12pt | 12pt | 12pt | 12pt | 12pt | 12pt | 12pt | 12pt | 12pt |
| Require bookmarks | No | **Yes** | No | No | No | No | No | No | No | No |
| Searchable PDF | No | **Yes** | No | No | No | No | No | No | No | No |
| Upper case speakers | No | No | No | No | No | No | No | No | **Yes** | No |
| Retention (years) | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 |

### Key State-Specific Rules

**Texas (Primary):** TX UFM/JBCC governs everything. Searchable PDF required for electronic appellate records. Character density 9–10 cpi. Format box with solid marginal lines required.

**California:** Bookmarks required in every electronic transcript (for each heading, witness examination, exhibit). Multi-reporter block numbering for lengthy trials. Bipartite record system (capital vs. civil different rules).

**Florida:** 56-character minimum per line (anti-inflation measure). Font must be Arial 12pt or Bookman Old Style 12pt (NOT Courier) per proposed amendments. Court owns official records; reporters are employees of the court in some circuits.

**New York (Part 108):** Left margin exactly 1.75 inches from page edge, demarcated by two vertical lines 1/16" apart. Right margin 3/8". Writing block 9" × 6-5/16". Colloquy speaker name indented 15 spaces; continuation at 5 spaces. Single index required listing witnesses by calling party.

**Illinois:** OCR PDF required (300–600 dpi) for eFileIL. Criminal transcripts take precedence over civil in production queue. Court Reporting Services (CRS) branch of AOIC provides oversight.

**Ohio:** Speaker identifiers in ALL CAPS required by ORC §2301.

---

## SECTION 15 — AI Proofreading & Style Guide Engine

### AI Model Selection

**Depo-Pro uses Claude (Anthropic) exclusively — not OpenAI/GPT.** Some prior architecture documents reference OpenAI/GPT; those references are outdated and superseded by this document.

| Task | Model | Reason |
|---|---|---|
| Intake document parsing | `claude-opus-4-6` | Highest accuracy for structured extraction from legal documents |
| AI proofreading (grammar, terminology) | `claude-sonnet-4-6` | Best cost/quality ratio for high-volume word-level review |
| Style guide RAG queries | `claude-sonnet-4-6` | Efficient similarity-matched rule lookup |
| Quality gate analysis | `claude-sonnet-4-6` | Fast, consistent rule evaluation |

### Three AI Engines

**Engine 1: Punctuation & Grammar**
- Sentence-ending punctuation after Q. and A. exchanges
- Comma placement in legal syntax
- Quotation mark handling when attorney reads document aloud

**Engine 2: Legal Terminology**
- Court-specific terminology, procedure names, statute citations
- Verifies proper nouns against vocabulary_terms table
- Example: "court store" → "court order"

**Engine 3: Consistency**
- Scans all proper nouns for spelling variations
- Flags: "Munos" vs "Munoz" vs "Muñoz"
- Case number consistency

### AI Suggestion Rules

- **Never auto-applied.** All suggestions stored in `ai_suggestions` table, status `'pending'`
- Reporter sees suggestions in the AI sidebar panel
- Reporter accepts or rejects each suggestion individually
- Accepted suggestions update `transcript_words.display_word`
- Rejected suggestions are logged for ML training signal

### Style Guide Reference Library (Phase 3)

Tier 1 (Critical — must acquire before Phase 3):
- Morson's English Guide for Court Reporters (Margie Wakeman Wells)
- The Gregg Reference Manual
- The Redbook: A Manual on Legal Style

Tier 2 (Important):
- The Chicago Manual of Style
- The Associated Press Stylebook
- Black's Law Dictionary

These are digitized, chunked, and indexed in `style_reference_chunks` table using pgvector for RAG-based style suggestion. When a reporter highlights ambiguous text, the engine queries the vector store for relevant rules and displays them in the sidebar with source attribution.

---

## SECTION 16 — Pre-Certification Quality Gate

### 12 Checks — Complete List

| Code | Severity | Blocks Export | Description |
|---|---|---|---|
| QG-001 | ERROR | YES | Unresolved `[VERIFY]` tags remain in transcript |
| QG-002 | ERROR | YES | Speaker mapping incomplete — unmapped speaker_index |
| QG-003 | ERROR | YES | Date conflict flags unresolved |
| QG-004 | ERROR | YES | Certification block empty — reporter data missing |
| QG-005 | ERROR | YES | Words marked `is_deleted = TRUE` (verbatim mandate) |
| QG-006 | ERROR | YES | `[SCOPIST: ...]` notes remain in transcript body |
| QG-007 | ERROR | YES | Exhibit index has entries with `page_number = NULL` |
| QG-008 | WARNING | No | Font or spacing non-compliant with jurisdiction |
| QG-009 | WARNING | No | Lines-per-page exceeds jurisdiction maximum |
| QG-010 | WARNING | No | Low-confidence words not reviewed |
| QG-011 | WARNING | No | Em dash `—` characters present in transcript |
| QG-012 | WARNING | No | `THE COURT REPORTER` label detected (should be `THE REPORTER`) |

### UI Behavior

Checklist modal with green checkmarks for passing items and red warning icons for failures. Reporters can override WARNING items with a logged reason. ERROR items cannot be overridden — they must be resolved. All certification events logged in `export_certifications`.

---

## SECTION 17 — Transcript Versioning & Integrity Chain

### Existing: transcript_integrity_chain (SHA-256)

The codebase already contains a linked SHA-256 hash chain — every edit version-stamped, immutability trigger on `original_transcript`. This is more sophisticated than most legal transcript systems. The architecture review rates this as "Legal defensibility: 10/10."

**Add verification function:**
```sql
CREATE OR REPLACE FUNCTION verify_transcript_integrity(p_transcription_id UUID)
RETURNS BOOLEAN AS $$
-- Traverse the hash chain and verify each link
-- Returns FALSE if any hash mismatch detected
$$ LANGUAGE plpgsql;
```

### New: transcript_versions Table (Phase C)

For milestone versions (not every keystroke):

```sql
CREATE TABLE transcript_versions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcription_id   UUID REFERENCES transcriptions(id),
  version_number     INTEGER NOT NULL,
  version_type       TEXT NOT NULL,
  -- 'ai_rough_draft' | 'ai_corrected' | 'scopist_edit'
  -- | 'reporter_review' | 'certified' | 'manual_save' | 'restored_from_vN'
  created_by         UUID REFERENCES profiles(id),
  change_summary     TEXT,
  word_snapshot      JSONB NOT NULL,       -- Full transcript_words state
  paragraph_snapshot JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

**Storage optimization:** Store full `word_snapshot` only for milestone versions (`ai_rough_draft`, `certified`). Store word-level diff only for intermediate edits: `{word_id, old_value, new_value}`. This reduces storage 80–90%.

**Auto-create version snapshots on:**
1. Deepgram job completes → `ai_rough_draft`
2. AI correction completes → `ai_corrected`
3. Scopist submits for reporter review → `scopist_edit`
4. Reporter certifies → `certified`
5. Manual save → `manual_save`

---

## SECTION 18 — Exhibit Management System

### Exhibit Workflow

1. During intake: attorney provides exhibit list → extracted by AI parser
2. During deposition: reporter inserts exhibit marker parenthetical at the point in transcript where exhibit is introduced
3. Formatter: parses exhibit parenthetical, links to `exhibits` row via `exhibit_markers`
4. Pagination: assigns `page_number` to `exhibit_markers.page_number` and `exhibits.transcript_page`
5. Export: Index of Exhibits auto-populated from `exhibits` with page references

### Exhibit Marking Format

Exhibit marker appears **before** the question that introduces it:

```
         (Plaintiff's Exhibit No. 3 marked and displayed on screen
           -- aerial map.)
Q.  Okay. I'm going to pull up Exhibit 3. Are you able to see this?
A.  Yes.
```

With descriptor: `-- [description]` after double hyphen.

### Exhibit Uniqueness

```sql
-- Party-aware uniqueness (Plaintiff Exhibit 1 ≠ Defendant Exhibit 1)
UNIQUE(deposition_id, party, exhibit_number)
```

### Exhibit Navigation in Editor

With `exhibit_markers.word_id` anchoring exhibits to word positions, the editor can render a clickable exhibit badge in the margin next to each exhibit introduction. Clicking the badge in the exhibit index panel scrolls the editor to that word and seeks the media player to that timestamp. No competing product currently offers this.

---

## SECTION 19 — Bourbois Case Study — Error Analysis Reference

**Case:** Ariella Starr Bourbois · Cause No. C-3123-25-J · Hidalgo County, Texas  
**Source:** Rough draft from Deepgram AI transcription vs. scopist-edited version

This case study drives Depo-Pro's development priorities. Each error maps to a platform feature.

### Error 1 — Spacing and Line Formatting

Double carriage returns between paragraphs produced blank lines — non-standard and breaks page count calculations.

**Platform fix:** `spacing: { line: 480, lineRule: 'auto', before: 0, after: 0 }` applied uniformly. Formatter never inserts blank paragraphs — uses double line-height only.

### Error 2 — Tab Stop Depth

Original used one tab or no tab before speaker labels. Standard requires three tabs.

**Platform fix:** Three-zone tab system enforced by formatter. `new Paragraph({ children: [new TextRun("\t\t\t"), new TextRun({ text: "Q.  " }), ...] })`

### Error 3 — Q. / A. vs. Full Speaker Names in Examination

Original used `MR. GARZA:` and `THE WITNESS:` throughout examination body. Standard requires `Q.` and `A.` in examination sections.

**Platform fix:** Section detection engine identifies examination boundaries. Within examination, speaker_assignments.qa_label drives label (`Q` or `A`). Full name labels only in colloquy.

### Error 4 — Date Inconsistency (Critical)

Case caption: accident on 08/19/2023. MR. GARZA references 08/16/2023 in two questions. Material factual inconsistency — cannot certify until resolved.

**Platform fix:** Date consistency checker in Section 9. Both dates flagged as `DATE_CONFLICT` before reporter even sees transcript. Quality gate QG-003 blocks export until resolved.

### Error 5 — Dropped/Incomplete Transcription Segments

Missing MOS code, incomplete question, answer beginning before speaker captured.

**Platform fix:** `CRITICAL` confidence words (< 0.70) auto-flagged. [VERIFY] tag insertion. Quality gate QG-001 blocks export if unresolved.

### Error 6 — "THE COURT REPORTER" Label

Non-standard. Texas UFM specifies "THE REPORTER."

**Platform fix:** Speaker label normalization in post-processor. Quality gate QG-012 (WARNING). `ai_rules` table seed includes `COURT_REPORTER_LABEL` rule.

---

## SECTION 20 — Billing, Subscriptions & Stripe Architecture

### Subscription Tiers

| Tier | Target | Key Limits |
|---|---|---|
| **Starter** | Solo reporter | 10 depositions/mo, TX only |
| **Professional** | Active reporter | 50 depositions/mo, 5 jurisdictions |
| **Agency** | Court reporting firms | Unlimited, all 10 jurisdictions, multi-reporter |

### Stripe Integration

- Stripe Checkout for subscription signup
- Stripe Customer Portal for billing management
- Stripe webhooks: `customer.subscription.created/updated/deleted`, `invoice.paid/failed`
- `billing_records` table tracks all subscription events
- Job creation checks firm subscription limits before allowing new depositions

---

## SECTION 21 — API Route Structure

### Core API Routes

```
POST   /api/depositions                     Create deposition
GET    /api/depositions                     List firm depositions
GET    /api/depositions/[id]                Get deposition details
PATCH  /api/depositions/[id]                Update deposition

POST   /api/jobs                            Create transcription job
PATCH  /api/jobs/[id]                       Update job status

POST   /api/transcriptions/submit           Submit audio to Deepgram
POST   /api/deepgram/webhook                Deepgram callback (webhook)
POST   /api/transcriptions/[id]/hydrate     Hydrate transcript_words from JSON

GET    /api/transcriptions/[id]/words       Get transcript_words (paginated)
PATCH  /api/transcriptions/[id]/words/[wid] Correct a word
POST   /api/transcriptions/[id]/format      Run formatter engine
GET    /api/transcriptions/[id]/paragraphs  Get transcript_paragraphs

GET    /api/speakers/[transcription_id]     Get speaker assignments
POST   /api/speakers                        Create speaker assignment
PATCH  /api/speakers/[id]                   Update speaker assignment

GET    /api/exhibits/[deposition_id]        List exhibits
POST   /api/exhibits                        Create exhibit

POST   /api/flags                           Create transcript flag
PATCH  /api/flags/[id]/resolve              Resolve flag

POST   /api/export/[transcription_id]       Generate export (replaces old routes)
POST   /api/export/certify/[export_id]      Record certification

GET    /api/quality-gate/[transcription_id] Run quality gate checks

POST   /api/intake/parse                    Parse deposition notice (Claude)
POST   /api/intake/keywords/[deposition_id] Build Deepgram keyword array
```

---

## SECTION 22 — Development Phases & Timeline

### Phase 1 — Formatter Foundation (Weeks 1–4) 🔴 CURRENT

**Goal:** Produce a certifiable Texas transcript from any Deepgram output.

Week 1–2:
- [ ] Run Phase A database migrations (12 migrations)
- [ ] Hydrate existing `transcriptions.words` JSON → `transcript_words` rows
- [ ] Fix `buildKeywords.ts` stub → real implementation from vocabulary tables

Week 2–3:
- [ ] Section detection engine (`section-detector.ts`)
- [ ] Post-processor overhaul (em dash, time format, label normalization)
- [ ] Paragraph builder — Q/A, colloquy, section headers

Week 3–4:
- [ ] Re-entry markers, BY MR. ___: bylines, parentheticals
- [ ] Closing language automation
- [ ] Pagination engine (25 lines/page, line numbers)

Week 4:
- [ ] Inclusion page generators
- [ ] DOCX assembler (replaces `legal-formatter.ts`)
- [ ] Quality gate — all 12 checks

**Exit criterion:** Olivarez deposition produces a certifiable DOCX that passes all 12 quality gate checks.

### Phase 2 — Transcript Editor (Weeks 5–9)

- [ ] Run Phase B database migrations
- [ ] Audio/video player with waveform visualization
- [ ] Word-level audio sync (click → seek)
- [ ] Confidence highlighting (generated column `confidence_class`)
- [ ] Inline word editing with edit history
- [ ] [VERIFY] tag insertion and resolution UI
- [ ] Consistency engine (proper noun variation detection)
- [ ] Date consistency checker

### Phase 3 — Speaker Assignment & Deepgram Pipeline (Weeks 10–12)

- [ ] Speaker assignment modal UI (audio sample playback)
- [ ] Deposition intake AI parser (Claude Opus)
- [ ] buildKeywords.ts → intake-parser-driven keyword generation
- [ ] Media processing queue (async, with retry)
- [ ] Scopist assignment workflow

### Phase 4 — Quality Gate & Multi-State (Weeks 13–16)

- [ ] Pre-certification quality gate modal UI
- [ ] Multi-state compliance engine — remaining 9 jurisdictions
- [ ] Searchable PDF with bookmarks (California compliance)
- [ ] ASCII / E-Trans export

### Phase 5 — AI Style Guide Engine (Weeks 17–20)

- [ ] Acquire and digitize reference library (Morson's, Gregg, etc.)
- [ ] pgvector setup and document indexing
- [ ] RAG-based style suggestion sidebar
- [ ] AI suggestion accept/reject workflow

---

## SECTION 23 — Consolidation & Deprecation Plan

### Duplicate Systems to Remove

The codebase currently has multiple competing implementations for the same features:

| Existing File | Status | Action |
|---|---|---|
| `lib/export.ts` | **Deprecated** | Mark `@deprecated`, remove after Phase 1 stable |
| `lib/services/export.ts` | **Deprecated** | Mark `@deprecated`, remove after Phase 1 stable |
| `src/lib/transcription/legal-formatter.ts` | **Deprecated** | Replace with new formatter; keep until validated |
| `app/api/jobs/[id]/export/route.ts` | **Redirect** | Wire to new unified `export-service.ts` |
| `app/api/transcripts/[id]/export/route.ts` | **Redirect** | Wire to new unified `export-service.ts` |

### Post-Deprecation Cleanup

After new formatter is validated (minimum 2 weeks of stable production operation):
- Hard-delete `lib/export.ts`
- Hard-delete `lib/services/export.ts`
- Hard-delete `src/lib/transcription/legal-formatter.ts`
- Delete deprecated `DIRECT_URL` Supabase secret
- Resolve GitHub secret scanning alert
- Enable Dependabot alerts

---

## SECTION 24 — WKT Module Decision

The Word Knowledge Test (WKT) module — flashcards, mock exams, practice sessions — is a complete, functional, separate product. It has zero code overlap with the transcription or formatting pipeline.

**Decision: Separate Product — Extract Post-Formatter Launch**

1. **Now through formatter launch:** Leave WKT code in place, do not touch
2. **Post-formatter launch:** Extract to `voice-writer-training` repository
3. **Long term:** Deploy as standalone SaaS or optional Depo-Pro add-on module

WKT will not interfere with any formatter, editor, or pipeline development work.

---

## SECTION 25 — Long-Term Vision

Features enabled by the current architecture, planned for post-Phase 5:

- **Real-time transcription:** Live Deepgram stream → instant transcript display for remote depositions. `realtime_sessions` table already specified.
- **AI Witness Summaries:** Claude summarizes key testimony points, flagged contradictions, timeline of events
- **Exhibit Auto-Detection:** AI identifies probable exhibit references in testimony and pre-populates exhibit markers
- **Deposition Timeline:** Visual timeline of all key events (exhibit introductions, off-record breaks, examination changes)
- **Semantic Search:** pgvector-powered search across all transcripts ("find every deposition where a witness testified about a left turn")
- **Contradiction Analysis:** Cross-transcript analysis — witness says X in deposition 1, says not-X in deposition 2
- **CAT Software Import:** Accept and reformat transcripts produced in existing CAT software: Case Catalyst (`.ssc`, `.txt`), Eclipse (`.ec5`), Stenograph ProCAT, and generic ASCII/E-Trans files. Reporters upload rough drafts from their existing workflow; Depo-Pro applies jurisdiction formatting, runs the quality gate, and produces a certified export. This is the primary adoption path for reporters who want Depo-Pro's compliance features without abandoning their CAT software for production.

---

## Appendix A — Document Inventory

All prior architecture documents are superseded by this blueprint. The following documents contain information fully integrated here and should be archived:

| Document | Key Content Preserved |
|---|---|
| `DepoPro_Master_Roadmap_v2–v5.docx` | Complete workflow, tech stack, UI specs |
| `DepoPro_Architecture_Review_v1.docx` | Versioning, pagination algorithm, exhibit linking |
| `DepoPro_ErrorAnalysis_Roadmap_v4.docx` | Bourbois case study, date checker, VERIFY system |
| `DepoPro_Transcript_Formatting_Guide_v1.docx` | All formatting rules and examples |
| `State_Legal_Transcript_Formatting_Guidelines.docx` | All 10 jurisdiction requirements |
| `DEPO_PRO_FORMATTER_SPEC.md` | Formatter algorithm detail (companion doc — keep active) |
| `DEPO_PRO_DATABASE_SCHEMA.md` | Complete schema (companion doc — keep active) |
| `DEPO_PRO_SCHEMA_PHASE_B.md` | Phase B tables (companion doc — keep active) |
| `DEPO_PRO_FORMATTER_RULE_ENGINE.md` | Rule engine detail (companion doc — keep active) |

---

## Appendix B — Florida Font Clarification

The State Legal Transcript Formatting Guidelines document identifies a proposed amendment to Florida's Rule 2.535 specifying Arial 12pt or Bookman Old Style 12pt. Before implementing the Florida jurisdiction config, verify whether this amendment has been formally adopted by the Florida Supreme Court. If not yet adopted, use Courier New 12pt as the current standard.

---

*Depo-Pro System Blueprint v1.0 · March 2026 · Confidential Internal Engineering Reference*  
*This document is the single authoritative source of truth for all Depo-Pro platform development.*
