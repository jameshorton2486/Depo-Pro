# DEPO-PRO CORE ARCHITECTURE RULES

**System Invariants - Do Not Break**

This document defines non-negotiable architectural rules for the Depo-Pro platform.

All developers and AI agents must follow these rules.

Violating these rules can cause data leaks, transcript corruption, or platform instability.

---

## RULE 1 - STRICT MULTI-TENANCY

Depo-Pro is a true multi-tenant SaaS system.

It serves multiple organizations including:

- court reporting agencies
- law firms
- independent reporters
- medical experts

**Organizational hierarchy:**

```
ADMIN
   |
Agencies
   |- Reporter
   |- Scopist
   - Videographer

Law Firms
   |- Manager
   |- Attorney
   |- Paralegal
   - Medical roles
```

### SECURITY REQUIREMENT

Every organization must be completely isolated.

No user may access another organization's data.

### REQUIRED DATABASE STRUCTURE

All major tables must include:

- organization_id

Required tables include:

- jobs
- transcripts
- cases
- annotations
- exports
- audio_files
- transcript_segments

### REQUIRED QUERY PATTERN

**Incorrect query:**

```sql
SELECT * FROM jobs
```

**Correct query:**

```sql
SELECT * FROM jobs
WHERE organization_id = current_user.organization_id
```

### REQUIRED DATABASE SECURITY

Supabase Row Level Security (RLS) must enforce this rule.

Example RLS policy:

```
organization_id = auth.jwt().organization_id
```

This guarantees database-level tenant isolation.

---

## RULE 2 - TRANSCRIPTS MUST BE SEGMENTED

Depositions are extremely large documents.

**Typical deposition size:**

- 200-500 pages
- 25 lines per page
- 10-15 words per line

**Approximate total:**

- 50,000 - 80,000 words

### DO NOT STORE TRANSCRIPTS AS A SINGLE TEXT BLOB

**Incorrect design:**

```
transcripts
  content TEXT
  confidence_score
```

This breaks:

- audio synchronization
- word correction
- editing
- AI analysis
- search
- annotations

### REQUIRED TRANSCRIPT STRUCTURE

Transcripts must be stored as segments.

**Example table:**

```
transcript_segments
  id
  transcript_id
  start_time
  end_time
  text
  confidence
  speaker
  page_number
  line_number
```

### BENEFITS

Segmented transcripts allow:

- audio sync
- video sync
- word corrections
- transcript highlighting
- annotations
- AI analysis
- exhibit linking
- transcript comparison

This structure is required for the Transcript Review Tool.

---

## RULE 3 - JOB WORKFLOW STATE MACHINE

The Depo-Pro platform follows a strict deposition workflow.

**Workflow pipeline:**

```
Schedule -> Upload -> Transcribe -> Review -> Analyze -> Export
```

This workflow must be enforced by a job state machine.

### REQUIRED JOB STATUS ENUM

**JOB_STATUS**

- SCHEDULED
- AUDIO_UPLOADED
- TRANSCRIBING
- AI_COMPLETE
- IN_REVIEW
- REVIEW_COMPLETE
- FINALIZED
- EXPORTED

### REQUIRED STATE TRANSITIONS

- SCHEDULED -> AUDIO_UPLOADED
- AUDIO_UPLOADED -> TRANSCRIBING
- TRANSCRIBING -> AI_COMPLETE
- AI_COMPLETE -> IN_REVIEW
- IN_REVIEW -> REVIEW_COMPLETE
- REVIEW_COMPLETE -> FINALIZED
- FINALIZED -> EXPORTED

Invalid transitions must be blocked.

**Example rule:**

A reporter cannot finalize a transcript unless:

- status = REVIEW_COMPLETE

---

## RULE 4 - SEARCH ARCHITECTURE

Attorneys must be able to search across transcripts.

**Example search:**

- brake failure

**Result:**

- Matches across all depositions in the case.

### SCALABILITY CONSTRAINT

Postgres full-text search alone will not scale beyond:

- 100,000+ transcripts

### FUTURE SEARCH ARCHITECTURE

- **Storage layer:** Postgres (Supabase)
- **Search index:** ElasticSearch or Typesense

The search index must store:

- transcript_segments
- speaker
- timestamp
- case_id
- job_id

---

## PLATFORM VISION

Depo-Pro is not just a transcription tool.

It is designed to become:

**Deposition OS**

A complete legal deposition intelligence platform.

**Core capabilities:**

- AI transcription
- transcript review
- attorney analysis
- exhibit linking
- medical chronology
- litigation intelligence

---

## REQUIRED ARCHITECTURE DOCUMENTS

Before major development begins, the project must define:

1. **Data Architecture**
   - Full database schema
   - table relationships
   - indexes

2. **API Architecture**
   - All endpoints
   - inputs
   - outputs
   - permissions

3. **Component Tree**
   - All pages
   - UI components
   - dashboard structures

---

## FINAL RULE

If any future code conflicts with this document:

**THIS DOCUMENT TAKES PRECEDENCE**

AI agents must refuse to generate code that violates these rules.
