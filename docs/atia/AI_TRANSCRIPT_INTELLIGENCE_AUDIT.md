# AI Transcript Intelligence Audit (ATIA)

**Document:** `AI_TRANSCRIPT_INTELLIGENCE_AUDIT.md`
**Version:** 1.0
**Status:** Blueprint — pre-implementation
**Owner:** James / Depo-Pro
**Target codebase:** `feature/stage3-workspace-core`
**Reference implementation:** The "Deposition Transcript Formatter" Claude Project
**Consumers:** Codex CLI, Claude Code, Cursor (for scoped implementation tasks)

---

## Table of Contents

- [0. Executive Summary](#0-executive-summary)
- [1. Grounding: The Current State of Depo-Pro](#1-grounding-the-current-state-of-depo-pro)
- [2. The Paradigm Shift: Formatter → Editor](#2-the-paradigm-shift-formatter--editor)
- [3. Target Architecture: The Transcript Intelligence Engine (TIE)](#3-target-architecture-the-transcript-intelligence-engine-tie)
- [4. The Twelve Audits](#4-the-twelve-audits)
  - [4.1 AI Capability Audit](#41-ai-capability-audit)
  - [4.2 Prompt Decomposition Audit](#42-prompt-decomposition-audit)
  - [4.3 Knowledge Audit](#43-knowledge-audit)
  - [4.4 Deterministic Rule Audit](#44-deterministic-rule-audit)
  - [4.5 AI Responsibility Audit](#45-ai-responsibility-audit)
  - [4.6 Prompt Architecture Audit](#46-prompt-architecture-audit)
  - [4.7 Context Audit](#47-context-audit)
  - [4.8 Correction Object Audit](#48-correction-object-audit)
  - [4.9 Workspace Integration Audit](#49-workspace-integration-audit)
  - [4.10 Provider Abstraction Audit](#410-provider-abstraction-audit)
  - [4.11 Performance & Caching Audit](#411-performance--caching-audit)
  - [4.12 Migration Plan](#412-migration-plan)
- [5. Reference Artifacts](#5-reference-artifacts)
- [6. Implementation Roadmap](#6-implementation-roadmap)
- [7. Success Criteria & Testing Strategy](#7-success-criteria--testing-strategy)
- [8. Appendix: File Inventory Cross-Reference](#8-appendix-file-inventory-cross-reference)

---

## 0. Executive Summary

### The Problem

Depo-Pro's current AI integration treats Claude (and eventually other providers) as a **transcript formatter** — given raw Deepgram output, produce the finished transcript. This works in prototypes and demos but has three structural weaknesses:

1. **Single-shot risk.** One bad model call can silently corrupt a transcript. There is no way to know which parts came from the model, which came from deterministic rules, and which came from the human reporter.
2. **Provider lock-in.** `transcript_formatter/ai_tools.py` calls the Anthropic SDK directly. Switching to ChatGPT, Gemini, or a local model requires touching the pipeline itself.
3. **Prompt drift.** As the prompt grows to handle more cases, it accumulates concerns that don't belong to the AI at all — tab widths, page numbers, DOCX conventions, JSON schemas. Each addition raises the risk that a small prompt change breaks an unrelated behavior.

### The Insight

The Claude Project that has been producing high-quality output over the last several months is not doing so because it is a better formatter. It is doing so because it acts as an **editor**: it reads the raw Deepgram output and returns a small number of judgment-intensive corrections — proper names, medical terms, merged Q/A, objection attribution — while leaving deterministic work (spacing, dashes, indentation) to the deterministic layer.

That distinction, formatter vs. editor, is the entire architectural argument.

### The Solution: Transcript Intelligence Engine (TIE)

A dedicated service layer inside Depo-Pro that:

- Preserves Deepgram's `raw_transcript` as an **immutable baseline** (this is already enforced by the W23B canonical integrity gate — TIE builds on that foundation).
- Runs **deterministic preprocessing** for everything code can do reliably (spacing, number formatting, known abbreviations, date normalization).
- Delegates **judgment-intensive tasks** to a pluggable AI provider through a stable interface.
- Receives **first-class correction objects** — before/after/reason/confidence/source/location — not full transcripts.
- Merges corrections into a **reviewable workspace** where the human reporter accepts, rejects, or edits each suggestion.
- Records every accepted or rejected correction as **feedback data** to improve future prompts and glossaries.

### The Correction-Object Paradigm

The central shift is this:

**Before:**
```
Deepgram → Prompt("format this") → LLM → Full Transcript → Renderer → DOCX
```

**After:**
```
Deepgram → Immutable Baseline
              ↓
    Deterministic Preprocessor
              ↓
    Context Assembly (case + glossary + registries)
              ↓
    Transcript Intelligence Service
        (Editor Prompt against Baseline)
              ↓
    [Correction #1, Correction #2, ...] ← individually reviewable
              ↓
    Reporter Review Queue
              ↓
    Accepted Corrections merged into Working Transcript
              ↓
    Deterministic Renderer → DOCX
```

Every arrow in the "After" diagram is testable, replayable, and auditable. Every correction has provenance. No text ever changes without a record of who or what changed it.

### What This Audit Delivers

Twelve sub-audits, each answering one specific architectural question, plus reference artifacts and a phased migration plan. The audit does **not** produce a single new monolithic prompt. It produces the specification for a system in which prompts are small, versioned, composable, and separate from the code that renders their output.

### What This Audit Assumes

- The Claude Project we have been iterating on is the current **best available reference implementation** of the target editing behavior. Its behavior is documented, characterized, and used as the acceptance benchmark for the TIE.
- Existing Depo-Pro investments — `spec_engine/`, canonical integrity, `JobConfig`, the block-based processor, the `formatter_core`/`formatter_service`/`transcript_formatter` triad — are foundations to build on, not to replace. Where they need to change, the migration plan is explicit.
- The final transcript is always certified by a human court reporter. AI is advisory. This is stated in `MASTER_ARCHITECTURE.md` and is a non-negotiable design constraint.

### Expected Outcome

At the end of implementation, Depo-Pro will have:

1. A `TranscriptIntelligenceService` module that any workspace, batch job, or export path can call.
2. A `ProviderAdapter` interface with at least one live implementation (Anthropic Claude) and a mock implementation for tests.
3. A `CorrectionObject` schema enforced by both the backend and the frontend.
4. A modular prompt library (`prompts/`) with one prompt per concern (proper names, medical terms, Q/A splits, objections, etc.).
5. A case-scoped knowledge repository (proper name registry, medical glossary, attorney directory) that improves every future transcript.
6. A reporter review workflow in the Stage 3 workspace where corrections appear as diffs the reporter can accept, reject, or edit.
7. A feedback loop from accepted/rejected corrections into the knowledge repository and prompt library.
8. Regression fixtures — the Caram and Garza transcripts and any others added over time — that gate every prompt or knowledge change.

None of this depends on any specific AI provider. Any provider that implements the adapter interface can plug in.

---

## 1. Grounding: The Current State of Depo-Pro

Before proposing what to change, this section catalogs what exists. Every architectural decision that follows is expressed as a delta from this baseline.

### 1.1 Existing pipeline modules

The current codebase already has substantial pipeline structure. The key modules involved in transcript intelligence are:

| Path | Role | Notes |
|---|---|---|
| `transcript_formatter/ai_tools.py` | Direct Anthropic SDK calls | Model IDs hardcoded; chunking at paragraph boundaries; separate prompts for UFM extraction, corrections, review |
| `transcript_formatter/spec_engine/processor.py` | Block-based orchestration | Order: corrections → speaker mapping → classification → QA fixing → objection extraction → validation |
| `transcript_formatter/spec_engine/corrections.py` | Text correction rules | Documented priority order (Spec Section 9.4); enforces verbatim rule ("uh"/"um" never removed) |
| `transcript_formatter/spec_engine/models.py` | Data structures | `Block`, `Word`, `CorrectionRecord`, `JobConfig`, `ScopistFlag`, `PostRecordSpelling` |
| `transcript_formatter/spec_engine/classifier.py` | Block type assignment | Q / A / SPEAKER / COLLOQUY / PAREN / UNKNOWN / FLAG |
| `transcript_formatter/spec_engine/qa_fixer.py` | Q/A structural repair | Applied after classification |
| `transcript_formatter/spec_engine/objections.py` | Objection extraction | First-class handling separate from Q/A body |
| `transcript_formatter/spec_engine/validator.py` | Post-processing validation | Errors abort in `STRICT_MODE`; warnings attach to blocks |
| `transcript_formatter/spec_engine/speaker_mapper.py` | Speaker resolution | Uses `JobConfig` speaker map, with a `speaker_map_verified` flag |
| `formatter_core/*.py` | Export (DOCX, PDF) | Pure rendering — no AI |
| `formatter_service/*.py` | Formatter web service | Cloud Run–hosted formatter |
| `transcript_finalize_service/` | Finalization service | Separate service; not yet integrated into TIE conversation |
| `src/lib/transcript/canonicalIntegrity.ts` | Canonical gate (W23B) | Read-only validation before workspace ingest |

### 1.2 What is already correct

The current architecture makes several decisions that align with the target and should be preserved.

**Canonical integrity is already enforced.** W23B (`canonicalIntegrity.ts`) validates the Deepgram output before it enters the workspace and quarantines invalid rows as `needs_manual_review`. The immutable baseline principle central to the TIE is already partially in place.

**Block-based processing exists.** `spec_engine/processor.py` orchestrates transformations in a defined order and can snapshot state between steps via `run_logger`. This is closer to the target pipeline than a monolithic prompt approach.

**Verbatim protection is enforced by tests.** `corrections.py` documents that "uh"/"um" are never removed and that Morson's Rule 270 (ellipsis integrity) is protected. This is the correct instinct for content the AI must not touch.

**Correction records exist as data.** `CorrectionRecord` and `ScopistFlag` are already dataclasses that carry provenance-adjacent information (original, corrected, pattern, block index). The correction-object paradigm is a natural extension of these.

**JobConfig is already the context envelope.** Case-specific data (confirmed spellings, speaker map, verification flags) flows through `JobConfig`. This becomes the `context` bundle in the TIE.

**A separate rendering layer exists.** `formatter_core` handles DOCX/PDF export. Rendering is already independent of AI processing. The TIE reinforces this separation rather than introducing it.

### 1.3 Where the current architecture falls short

The following gaps are what the TIE closes.

**AI concerns are scattered.** `ai_tools.py` handles UFM extraction, per-chunk correction, and review as separate direct calls. There is no unifying interface, no shared context assembly, and no single provenance record.

**Prompts are embedded in Python.** `_UFM_EXTRACTION_PROMPT` and similar constants live as multi-line strings in `ai_tools.py`. They can't be versioned independently, diffed cleanly, or swapped without a code change.

**Provider is hardcoded.** `anthropic.Anthropic()` is instantiated inside `ai_tools.py`. There is no interface between "the pipeline needs an editor" and "which vendor's model is doing the editing." A future ChatGPT, Gemini, or local-model switch requires editing pipeline code.

**AI output is a full transcript, not a correction set.** Current calls return corrected text that must be diffed against the raw text to identify what changed. The reporter cannot see "the AI wants to change 'Bayer' to 'Baer' because the case glossary says so" as a discrete, reviewable event.

**Case knowledge is not persistent across transcripts.** Every transcript effectively starts fresh with whatever `JobConfig` provides. There is no case-scoped registry that accumulates over multiple transcripts in the same matter.

**No feedback loop from reporter edits.** When the reporter accepts or rejects an AI suggestion, that decision does not become training data for the next transcript. Institutional knowledge is lost with every session.

### 1.4 Existing audit corpus

The repo already contains dozens of audit and report documents. Many of these are directly relevant to this audit and should be cross-referenced by the implementation team:

- `MASTER_ARCHITECTURE.md` — the governing architecture document
- `DEEPGRAM_PIPELINE_REPORT.md`, `DEEPGRAM_WIRE_PARAMS_REPORT.md` — recognition baseline behavior
- `W23B_CANONICAL_INTEGRITY.md` — the canonical gate this audit builds on
- `KEYTERM_PIPELINE_FINDINGS.md`, `TRANSCRIPT_KEYTERM_AUDIT.md`, `KEYTERM_EXPANSION_NOTES.md` — the existing keyterm approach that becomes the seed for the proper name registry
- `SPEAKER_REASSIGNMENT_FIX_REPORT.md` — speaker resolution, a core AI-responsibility area
- `FORMATTER_OWNER_AUDIT.md`, `DEPO_EDITOR_BACKEND_AUDIT.md` — ownership audits that inform the provider abstraction
- `TRANSCRIPT_QUALITY_FINDINGS.md`, `CASE_STYLE_TERMINOLOGY_FINDINGS.md` — quality baselines the TIE must not regress
- `PROVIDER_MIGRATION_REPORT.md` — prior work on provider abstraction
- `DTAS-v1.0.md` (Deposition Transcript Analysis Spec) — the semantic spec the block engine implements
- `W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md` — the output contract downstream consumers rely on

Where this audit contradicts an existing document, this audit is treated as a proposal, not an authority. The final decision belongs to the owner (James) after review.

---

## 2. The Paradigm Shift: Formatter → Editor

The single most important idea in this audit is that AI's role changes from producing artifacts to proposing changes. Every subsequent decision follows from this shift.

### 2.1 What "formatter" means and why it fails

A formatter takes input and produces finished output. In the current design, the AI is asked to:

- Split merged speaker blocks
- Correct medical and legal terminology
- Normalize dates and numbers
- Apply CSR formatting conventions
- Handle exhibits, objections, and colloquy
- Preserve verbatim fillers
- Emit valid JSON that matches a schema
- Do all of the above simultaneously in one pass

This is too much for one call to be reliable. When the output is wrong, there is no clean way to say **which part** was wrong or **why**. The prompt has to grow with every new edge case. The rendering layer becomes tightly coupled to the prompt output shape, so a prompt change can break the renderer.

More subtly: a formatter forces the reporter to review the entire transcript against the original, because any word could have changed. Reviewing "did the AI break this?" is a very different job from reviewing "is this suggestion right?"

### 2.2 What "editor" means and why it succeeds

An editor reads two things:

1. The **canonical text** (Deepgram's raw output, immutable)
2. The **context** (case metadata, glossaries, registries, prior transcripts in the same case)

And produces one thing:

- A **list of proposed corrections**, each targeted at a specific location, each with a stated reason and confidence.

The editor doesn't render anything. It doesn't produce a transcript. It produces **suggestions against the canonical baseline**. Something else — deterministic code — applies accepted suggestions and renders the final artifact.

This inverts the review problem. Instead of the reporter reading the whole transcript looking for AI mistakes, the reporter reads a short list of proposed changes. Each one is visible, each one has a reason, each one can be accepted, rejected, or edited independently.

### 2.3 Consequences of the shift

Once the AI is an editor, several problems that used to feel intrinsic to the design go away:

**Provider swap becomes trivial.** The editor's job is well-defined: given canonical text + context, return correction objects. Any model that can do that job can plug in. The rest of the system doesn't care which provider was used.

**Prompt versioning becomes tractable.** Small, focused prompts (one per correction category) can be versioned independently. A change to the medical-term prompt doesn't risk affecting speaker resolution.

**Testing becomes real.** Golden fixtures — canonical text + expected correction set — can be run against any provider. Regression is visible: "the model used to suggest changing 'Bayer' to 'Baer' at word 2431, now it doesn't."

**Feedback becomes data.** Every correction the reporter accepts or rejects is a labeled example. Rejected corrections become negative training data. Accepted corrections that involved a new proper name become new entries in the case registry.

**Renderer becomes stable.** DOCX formatting (tabs, spacing, dashes, page numbers) is deterministic Python. Changes to formatting conventions do not require a prompt change. Changes to the prompt do not risk breaking the rendered output.

**Ownership becomes clear.** Every piece of behavior has one owner: the deterministic layer, the editor prompt, the reporter's judgment, or the renderer. When something goes wrong, the location of the bug is obvious.

### 2.4 What the editor is not allowed to do

To keep the paradigm clean, the editor is explicitly forbidden from:

- **Generating text that isn't a correction.** No prose, no explanations in the output.
- **Making changes that don't cite a specific word range.** Every correction points at word IDs from the canonical text.
- **Making changes without a stated reason.** The `reason` field is required. Empty or generic reasons ("improved clarity") are rejected.
- **Making changes below a confidence threshold** without flagging them as low-confidence. Low-confidence corrections still surface, but they're visually distinct in the reporter UI and require an explicit accept.
- **Rewriting Deepgram artifacts that aren't in its allow-list.** If the deterministic layer already handles a rule (double-word repeats, sentence spacing), the editor doesn't touch it.
- **Producing corrections against locked or certified transcripts.** The TIE refuses to run the editor on transcripts past the certification boundary.

Each of these constraints is enforced by the correction-object validator, not by the prompt. The prompt asks the editor to behave; the validator makes non-compliance impossible.

### 2.5 What stays the same

The paradigm shift does not change:

- The Deepgram recognition step
- The canonical integrity gate (W23B)
- The `JobConfig` shape (though it grows to include registries)
- The DOCX/PDF renderer (`formatter_core`)
- The reporter's certifying authority
- The verbatim rule
- The Morson's Rule 270 ellipsis integrity requirement
- The Texas UFM output contract

The shift is purely about **where AI sits in the pipeline** and **what it produces**. Everything upstream of AI and downstream of accepted corrections is unchanged in principle.

---

## 3. Target Architecture: The Transcript Intelligence Engine (TIE)

This section defines the target architecture in enough detail to serve as a design specification. Section 4 breaks each component into its own audit; this section is the map.

### 3.1 High-level component diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Depo-Pro Frontend (React)                       │
│                                                                          │
│  Stage 3 Workspace ─┬─ Transcript Editor (TipTap)                        │
│                     ├─ Corrections Panel  ◄────────┐                     │
│                     └─ Audio Sync (WaveSurfer)     │                     │
└─────────────────────┼──────────────────────────────┼─────────────────────┘
                      │                              │
                      │ REST                         │ REST
                      ▼                              │
┌──────────────────────────────────────────────────────────────────────────┐
│                Transcript Intelligence Service (TIS)                     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  1. Context Assembler                                           │     │
│  │     - loads case metadata, JobConfig                            │     │
│  │     - loads case-scoped registries (names, medical, attorneys)  │     │
│  │     - loads global glossaries                                   │     │
│  │     - loads active prompt versions                              │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  2. Deterministic Preprocessor                                  │     │
│  │     - runs corrections.py rules                                 │     │
│  │     - normalizes spaces, dates, dollars, numbers                │     │
│  │     - applies known abbreviations                               │     │
│  │     - produces "prepared canonical" (still immutable)           │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  3. Editor Dispatch (parallel, one call per specialty)          │     │
│  │                                                                 │     │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐  │     │
│  │  │ Proper Name │ │ Medical Term │ │ Q/A Split  │ │ Objection │  │     │
│  │  │   Prompt    │ │    Prompt    │ │   Prompt   │ │   Prompt  │  │     │
│  │  └─────────────┘ └──────────────┘ └────────────┘ └───────────┘  │     │
│  │                                                                 │     │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────┐                │     │
│  │  │  Speaker    │ │  Legal Term  │ │  Reviewer  │                │     │
│  │  │  Attribute  │ │    Prompt    │ │    Flag    │                │     │
│  │  └─────────────┘ └──────────────┘ └────────────┘                │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  4. Provider Adapter (Anthropic / OpenAI / Gemini / Local)      │     │
│  │     - one interface: call(prompt, context, model) → response    │     │
│  │     - handles auth, retries, chunking, timeouts                 │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  5. Correction Aggregator                                       │     │
│  │     - collects corrections from all specialty prompts           │     │
│  │     - deduplicates overlapping suggestions                      │     │
│  │     - validates against Correction Schema                       │     │
│  │     - assigns unique correction IDs                             │     │
│  │     - persists to database with provenance                      │     │
│  └─────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
                      │                              ▲
                      │ returns correction set        │ feedback (accept/reject)
                      ▼                              │
┌──────────────────────────────────────────────────────────────────────────┐
│                          Supabase (Postgres)                             │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐     │
│  │ raw_transcripts │  │  corrections     │  │ correction_decisions │     │
│  │ (immutable)     │  │  (proposals)     │  │ (accept/reject log)  │     │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘     │
│                                                                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐     │
│  │  proper_names   │  │  medical_terms   │  │  prompt_versions     │     │
│  │  (per-case)     │  │  (per-case+glob) │  │  (audit trail)       │     │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
                      ▲
                      │
                      │ AFTER reporter approval, accepted corrections apply
                      │ into the working transcript, and the deterministic
                      │ renderer produces DOCX/PDF.
                      │
                      ▼
              formatter_core (DOCX/PDF export)
```

### 3.2 Data flow (single transcript, happy path)

1. Deepgram completes recognition. `raw_transcript.json` is stored and passes `canonicalIntegrity.ts` (W23B). This is the immutable baseline.
2. The user opens the transcript in the Stage 3 workspace. The workspace calls the TIS `/analyze` endpoint with the transcript ID.
3. **Context Assembler** loads `JobConfig`, case registries, global glossaries, and current prompt versions from Postgres.
4. **Deterministic Preprocessor** runs the existing `corrections.py` rules (still preserved) plus any expanded deterministic rules (see §4.4). Output is a "prepared canonical" — annotated with corrections that are deterministic and not model-derived.
5. **Editor Dispatch** runs each specialty prompt in parallel, passing prepared canonical + relevant context slice. Each specialty returns a list of `CorrectionObject` for its domain.
6. **Provider Adapter** executes each call against the configured provider. On failure, it retries per the adapter contract and reports partial results.
7. **Correction Aggregator** merges results, deduplicates, validates against the schema, assigns IDs, and persists to `corrections`.
8. The TIS returns the correction set to the frontend.
9. The workspace renders each correction as an inline diff with an accept/reject/edit toolbar.
10. Reporter decisions are POSTed back to the TIS as `correction_decisions`, which:
    - Apply accepted corrections to the working transcript,
    - Log the decision (including any edit the reporter made to the suggestion),
    - Feed accepted proper-name corrections into the case registry.
11. When the reporter clicks "Generate DOCX", the deterministic renderer walks the working transcript and produces the artifact.

### 3.3 Core design principles

1. **Immutable baseline.** The canonical `raw_transcript` never changes. Everything else is a layer on top with its own provenance.
2. **Provenance-first.** Every character in the working transcript can be traced to Deepgram, a deterministic rule, an accepted AI correction, or a reporter edit.
3. **AI proposes, humans dispose.** No AI change enters the certified transcript without an explicit reporter decision.
4. **Deterministic where possible.** If a rule can be encoded, it goes in code. The AI is reserved for judgment.
5. **Providers are pluggable.** The TIS depends on an interface, never on a vendor SDK.
6. **Prompts are data.** Prompts live in a versioned registry, not in code strings.
7. **Corrections are records.** Every proposal is a persisted object with schema, ID, provenance, confidence, and lifecycle state.
8. **Feedback improves the system.** Every accept/reject/edit is captured and used to improve prompts, registries, and glossaries.
9. **Certification is a boundary.** Once certified, transcripts are read-only. The TIS refuses to modify them.
10. **Every stage is testable.** Deterministic rules have unit tests. Prompts have golden fixtures. The full pipeline has integration tests. Nothing is a black box.

### 3.4 Module boundaries and ownership

| Module | Owner | May depend on | May NOT depend on |
|---|---|---|---|
| `raw_transcript` storage | Recognition layer | Deepgram | Anything downstream |
| `canonicalIntegrity` | Ingest gate | `raw_transcript` schema | AI, corrections, workspace |
| Context Assembler | TIS | `JobConfig`, registries, glossaries, prompt registry | Provider SDKs |
| Deterministic Preprocessor | TIS | Canonical text, rule modules | Any AI, any provider |
| Editor Dispatch | TIS | Prepared canonical, context slices, prompt registry, Provider Adapter | Provider SDKs directly |
| Specialty Prompts | Prompt library | Nothing at runtime (they're data) | — |
| Provider Adapter | TIS | Provider SDKs | Business logic, correction schema |
| Correction Aggregator | TIS | Correction schema, Postgres | Provider SDKs |
| Correction storage | Supabase schema | — | AI processing |
| Correction Review UI | Frontend | Correction schema, workspace state | Provider SDKs, prompt registry |
| Working transcript projection | TIS | Canonical, accepted corrections | Provider SDKs |
| Renderer | `formatter_core` | Working transcript | AI, corrections (only sees applied text) |

Each row is enforceable. If a dependency arrow goes the wrong way, a lint rule or import check fails.

---

## 4. The Twelve Audits

Each audit answers one focused question about the AI Transcript Intelligence system. Audits are ordered from "what does AI do" (capability) through decomposition, knowledge separation, and finally implementation concerns (providers, performance, migration).

Every audit uses the same structure:

- **Question**: the single question this audit answers
- **Current state**: what exists in Depo-Pro today (grounded in the file inventory)
- **Target state**: what should exist after implementation
- **Gap**: what has to change
- **Deliverables**: concrete artifacts this audit produces
- **Acceptance criteria**: how we know it's done

---

### 4.1 AI Capability Audit

**Question:** What, exactly, does the Claude Project reference implementation actually do that produces high-quality transcripts?

#### Current state

`transcript_formatter/ai_tools.py` runs three distinct AI operations:

1. **UFM extraction** — parses notices/intake docs for case metadata (see `_UFM_EXTRACTION_PROMPT`).
2. **Correction** — chunk-based rewriting of the transcript body.
3. **Review** — a secondary pass over corrected chunks.

Each operation is a monolithic prompt embedded in Python. The "correction" pass alone handles: proper names, medical terms, legal terms, punctuation, capitalization, Q/A structure, colloquy, objections, and formatting rules — all in a single call.

The Claude Project used as the reference implementation makes similar decisions but succeeds because it has months of accumulated context — glossaries built up over prior transcripts, custom instructions that codify Texas CSR conventions, and a human (James) constantly refining prompts based on what worked and what didn't. That accumulated context is intellectual property that currently lives inside Anthropic's product, not Depo-Pro.

#### Target state

The Claude Project's behavior is decomposed into **an explicit inventory of capabilities**, each of which becomes a candidate for either:

- **Deterministic code** (encoded as rules — see §4.4)
- **A specialty AI prompt** (isolated, versioned — see §4.6)
- **A knowledge asset** (registries, glossaries — see §4.3)
- **A workspace behavior** (reporter judgment surfaced in UI — see §4.9)

#### The capability inventory

Every capability the reference implementation demonstrates, classified by target home:

| # | Capability | Current home | Target home |
|---|---|---|---|
| C1 | Detect merged Q/A in a single speaker block | Monolithic prompt | Specialty prompt: `qa_split` |
| C2 | Attribute an unlabeled objection to the correct attorney | Monolithic prompt | Specialty prompt: `objection_attribution` |
| C3 | Reassign speech when Deepgram diarization drops mid-conversation | Monolithic prompt | Specialty prompt: `speaker_reassignment` |
| C4 | Correct a phonetic name against the case registry | Prompt + `JobConfig.confirmed_spellings` | Deterministic (registry lookup) + specialty prompt (`proper_name_novel`) for unseen names |
| C5 | Recognize `polyhydraminose` as `polyhydramnios` | Monolithic prompt | Deterministic (medical glossary) |
| C6 | Recognize `microsomia` as `macrosomia` (context-dependent) | Monolithic prompt | Specialty prompt: `medical_context` (context-dependent lookup) |
| C7 | Normalize `sevenseventeentwenty 22` to `07/17/2022` | Monolithic prompt | Deterministic (date normalizer) |
| C8 | Normalize `$12.50 hourly` to `$1,250 hourly` (context artifact) | Monolithic prompt | Specialty prompt: `contextual_number` (flags ambiguous, doesn't auto-correct) |
| C9 | Convert stutter repeats to em-dash form | Monolithic prompt | Deterministic (already in `corrections.py`) |
| C10 | Preserve "uh"/"um" in verbatim mode | Monolithic prompt | Deterministic (already enforced by tests) |
| C11 | Insert two spaces after sentence-ending punctuation | Renderer + prompt | Deterministic (renderer only) |
| C12 | Detect examination section transitions ("pass the witness") | Monolithic prompt | Specialty prompt: `examination_section` |
| C13 | Emit correct BY line after colloquy break | Renderer + prompt | Deterministic (renderer, from examination state) |
| C14 | Recognize "Doctor" as title vs. as "Dr." abbreviation | Monolithic prompt | Deterministic (title normalizer) |
| C15 | Handle exhibit references inline in Q text | Monolithic prompt | Deterministic (no AI needed) |
| C16 | Flag inconsistencies (DOB spelled two ways, name spelled two ways) | Monolithic prompt | Specialty prompt: `inconsistency_flag` |
| C17 | Distinguish off-record chat from on-record colloquy | Monolithic prompt | Specialty prompt: `off_record_boundary` |
| C18 | Format cause number per court convention | Monolithic prompt | Deterministic (per-court format table) |
| C19 | Recognize `Bexar` vs. `Baer` vs. `Bayer` (name vs. institution) | Monolithic prompt | Specialty prompt: `phonetic_disambiguation` + registry |
| C20 | Emit read-and-sign vs. waive decision at close | Monolithic prompt | Deterministic (parses the closing colloquy) |
| C21 | Attach reviewer flags for ambiguous decisions | Monolithic prompt | Specialty prompt output (part of every specialty) |

The remainder of this audit's deliverable is the full inventory expressed as a spreadsheet (see §5).

#### Gap

- No inventory exists today; capabilities are entangled inside `_UFM_EXTRACTION_PROMPT`, the chunk correction prompt, and the review prompt.
- The reference implementation's behavior has never been characterized against a fixed test suite.

#### Deliverables

- **D1.1** — A capability inventory spreadsheet (`docs/atia/capability_inventory.csv`) enumerating every observable behavior in the reference implementation, its category (from §4.2), its confidence level, and its target home.
- **D1.2** — A "reference behavior corpus" — a set of at least 20 raw Deepgram fragments paired with the reference implementation's output. These become regression fixtures.
- **D1.3** — A behavior classification document (`docs/atia/behavior_classification.md`) that groups the inventory into deterministic vs. AI-required categories with rationale for each.

#### Acceptance criteria

- Every row in the inventory has an assigned target home (deterministic, specialty prompt, knowledge, workspace).
- Every deterministic candidate has a testable rule specified (or an explicit note that it can be encoded).
- Every AI-required capability is scoped to a single specialty prompt in §4.6.

---

### 4.2 Prompt Decomposition Audit

**Question:** How does one 2,000-line monolithic prompt become a small library of focused, versioned prompts?

#### Current state

The current AI approach uses long, all-purpose prompts. The v1 system prompt drafted in the last iteration of this project is nearly 600 lines of markdown covering formatting rules, JSON schemas, correction guidance, examples, and error handling. It is documentation and code and configuration mixed together.

#### Target state

Each concern that appears in the current monolithic prompt becomes one of the following:

1. **A rule** — encoded in code, tested, invariant.
2. **A prompt component** — a small (typically 50–300 line) prompt focused on one specialty.
3. **A knowledge artifact** — a glossary, registry, or reference table loaded at runtime.
4. **A schema** — an output contract enforced by the validator, not by the prompt.

The prompt library structure looks like:

```
prompts/
├── shared/
│   ├── system_role.md              (30 lines — who the model is)
│   ├── correction_object_schema.md (60 lines — output contract, embedded once)
│   ├── refusal_rules.md            (40 lines — what NOT to do)
│   └── context_envelope.md         (40 lines — how context is presented)
├── specialty/
│   ├── proper_name_novel.md        (proposes corrections for names not in registry)
│   ├── medical_context.md          (medical terminology, context-dependent)
│   ├── qa_split.md                 (splits merged Q/A blocks)
│   ├── speaker_reassignment.md     (fixes dropped diarization)
│   ├── objection_attribution.md    (attributes objections to attorneys)
│   ├── examination_section.md      (detects section transitions)
│   ├── off_record_boundary.md      (finds off-record boundaries)
│   ├── inconsistency_flag.md       (surfaces internal inconsistencies)
│   ├── contextual_number.md        (flags number artifacts like $12.50 → $1,250)
│   └── phonetic_disambiguation.md  (chooses between similar names)
├── policy/
│   ├── verbatim_policy.md          (never remove uh/um; preserve stutters)
│   ├── morson_270_policy.md        (ellipsis integrity)
│   └── certification_policy.md     (never modify certified transcripts)
└── versions/
    └── active.json                 (which version of each prompt is in production)
```

Each `.md` file is a runtime resource. Prompts have their own version scheme (`proper_name_novel@v3`), their own tests (golden fixtures), and their own change log (`CHANGELOG.md` next to the prompt file).

#### Assembly at runtime

The TIS builds a full prompt for a specific specialty call by composing:

```
[shared/system_role]
[shared/correction_object_schema]
[policy/verbatim_policy]
[policy/certification_policy]
[specialty/<the_one_this_call_needs>]
[shared/refusal_rules]
[shared/context_envelope]
[user message: canonical text slice + context data]
```

The composition is fully deterministic and testable. Given a fixed set of prompt versions, the assembled prompt bytes are identical across calls.

#### Gap

- No `prompts/` directory exists.
- Existing prompts live inside Python strings in `ai_tools.py` and are not versioned.
- No composition logic exists; every prompt today is a single string.

#### Deliverables

- **D2.1** — The `prompts/` directory structure created with placeholder files.
- **D2.2** — A `PromptRegistry` class that loads prompts, caches them, and assembles a full prompt for a specialty call by composition rules.
- **D2.3** — A `versions/active.json` file that maps specialty names to prompt versions currently in production.
- **D2.4** — A `CHANGELOG.md` template placed next to each prompt.
- **D2.5** — Migration of the existing UFM extraction prompt into `specialty/ufm_extraction.md` as the first proof point.

#### Acceptance criteria

- The `PromptRegistry` can produce the full prompt bytes for any specialty in under 5 ms.
- Prompt versions are immutable once persisted (Postgres-backed for audit, filesystem for edit).
- A change to any prompt bumps its version and requires a golden-fixture test to pass before it can be marked `active`.
- No AI-facing code in the TIS contains prompt text inline — all prompts come through the registry.

---

### 4.3 Knowledge Audit

**Question:** What knowledge does the transcript intelligence system need, where does it live, and what is its lifecycle?

#### Current state

Knowledge is scattered:

- `JobConfig.confirmed_spellings` — case-specific confirmed name spellings, per-transcript.
- Hardcoded lookups in `corrections.py` — universal proper noun corrections (`Doctor.` → `Dr.`), subpoena variants.
- Embedded lists in `ai_tools.py` prompts — medical term corrections.
- Keyterm-related documents (`KEYTERM_PIPELINE_FINDINGS.md`, `TRANSCRIPT_KEYTERM_AUDIT.md`, `KEYTERM_EXPANSION_NOTES.md`) — the ancestor of proper name registries.

There is no notion of knowledge that improves over time or is scoped to a case as opposed to a transcript.

#### Target state — four knowledge tiers

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: STATIC KNOWLEDGE                                               │
│   Owned by:  Global glossary maintainers (developer + reporter team)   │
│   Lifecycle: Rarely changes; changes are reviewed like code            │
│   Contents:                                                            │
│     - Texas CSR formatting conventions                                 │
│     - Common medical terminology corrections                           │
│     - Common legal objection forms                                     │
│     - Standard court/county naming conventions                         │
│     - Universal abbreviation table (Mr., Dr., M.D., etc.)              │
│     - Deepgram artifact patterns known to be wrong                     │
│   Storage:   Files in repo (`knowledge/global/*.json`)                 │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: DYNAMIC KNOWLEDGE                                              │
│   Owned by:  System, learned from feedback                             │
│   Lifecycle: Continuously updated as reporters accept/reject           │
│   Contents:                                                            │
│     - Recognition patterns (Deepgram artifact frequencies)             │
│     - Correction acceptance rates by category                          │
│     - Prompt performance metrics                                       │
│   Storage:   Postgres `dynamic_knowledge` schema                       │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: CASE KNOWLEDGE                                                 │
│   Owned by:  The case                                                  │
│   Lifecycle: Grows over the life of the case; persists across          │
│              transcripts in the same matter                            │
│   Contents:                                                            │
│     - Proper name registry (parties, counsel, witnesses, entities)     │
│     - Case-specific medical terminology                                │
│     - Attorney directory (with firms, cities, aliases)                 │
│     - Preferred formatting quirks per case                             │
│     - Historical corrections accepted in prior transcripts             │
│   Storage:   Postgres `case_knowledge` schema                          │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 4: REPORTER KNOWLEDGE                                             │
│   Owned by:  Individual court reporter                                 │
│   Lifecycle: Grows over the reporter's career                          │
│   Contents:                                                            │
│     - Personal formatting preferences (dash style, spacing)            │
│     - Preferred terminology in ambiguous cases                         │
│     - Historical accept/reject patterns                                │
│   Storage:   Postgres `reporter_knowledge` schema                      │
└────────────────────────────────────────────────────────────────────────┘
```

#### Precedence

When resolving any knowledge lookup, the order is:

1. **Reporter Knowledge** (highest priority — respects the individual)
2. **Case Knowledge** (case-scoped truth)
3. **Dynamic Knowledge** (learned patterns)
4. **Static Knowledge** (defaults)

The Context Assembler in the TIS applies this order and passes a merged view to specialty prompts.

#### Case Knowledge lifecycle (proper name example)

1. Transcript T1 in case C1 is processed. The AI proposes `Bayer Imaging → Baer Imaging`. Reporter accepts. The correction persists in `corrections` with `outcome: accepted`.
2. A background job promotes accepted proper-name corrections into the case's registry (`case_knowledge.proper_names`) with `source: reporter_accepted, transcript: T1`.
3. Transcript T2 in case C1 is processed. The Context Assembler loads C1's registry, which now contains `Baer Imaging`. The Deterministic Preprocessor applies the registry as a rule — `Bayer Imaging` becomes `Baer Imaging` before the AI even sees it. No specialty prompt is called for that term.
4. Transcript T3 in case C1 involves a new entity `Zachary Rubio, M.D.`. The AI proposes it. Reporter accepts. Registry grows.
5. Transcript T4 begins to reference `Rubio` alone. Registry provides context; no AI call needed.

The registry gets stronger every transcript. The AI does progressively less work per transcript within a case.

#### Gap

- No four-tier separation exists.
- Case-scoped knowledge is per-transcript only (via `JobConfig`).
- No learning loop — accepted corrections do not feed back into knowledge.

#### Deliverables

- **D3.1** — Postgres schema for `case_knowledge`, `reporter_knowledge`, and `dynamic_knowledge` tables.
- **D3.2** — A `KnowledgeService` module with methods: `get_case_knowledge(case_id)`, `get_reporter_knowledge(reporter_id)`, `get_merged_view(case_id, reporter_id)`, `promote_correction_to_knowledge(correction_id)`.
- **D3.3** — Migration path for existing `JobConfig.confirmed_spellings` into case knowledge.
- **D3.4** — A `knowledge/global/` directory in the repo for static knowledge, seeded from existing prompt embeddings.
- **D3.5** — A background job specification that promotes accepted proper-name and medical-term corrections into case knowledge after each transcript closes.

#### Acceptance criteria

- Loading merged knowledge for a case + reporter completes in under 100 ms for cases with under 1,000 registry entries.
- Every registry entry has provenance: `{source, transcript_id, correction_id, added_at}`.
- Reporter can view, edit, and delete registry entries via a workspace UI.
- Registry entries are RLS-scoped so a reporter never sees another firm's case registries.

---

### 4.4 Deterministic Rule Audit

**Question:** What behaviors currently attributed to AI are actually rules that code can execute reliably? Everything on this list is removed from the AI's job.

#### Current state

Some deterministic rules are already in place (`corrections.py`). Others live inside AI prompts (spacing, number normalization, abbreviation handling). This means:

- The AI is sometimes asked to do work that a regex would do more reliably.
- The rules that ARE in code are enforced by tests; the ones inside prompts are not.
- A prompt change can silently break a "rule" that was never a rule to begin with.

#### Target state

The following behaviors move to deterministic code. Each one becomes a testable rule with a golden fixture.

**Text-mechanical rules** (moved out of AI entirely):

| Rule | Description | Owner module |
|---|---|---|
| R-DTM-01 | Two-space after sentence-ending punctuation (protecting known abbreviations) | `rules/spacing.py` |
| R-DTM-02 | Em-dash for stutter repeats (identical adjacent words) | `rules/em_dash.py` |
| R-DTM-03 | Standard time format normalization (`04:01PM` → `4:01 p.m.`) | `rules/time_normalize.py` |
| R-DTM-04 | Standard date format normalization (numeric to `MM/DD/YYYY`) | `rules/date_normalize.py` |
| R-DTM-05 | Dollar amount formatting with thousands separators | `rules/currency_normalize.py` |
| R-DTM-06 | Abbreviation protection (single-space after Mr., Dr., M.D., etc.) | `rules/abbreviations.py` |
| R-DTM-07 | Doubled-word artifact removal (`Texas Texas` → `Texas`) — 4+ char words only | `rules/artifact_removal.py` |
| R-DTM-08 | Sentence-start number spell-out (Morson's Rule: `1` → `One` at block start, 1–10) | Already in `corrections.py` — keep |
| R-DTM-09 | Doctor/Dr. title normalization based on context | `rules/titles.py` |
| R-DTM-10 | Cause number formatting per court convention | `rules/cause_number.py` |
| R-DTM-11 | Exhibit reference formatting (`Exhibit 3` capitalization) | `rules/exhibits.py` |
| R-DTM-12 | Ellipsis integrity — never modify `. . .` (Morson 270) | Already in `corrections.py` — keep |
| R-DTM-13 | Verbatim protection — never remove `uh`/`um` | Already enforced by tests — keep |

**Structural rules** (still deterministic, but require canonical structure):

| Rule | Description | Owner module |
|---|---|---|
| R-STR-01 | Detect examination section transitions from "pass the witness" phrasing | `rules/examination.py` |
| R-STR-02 | Attach BY-line after colloquy break returning to same examination | `rules/byline.py` |
| R-STR-03 | Detect off-the-record / back-on-the-record from videographer patterns | `rules/off_record.py` |
| R-STR-04 | Emit read-and-sign vs. waive from closing colloquy | `rules/read_and_sign.py` |
| R-STR-05 | Parenthetical formatting for recesses | `rules/recesses.py` |

**Rendering rules** (belong to `formatter_core`, not AI):

| Rule | Description | Owner module |
|---|---|---|
| R-RND-01 | Q/A tab placement (`\tQ.\t{text}`) | `formatter_core/qa_render.py` |
| R-RND-02 | Line spacing (double for body, single for caption) | `formatter_core/spacing_render.py` |
| R-RND-03 | Page numbers | `formatter_core/page_numbers.py` |
| R-RND-04 | Caption/appearances layout | `formatter_core/caption_render.py` |
| R-RND-05 | Certificate page generation | `formatter_core/certificate.py` |
| R-RND-06 | Word index generation | `formatter_core/word_index.py` |

#### The deterministic-first principle

For every proposed AI capability, the question is asked: **Can a rule do this reliably?** If yes, it's a rule. Rules are cheaper, more testable, and never regress silently.

The AI is reserved for cases where the answer to that question is "no" — cases requiring judgment about context, disambiguation between similar options, or handling truly novel input.

#### Gap

- Many of the rules above exist only inside prompts today. Making them explicit code requires porting.
- Some rules exist in `corrections.py` but aren't in modules — they'd benefit from separation for testability.
- The `rules/` directory doesn't exist as a first-class module.

#### Deliverables

- **D4.1** — A `rules/` top-level directory with one file per rule listed above.
- **D4.2** — A `RuleRegistry` that runs rules in a defined order and produces `CorrectionRecord` entries with `source: deterministic` for each transformation.
- **D4.3** — Unit tests for every rule (parametrized fixtures).
- **D4.4** — A migration guide moving relevant logic from `corrections.py` into `rules/` while preserving the priority order (documented in `corrections.py`).
- **D4.5** — Removal of every rule-covered concern from the AI-facing prompts.

#### Acceptance criteria

- Every rule module has ≥ 5 test cases including at least one negative case (rule does NOT fire).
- The `RuleRegistry` produces byte-identical output when run twice on the same input.
- Removing any rule from the registry causes a known regression fixture to fail.
- No specialty prompt contains a rule that duplicates one in the registry.

---

### 4.5 AI Responsibility Audit

**Question:** After deterministic rules are subtracted, what does the AI genuinely need to do?

#### Current state

The AI is currently asked to do everything, including many concerns that §4.4 removes from its job.

#### Target state

The AI's job shrinks to a small, well-defined list of judgment-intensive tasks. Each one is scoped to a specialty prompt (§4.6). Each one operates against the prepared canonical produced by the deterministic layer, so it never sees the raw noise that rules can already fix.

**The AI's core responsibilities:**

1. **Phonetic and homophone disambiguation.** Given `Bayer` in the transcript and a reason to believe the correct spelling might be `Baer` or `Bair`, decide based on context and registry hints.
2. **Novel proper-name proposal.** When a name appears that is NOT in the registry, propose a spelling based on phonetic likelihood, with confidence.
3. **Context-dependent medical terminology.** When a medical term could be one of several based on speech recognition, choose the one that fits the specialty/procedure/patient context in the transcript.
4. **Merged Q/A boundary detection.** When Deepgram produces a single speaker block containing both a question and an answer, identify the boundary.
5. **Speaker reassignment.** When diarization drops mid-conversation, reassign speech based on style, length, and content clues.
6. **Objection attribution.** When an objection appears but the speaker label is missing or ambiguous, attribute it to the correct attorney based on context (which side is questioning, prior objections in this session).
7. **Inconsistency flagging.** When the transcript contains internally inconsistent references (DOB spelled two ways, name spelled two ways), surface the inconsistency for reporter review.
8. **Ambiguous number surface.** When a number is likely a Deepgram artifact but the correct value is unclear (`$12.50` for an hourly rate that's almost certainly `$1,250`), flag the location and propose a candidate with low confidence.
9. **Section transition disambiguation.** When "pass the witness" is unclear or "further redirect" ambiguity exists, decide the section header.
10. **Off-record boundary detection.** When videographer language is nonstandard, identify start/end of off-record segments.

Every one of these produces `CorrectionObject` entries. The AI does not produce transcript text.

#### The "what the AI never does" list

To keep the paradigm clean:

- **Never render.** No DOCX, no formatting, no spacing.
- **Never remove fillers.** Verbatim is deterministic.
- **Never modify text outside the correction's stated range.** A correction has explicit before/after and word IDs.
- **Never propose changes without a reason.** Empty `reason` fields are rejected.
- **Never propose changes above a confidence threshold without evidence.** High-confidence claims must cite a knowledge source (registry match, prior transcript, glossary entry) or a contextual pattern (adjacent recognizable pattern).
- **Never run on locked transcripts.** The TIS refuses to invoke the AI if the transcript is certified or export-locked.

#### Gap

- The AI today is asked to do all of the above plus everything §4.4 pulls out.
- There is no scoping of "this call is for objection attribution only, not for phonetic names."

#### Deliverables

- **D5.1** — A "AI Responsibility Catalog" (`docs/atia/ai_responsibilities.md`) listing every specialty and its scope, inputs, outputs.
- **D5.2** — For each specialty, a "what this specialty does NOT do" section (negative scope).
- **D5.3** — A hand-off diagram showing what upstream deterministic rules must run before each specialty is dispatched.

#### Acceptance criteria

- Every capability from §4.1 either has an assigned specialty or is confirmed deterministic in §4.4.
- No two specialties overlap in scope.
- Every specialty's negative-scope list is enforced by the validator: outputs that step outside scope are rejected.

---

### 4.6 Prompt Architecture Audit

**Question:** How is each specialty prompt structured internally, and how do they compose?

#### Current state

Prompts are single Python strings with no internal structure beyond markdown headings.

#### Target state — the specialty prompt template

Every specialty prompt has the same seven-section structure:

```markdown
# Specialty: <name>
Version: v<n>
Last updated: <date>
Owner: <human>

## Role
One paragraph. "You are the <specialty> specialist for the Depo-Pro Transcript
Intelligence Engine. Your only job is to <verb>."

## Input
Exact description of the input structure this specialty receives. Includes:
- Prepared canonical text (with word IDs)
- Context slice relevant to this specialty
- Any prior corrections from earlier specialties in the pipeline

## Output
Exact description of the output structure. Always: a list of CorrectionObject
entries. Contract enforced by validator.

## Scope
Positive scope: what this specialty MAY correct.
Negative scope: what this specialty MUST NOT touch.

## Method
Step-by-step reasoning process the specialty should follow. Written as instructions
to the model.

## Examples
Golden examples showing input → output. Between 5 and 15 examples covering
common cases, edge cases, and the "no corrections needed" case.

## Refusal cases
Situations where the specialty produces zero corrections rather than guess. Every
specialty MUST have a "when in doubt, output nothing" fallback.
```

The `PromptRegistry` composes a runtime prompt by adding `shared/` prefixes and appending the specialty prompt. The specialty is the only file that changes when you're tuning behavior for that concern.

#### Example: `specialty/objection_attribution.md` outline

```markdown
# Specialty: objection_attribution
Version: v1
Last updated: 2026-10-01
Owner: james@depopro.com

## Role
You attribute objections to the correct attorney when the Deepgram speaker
label is missing, ambiguous, or clearly wrong.

## Input
- Prepared canonical: paragraphs with word IDs. Each paragraph has speaker_id
  from Deepgram and speaker_role from Depo-Pro's speaker map.
- Context slice:
  - The full attorney directory for this case (name, side, firm)
  - The examination section in effect at the objection location
  - Prior objections in this session with their attributed attorney

## Output
Zero or more CorrectionObject entries of type `objection_attribution`. Each
correction points at the objection paragraph's word range and proposes:
- speaker_role: "DEFENSE_COUNSEL" | "PLAINTIFF_COUNSEL" | "COURT"
- attorney_name: string
- reason: string (why THIS attorney)
- confidence: 0.0–1.0

## Scope
MAY: Reattribute an objection paragraph to a different attorney than
Deepgram's diarization suggested.

MUST NOT: Modify the objection text. Add or remove objections. Handle
non-objection paragraphs.

## Method
1. For each paragraph that contains "objection" or "object to" or
   "instruct the witness not to answer":
2. Identify the current attorney label (if any) from Deepgram.
3. Determine which side is questioning at this point.
4. Objections almost always come from the opposing side.
5. Match against the case's attorney directory.
6. If confidence > 0.75, emit a correction if the attribution differs from
   current. Otherwise, emit a low-confidence correction with reason
   "attribution uncertain".

## Examples
[10 worked examples with realistic paragraphs and expected outputs]

## Refusal cases
- If the paragraph is not clearly an objection, emit no correction.
- If both attorneys are on the same side (co-counsel), emit low-confidence
  and let the reporter decide.
- If the attorney directory has no candidate matching the diarization
  spectrum, emit low-confidence rather than guess.
```

#### Composition rules

The full prompt sent to the provider for one specialty call is:

```
[shared/system_role.md]
[shared/correction_object_schema.md]
[policy/verbatim_policy.md]
[policy/certification_policy.md]
[policy/morson_270_policy.md]
[specialty/<name>.md]
[shared/refusal_rules.md]
[shared/context_envelope.md]
```

followed by the user message (canonical + context slice).

Composition order is fixed. It's testable. The bytes are reproducible.

#### Gap

- No specialty prompts exist.
- No composition logic exists.
- Existing prompts don't follow this template.

#### Deliverables

- **D6.1** — A `templates/specialty_prompt_template.md` file that new specialty prompts start from.
- **D6.2** — Fully written v1 of every specialty listed in §4.5.
- **D6.3** — A `PromptComposer` module implementing the composition rules above.
- **D6.4** — Golden fixture tests for every specialty: given (canonical, context), the output correction set must match expectation.

#### Acceptance criteria

- Every specialty prompt passes its golden fixture set with 100% match.
- The composed prompt for any specialty is under 8,000 tokens (leaves headroom for context).
- Adding a new specialty requires no changes to the composer, only a new file in `specialty/` and a version entry.
- Any specialty can be A/B tested by pointing `versions/active.json` at a new version.

---

### 4.7 Context Audit

**Question:** What context accompanies every specialty call, how is it assembled, and how much of it goes in each call?

#### Current state

Context is passed via `JobConfig` and inline prompt content. There is no notion of "context slicing" — every prompt gets the full config regardless of what it needs.

#### Target state — the context envelope

Every specialty call receives a JSON envelope structured as:

```json
{
  "case": {
    "id": "uuid",
    "cause_number": "2023-CI-06164",
    "parties": [...],
    "court": "438th Judicial District, Bexar County, Texas",
    "case_style": "Francisco Pacheco v. HEB, LP"
  },
  "transcript": {
    "id": "uuid",
    "deposition_of": "Zachary Garza, M.D.",
    "deposition_date": "2026-07-28",
    "current_examination_section": "CROSS-EXAMINATION"
  },
  "prepared_canonical": {
    "paragraphs": [
      {
        "id": "p_00042",
        "words": [
          {"id": "w_9821", "text": "Bayer", "start_ms": 4823100, "confidence": 0.62},
          ...
        ],
        "speaker_id": 2,
        "speaker_role": "WITNESS"
      }
    ]
  },
  "context_slice": {
    "<varies by specialty>"
  },
  "prior_corrections": [
    {"specialty": "proper_name_novel", "count": 3, "summary": "..."}
  ]
}
```

The `context_slice` varies per specialty:

| Specialty | Context slice contents |
|---|---|
| `proper_name_novel` | Full case proper-name registry; global name glossary; phonetic index |
| `medical_context` | Case medical glossary; global medical glossary; witness specialty (if known) |
| `qa_split` | Current examination section; questioner speaker_id; witness speaker_id |
| `speaker_reassignment` | Speaker map; recent speech patterns per speaker; examination section |
| `objection_attribution` | Attorney directory; prior objection attributions in this session |
| `examination_section` | Current section; list of attorneys and their sides |
| `off_record_boundary` | Videographer speaker_id; standard videographer language patterns |
| `inconsistency_flag` | All prior known values for names/dates/addresses in this transcript |
| `contextual_number` | Nearby number references; known unit contexts (hourly rate, weight, etc.) |
| `phonetic_disambiguation` | Registry candidates for the ambiguous term |

#### Context slicing

Not every specialty sees the full canonical. For long transcripts, the TIS windows the input:

- Each specialty receives paragraphs relevant to its scope.
- `proper_name_novel` receives the full transcript (proper names appear everywhere).
- `objection_attribution` receives only paragraphs containing objections plus 3 paragraphs of surrounding context per objection.
- `qa_split` receives only paragraphs where Deepgram's speaker block contains sentence-ending punctuation followed by an in-quote question (heuristic candidates for merged Q/A).
- `off_record_boundary` receives only videographer paragraphs.

Slicing is done by the Context Assembler using specialty-specific heuristics, all deterministic.

#### Assembly ordering

For a single transcript, specialties run in this order:

1. `speaker_reassignment` (fixes upstream state before anyone else looks)
2. `examination_section` (establishes section context for downstream)
3. `off_record_boundary` (removes off-record text from downstream consideration)
4. `qa_split` (structural repair before content correction)
5. `objection_attribution` (structural — needs QA structure to be right)
6. `proper_name_novel` (content — needs correct speakers)
7. `medical_context` (content — often depends on witness specialty inferred from proper names)
8. `phonetic_disambiguation` (may consume proper_name_novel outputs)
9. `contextual_number` (last content pass; may depend on other corrections)
10. `inconsistency_flag` (last — sees all prior corrections)

Each subsequent specialty sees prior corrections in its context envelope, so it can reason about "the earlier prompts already proposed X for this word."

#### Gap

- No specialty-scoped context slicing exists.
- All context lives in `JobConfig` — the full config is passed to every prompt today.
- No ordering exists among specialty calls.

#### Deliverables

- **D7.1** — A `ContextAssembler` module that produces the full envelope for any transcript.
- **D7.2** — Per-specialty slicing rules encoded as `context_slicers/<specialty>.py` modules.
- **D7.3** — A pipeline configuration (`prompts/versions/pipeline.json`) declaring the specialty run order and their dependencies.
- **D7.4** — A "context envelope" JSON Schema (`schema/context_envelope.schema.json`).

#### Acceptance criteria

- Context envelope size for any specialty is under 100 KB (leaves headroom for the model's context window).
- Every specialty call is reproducible — given a fixed context envelope, the call is byte-identical.
- The pipeline configuration is a data file, not code — changing order does not require a code change.

---

### 4.8 Correction Object Audit

**Question:** What is a correction, precisely? What fields does it require, what states can it be in, and how is it persisted?

#### Current state

Corrections exist as `CorrectionRecord` dataclasses in `spec_engine/models.py`:

```python
@dataclass
class CorrectionRecord:
    original: str
    corrected: str
    pattern: str
    block_index: int
```

This is not enough. It has no ID, no provenance beyond `pattern`, no confidence, no lifecycle, no reason.

#### Target state — the CorrectionObject schema

```json
{
  "id": "corr_01H8XA92NVXZ...",
  "transcript_id": "trans_uuid",
  "case_id": "case_uuid",
  "specialty": "proper_name_novel",
  "prompt_version": "v3",

  "location": {
    "paragraph_id": "p_00042",
    "start_word_id": "w_9821",
    "end_word_id": "w_9822",
    "start_offset_ms": 4823100,
    "end_offset_ms": 4823950
  },

  "change": {
    "before": "Bayer Imaging",
    "after": "Baer Imaging",
    "type": "proper_name_correction"
  },

  "reason": "Case registry entry 'Baer Imaging' matches phonetically; Deepgram confidence on 'Bayer' was 0.62.",
  "reason_kind": "registry_match",

  "confidence": 0.88,
  "confidence_source": "registry+deepgram_low_confidence",

  "provenance": {
    "source": "ai",
    "provider": "anthropic",
    "model": "claude-opus-4-7",
    "prompt_versions": {
      "system_role": "v1",
      "correction_object_schema": "v1",
      "verbatim_policy": "v1",
      "specialty/proper_name_novel": "v3"
    },
    "context_hash": "sha256:...",
    "generated_at": "2026-10-01T14:23:11Z"
  },

  "supporting_evidence": [
    {"kind": "registry_entry", "id": "reg_baer_imaging", "case_id": "case_uuid"},
    {"kind": "deepgram_confidence", "value": 0.62}
  ],

  "review": {
    "state": "pending",
    "decided_by": null,
    "decided_at": null,
    "decision_note": null,
    "final_value": null
  },

  "downstream": {
    "applied_to_working_transcript": false,
    "applied_at": null,
    "reverted_at": null
  }
}
```

#### Correction states

```
     pending ──── accepted ──── applied
        │
        ├──────── rejected
        │
        ├──────── edited (accepted with modification)
        │              │
        │              └──── applied (with reporter's version)
        │
        └──────── superseded (a later correction overwrote this one)
```

Every state transition is logged in `correction_decisions` (append-only).

#### Correction types

The `change.type` field constrains what the correction is allowed to do:

| Type | Allowed change | Notes |
|---|---|---|
| `proper_name_correction` | Substitute one spelling for another | Word range must equal one entity |
| `medical_term_correction` | Substitute a medical term | Preserves surrounding context |
| `speaker_reassignment` | Change paragraph speaker_id and speaker_role | Does not touch text |
| `qa_split` | Split one paragraph into two, one Q one A | Words redistributed by boundary |
| `objection_attribution` | Change objection paragraph's attorney attribution | Does not touch text |
| `examination_section_change` | Emit a section header at a paragraph boundary | Does not touch text |
| `off_record_boundary_mark` | Mark paragraphs as off-record | Does not delete text; renderer respects mark |
| `inconsistency_flag` | Mark a location without proposing a fix | For reporter attention |
| `contextual_number_flag` | Propose an alternate number with low confidence | Reporter decides |

Each type has its own validator. A `speaker_reassignment` correction that includes a `change.before` text field is rejected by the schema.

#### Provenance requirements

Every correction MUST include:

- Which specialty produced it
- Which prompt version was in effect
- Which model produced it
- Hash of the exact context envelope
- Timestamp

This enables replay: given a persisted correction, one can reconstruct the exact call that produced it. Regression is diagnosable.

#### Storage

```sql
-- Simplified schema outline
CREATE TABLE corrections (
  id                    TEXT PRIMARY KEY,
  transcript_id         UUID NOT NULL REFERENCES transcripts(id),
  case_id               UUID NOT NULL REFERENCES cases(id),
  specialty             TEXT NOT NULL,
  prompt_version        TEXT NOT NULL,
  location              JSONB NOT NULL,
  change                JSONB NOT NULL,
  reason                TEXT NOT NULL,
  reason_kind           TEXT NOT NULL,
  confidence            NUMERIC(3,2) NOT NULL,
  provenance            JSONB NOT NULL,
  supporting_evidence   JSONB,
  review                JSONB NOT NULL,     -- state machine, updated in place
  downstream            JSONB NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE correction_decisions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_id         TEXT NOT NULL REFERENCES corrections(id),
  from_state            TEXT NOT NULL,
  to_state              TEXT NOT NULL,
  decided_by            UUID NOT NULL,
  decision_note         TEXT,
  final_value           JSONB,
  decided_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS policies enforce case ownership on both tables.

#### Gap

- Current `CorrectionRecord` is minimal.
- No lifecycle exists.
- No provenance is captured.
- No storage schema exists.

#### Deliverables

- **D8.1** — A `CorrectionObject` Pydantic model (backend) and TypeScript interface (frontend) generated from a single JSON Schema source of truth.
- **D8.2** — Postgres migrations creating `corrections` and `correction_decisions`.
- **D8.3** — RLS policies enforcing case-scoped access.
- **D8.4** — A `CorrectionValidator` that enforces per-type constraints.
- **D8.5** — A `CorrectionRepository` with methods: `create`, `list_by_transcript`, `decide` (state transitions), `apply` (write to working transcript).

#### Acceptance criteria

- Creating an invalid correction (missing fields, out-of-scope change, non-existent word IDs) is rejected at write time.
- The schema is the single source of truth used by both backend and frontend.
- Every state transition is atomic and audited.
- RLS prevents cross-case correction access.

---

### 4.9 Workspace Integration Audit

**Question:** How does the Stage 3 workspace surface corrections to the reporter, and how does the reporter interact with them?

#### Current state

The Stage 3 workspace has TipTap for the transcript editor, WaveSurfer for audio, and speaker resolution UI. There is no first-class corrections panel; AI output is treated as either full-transcript replacement (for finalization) or advisory annotations.

#### Target state — the Corrections Panel

A dedicated panel in the Stage 3 workspace displays every pending correction as a card:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ⚠ Correction #14   Proper Name    Confidence: 88%    p. 12, ~4:23     │
│                                                                        │
│ "Bayer Imaging"   →   "Baer Imaging"                                   │
│                                                                        │
│ Reason: Case registry entry 'Baer Imaging' matches phonetically;       │
│ Deepgram confidence on 'Bayer' was 0.62.                               │
│                                                                        │
│  [Accept]  [Reject]  [Edit]     Add to case registry: ☑                │
│                                                                        │
│  Applied by: proper_name_novel@v3 (claude-opus-4-7)                    │
└────────────────────────────────────────────────────────────────────────┘
```

Behaviors:

- Clicking a correction card scrolls the transcript editor to the location and highlights the word range.
- Clicking a word range in the editor filters the corrections panel to that range.
- Audio playback jumps to the correction's `start_offset_ms`.
- **Accept** applies the change and updates the case registry (if the type calls for it).
- **Reject** logs the decision with an optional note.
- **Edit** opens an inline editor for the reporter to modify the suggestion, then accepts the edited version.

#### Correction density controls

For a long transcript with many corrections, the reporter needs filters:

- By specialty (only show proper names, only show medical, etc.)
- By confidence band (low / medium / high)
- By page or timestamp range
- By review state (pending / accepted / rejected)

The panel supports batch actions:

- Accept all high-confidence proper-name corrections at once
- Reject all corrections in a range
- Export accepted corrections as a case registry update

#### Presentation rules

- **Inline highlights** in the transcript editor visually mark corrections. A gold underline for high-confidence, a red underline for low-confidence, a blue underline for inconsistency flags.
- **Hover tooltip** shows the correction summary.
- **Right-click on a word** offers "See corrections here" as a menu item.
- **Certified transcripts** never show corrections (hard gate — the TIS refuses to generate them).

#### Feedback capture

Every accept/reject/edit decision creates a `correction_decision` record. Additional metadata captured:

- Time to decide (how long the correction card was visible before decision)
- Whether audio was played during review
- Whether the reporter navigated to the transcript location before deciding
- Free-text note

These are aggregated into dynamic knowledge (§4.3).

#### Gap

- No Corrections Panel exists.
- No inline correction highlighting.
- No batch actions.
- No feedback capture.

#### Deliverables

- **D9.1** — A `<CorrectionsPanel />` React component in the Stage 3 workspace.
- **D9.2** — Inline TipTap decorations for correction ranges.
- **D9.3** — Filter and batch action UI.
- **D9.4** — Frontend correction state management (query + mutation layer, using existing patterns).
- **D9.5** — UX writing for correction card content (reason lines must be human-readable — verify with a reporter).
- **D9.6** — Accessibility spec (keyboard navigation, screen-reader labels).

#### Acceptance criteria

- Reporter can review, decide, and edit 100 corrections in under 15 minutes for a 60-minute transcript.
- Decisions persist and survive page refresh.
- Applied changes appear in the transcript editor immediately.
- Screen readers announce corrections as they receive focus.
- Every decision creates exactly one `correction_decision` record.

---

### 4.10 Provider Abstraction Audit

**Question:** How does Depo-Pro remain independent of any specific AI provider?

#### Current state

`transcript_formatter/ai_tools.py` imports `anthropic` and creates `anthropic.Anthropic()` clients directly. The `MODEL_CANDIDATES` list contains Anthropic model IDs. Chunking, retry, and timeout logic assume the Anthropic SDK's semantics.

#### Target state — the ProviderAdapter interface

A single interface that every provider implements:

```python
from typing import Protocol, TypedDict

class CallRequest(TypedDict):
    prompt: str                # Fully composed prompt (system + user)
    context_envelope: dict     # For logging/replay
    model_hint: str            # "opus" | "sonnet" | "haiku" | vendor-neutral
    max_tokens: int
    temperature: float
    request_id: str            # For idempotency
    timeout_seconds: int

class CallResponse(TypedDict):
    raw_output: str            # The model's raw output
    parsed_output: dict        # Provider-agnostic parsed form
    tokens_used: dict          # {input, output, cached}
    latency_ms: int
    provider: str              # "anthropic" | "openai" | ...
    model: str                 # Actual model used
    finish_reason: str

class ProviderAdapter(Protocol):
    """Every AI provider must implement this."""

    def call(self, request: CallRequest) -> CallResponse:
        ...

    def supports_model(self, model_hint: str) -> bool:
        ...

    def health_check(self) -> bool:
        ...
```

Concrete implementations:

- `AnthropicAdapter` — wraps the Anthropic SDK
- `OpenAIAdapter` — wraps the OpenAI SDK
- `GeminiAdapter` — wraps the Google GenAI SDK
- `LocalAdapter` — wraps a local model (llama.cpp, Ollama, etc.)
- `MockAdapter` — returns canned responses; used in tests

#### Model hints

Depo-Pro code never asks for `"claude-opus-4-7"` or `"gpt-4"`. It asks for `"opus"` (best quality), `"sonnet"` (balanced), or `"haiku"` (fast). Each adapter maps its own model IDs to hints.

This means: a config change swaps providers. No pipeline code changes.

#### Provider selection

The `ProviderRegistry` selects an adapter based on:

1. Per-case configuration (`case.ai_provider = "anthropic"`)
2. Per-specialty configuration (some specialties may be pinned to a specific provider)
3. Global default
4. Availability (if the selected provider fails health check, fall back to next)

Cost and quality per specialty are tracked; the system can be tuned to route different specialties to different providers.

#### Idempotency and replay

Every call is stamped with a `request_id` derived from a hash of the input. Repeated calls with the same input return the cached response (see §4.11). This makes tests deterministic and enables replay from stored context envelopes.

#### Gap

- No adapter interface exists.
- The Anthropic SDK is imported directly in pipeline code.
- No mock adapter for tests exists.

#### Deliverables

- **D10.1** — The `ProviderAdapter` interface (Python `Protocol`).
- **D10.2** — `AnthropicAdapter` as the first concrete implementation, feature-complete against current `ai_tools.py`.
- **D10.3** — `MockAdapter` returning fixture-based responses.
- **D10.4** — A `ProviderRegistry` with selection and fallback logic.
- **D10.5** — Migration of `ai_tools.py` callers to use the adapter instead of the SDK directly.
- **D10.6** — Documentation on adding a new provider (`docs/atia/adding_a_provider.md`).

#### Acceptance criteria

- No code outside `providers/anthropic_adapter.py` imports the `anthropic` package.
- The full test suite runs against `MockAdapter` without any live API calls.
- Switching from Anthropic to OpenAI (once `OpenAIAdapter` exists) is a config change only.
- Fallback works: killing the primary provider triggers seamless failover.

---

### 4.11 Performance & Caching Audit

**Question:** What should be AI, what should be cached, what should be regenerated, and how do we keep latency and cost under control?

#### Current state

Every transcript pass is a fresh AI call. No caching. Chunking is per-paragraph, but chunks are not cached — a re-run redoes all work.

#### Target state — layered caching

**Layer 1: Context envelope cache.** The input to every specialty call is a context envelope. Its hash is deterministic. If the same envelope is submitted twice (same specialty, same context slice, same prepared canonical), the second call returns the cached correction set without invoking the provider.

**Layer 2: Response cache.** Cached at the provider adapter level. Any (`prompt_bytes`, `model`, `parameters`) tuple has its response cached. This survives across cases when the inputs happen to match.

**Layer 3: Deterministic rule cache.** Rule outputs are cached by input hash. Since rules are pure functions, this is safe indefinitely. Cache invalidation is version-based: bump a rule version to invalidate.

**Layer 4: Working transcript projection.** The projection of (canonical + accepted corrections) → working transcript is cached. Invalidated by any `correction_decision` write.

#### Cache storage

- Postgres for durable caches (envelope hash → correction set, response hash → raw output).
- In-memory LRU for hot paths (currently-open transcript in the workspace).
- No client-side caching of AI results (client only caches what backend serves).

#### Cost accounting

Every provider call records:

- `tokens_used.input`
- `tokens_used.output`
- `tokens_used.cached` (if the provider supports prompt caching, e.g., Anthropic)
- Estimated cost in cents

Aggregated per-case and per-transcript. Exposed in an admin dashboard so the operator can see cost per transcript.

#### Model routing for cost control

Not every specialty needs the top model:

| Specialty | Recommended model |
|---|---|
| `proper_name_novel` | opus (registry-critical, quality-sensitive) |
| `medical_context` | opus |
| `qa_split` | sonnet |
| `speaker_reassignment` | sonnet |
| `objection_attribution` | sonnet |
| `examination_section` | haiku |
| `off_record_boundary` | haiku |
| `inconsistency_flag` | opus |
| `contextual_number` | sonnet |
| `phonetic_disambiguation` | opus |

Configurable per-deployment. Baseline routing is designed for reporter-quality output at reasonable cost.

#### Parallelism

Specialty calls that don't depend on each other's outputs run in parallel. The pipeline dependency graph (from §4.7) determines what can be parallelized:

- `speaker_reassignment` and `examination_section` and `off_record_boundary` — can run in parallel (all read canonical, don't touch each other's outputs).
- `qa_split` and `objection_attribution` — can run in parallel once structural specialties finish.
- `proper_name_novel` and `medical_context` — can run in parallel once QA structure is fixed.

Target: full pipeline for a 60-minute transcript completes in under 90 seconds with parallelism.

#### Gap

- No caching layer today.
- No cost accounting.
- No parallelism (chunking is sequential).
- No model routing per specialty.

#### Deliverables

- **D11.1** — A `CacheService` module wrapping the four cache layers with a unified API.
- **D11.2** — Postgres schema for durable caches.
- **D11.3** — Cost accounting fields on `corrections` and aggregate views.
- **D11.4** — A `PipelineScheduler` that respects the dependency graph and runs independent specialties in parallel.
- **D11.5** — Per-specialty model configuration (`config/model_routing.json`).
- **D11.6** — Load testing fixtures verifying 90-second target on representative transcripts.

#### Acceptance criteria

- Reprocessing an unchanged transcript hits cache and completes in under 5 seconds.
- Cost per transcript is reported and matches provider billing within 2%.
- Full pipeline completes under 90 seconds for 60-minute reference transcript.
- Reducing a specialty's model tier reduces cost proportionally without breaking golden fixtures.

---

### 4.12 Migration Plan

**Question:** How do we get from today's `ai_tools.py`-plus-monolithic-prompt to the TIE described above, without breaking any currently-working transcript path?

#### Guiding constraints

- **Current transcripts must not regress.** Any transcript currently produced by Depo-Pro must be reproducible after each migration step.
- **Reporter workflow must not be disrupted.** The Stage 3 workspace stays functional throughout migration.
- **Every step is independently deployable.** No "big bang" cutover.
- **Rollback is possible at every step.** Feature flags gate new behavior.

#### Phase 0 — Discovery (2 weeks)

Goals:

- Produce the capability inventory (D1.1).
- Produce the reference behavior corpus (D1.2).
- Produce the deterministic rule inventory (D4.1 minus code — just spec).
- Choose the Postgres schema for `corrections` (D8.2 spec only).

Deliverables from Phase 0:

- `docs/atia/capability_inventory.csv`
- `docs/atia/reference_behavior_corpus/` (raw + expected pairs)
- `docs/atia/rule_inventory.md`
- Draft Postgres migrations

Exit criteria:

- Every existing prompt behavior is characterized.
- The reference behavior corpus becomes the acceptance test for later phases.

#### Phase 1 — Foundation (3 weeks)

Goals:

- Build the CorrectionObject schema and storage (D8.*).
- Build the ProviderAdapter interface and AnthropicAdapter (D10.1, D10.2).
- Build the MockAdapter and load the reference corpus into fixtures (D10.3).
- Build the PromptRegistry with the current monolithic prompt as `specialty/monolithic@v1` (D2.2).
- Build a thin `TranscriptIntelligenceService` that wraps the existing pipeline behind the new interface.

Deliverables:

- Postgres migrations landed.
- `providers/`, `prompts/`, `services/tie/` packages created.
- Adapter tests passing against MockAdapter.
- Reference corpus tests passing.

Exit criteria:

- All existing transcript processing goes through the TIS, but internally still calls the monolithic prompt.
- No user-visible behavior change.
- Cost accounting is live.

#### Phase 2 — Deterministic extraction (4 weeks)

Goals:

- Extract every rule identified in §4.4 into `rules/` modules (D4.1, D4.2, D4.3).
- Remove extracted rules from the monolithic prompt.
- Bump prompt to `specialty/monolithic@v2` (with rules removed).
- Verify reference corpus still passes with new prompt.

Deliverables:

- `rules/` package with unit tests.
- `specialty/monolithic@v2` with reduced scope.

Exit criteria:

- Rule coverage matches §4.4 exactly.
- Reference corpus regression: zero unexpected diffs.

#### Phase 3 — Specialty split (6 weeks)

Goals:

- Split the monolithic prompt into specialty prompts per §4.6.
- Implement one specialty at a time; each ships behind a feature flag.
- Order of implementation (safest first):
  1. `off_record_boundary` — smallest surface area
  2. `examination_section` — deterministic-adjacent
  3. `qa_split` — well-defined
  4. `objection_attribution`
  5. `speaker_reassignment`
  6. `proper_name_novel`
  7. `medical_context`
  8. `phonetic_disambiguation`
  9. `contextual_number`
  10. `inconsistency_flag`
- Each specialty ships when its golden fixtures pass and it does not regress the reference corpus.

Deliverables:

- 10 specialty prompts, each with fixtures.
- Pipeline scheduler with dependency graph.
- Context assembler with per-specialty slicing.

Exit criteria:

- All 10 specialties active.
- The monolithic prompt is retired.

#### Phase 4 — Workspace integration (4 weeks)

Goals:

- Ship the CorrectionsPanel (D9.*).
- Wire TipTap inline decorations for corrections.
- Ship correction decision workflow (accept/reject/edit).
- Ship feedback capture.

Deliverables:

- Full Stage 3 corrections workflow.
- Feedback data flowing into `correction_decisions`.

Exit criteria:

- Reporter can process a transcript entirely through the corrections workflow.
- Feedback aggregation is producing metrics.

#### Phase 5 — Knowledge system (3 weeks)

Goals:

- Ship the four-tier knowledge system (D3.*).
- Migrate `JobConfig.confirmed_spellings` to case knowledge.
- Ship the promotion job (accepted corrections → case knowledge).
- Ship the reporter knowledge editor UI.

Deliverables:

- `case_knowledge`, `reporter_knowledge`, `dynamic_knowledge` schemas.
- KnowledgeService.
- UIs for viewing and editing knowledge.

Exit criteria:

- Every accepted correction updates case knowledge appropriately.
- Second transcript in the same case demonstrably benefits from the first's knowledge.

#### Phase 6 — Provider expansion (2 weeks)

Goals:

- Implement `OpenAIAdapter` (or whichever second provider is prioritized).
- Verify all specialties work against both providers with golden fixtures.
- Ship per-case provider configuration.

Deliverables:

- Second provider adapter.
- A/B testing infrastructure.

Exit criteria:

- Reporter can select provider per case.
- Golden fixtures pass against both providers with acceptable delta.

#### Phase 7 — Performance and caching (3 weeks)

Goals:

- Ship the four-layer cache (D11.*).
- Ship parallel specialty execution.
- Ship per-specialty model routing.
- Achieve the 90-second target.

Deliverables:

- CacheService.
- PipelineScheduler with parallelism.
- Cost dashboard.

Exit criteria:

- Cost per transcript is meeting business targets.
- Latency is meeting reporter workflow targets.

#### Phase 8 — Hardening (ongoing)

- Monitoring and alerting.
- Progressive rollout of prompt version updates.
- Feedback aggregation improving prompts.
- New specialty additions as new categories of correction emerge.

#### Total estimated timeline

- Phase 0: 2 weeks
- Phase 1: 3 weeks
- Phase 2: 4 weeks
- Phase 3: 6 weeks
- Phase 4: 4 weeks
- Phase 5: 3 weeks
- Phase 6: 2 weeks
- Phase 7: 3 weeks

**Total: 27 weeks (~6 months) for full migration.**

Realistic given a small team; can compress with more resources. Phases 1–3 are the critical path.

---

## 5. Reference Artifacts

The audits above reference several artifacts by name. Each of these is a deliverable in its own right. Below are the specifications sufficient to build them.

### 5.1 Correction Object JSON Schema

Location: `schema/correction_object.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://depopro.com/schemas/correction_object.schema.json",
  "type": "object",
  "required": ["id", "transcript_id", "case_id", "specialty", "prompt_version",
               "location", "change", "reason", "reason_kind",
               "confidence", "provenance", "review", "downstream"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^corr_[0-9A-Z]{26}$",
      "description": "ULID prefixed with 'corr_'"
    },
    "transcript_id": {"type": "string", "format": "uuid"},
    "case_id": {"type": "string", "format": "uuid"},
    "specialty": {
      "type": "string",
      "enum": [
        "proper_name_novel", "medical_context", "qa_split",
        "speaker_reassignment", "objection_attribution",
        "examination_section", "off_record_boundary",
        "inconsistency_flag", "contextual_number",
        "phonetic_disambiguation", "deterministic_rule"
      ]
    },
    "prompt_version": {
      "type": "string",
      "pattern": "^v[0-9]+$"
    },
    "location": {
      "type": "object",
      "required": ["paragraph_id", "start_word_id", "end_word_id"],
      "properties": {
        "paragraph_id": {"type": "string"},
        "start_word_id": {"type": "string"},
        "end_word_id": {"type": "string"},
        "start_offset_ms": {"type": "integer", "minimum": 0},
        "end_offset_ms": {"type": "integer", "minimum": 0}
      }
    },
    "change": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "proper_name_correction", "medical_term_correction",
            "speaker_reassignment", "qa_split", "objection_attribution",
            "examination_section_change", "off_record_boundary_mark",
            "inconsistency_flag", "contextual_number_flag"
          ]
        },
        "before": {"type": "string"},
        "after": {"type": "string"},
        "structural_change": {
          "type": "object",
          "description": "For non-text changes (speaker_reassignment etc.)"
        }
      }
    },
    "reason": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "Human-readable explanation. Empty or generic reasons rejected."
    },
    "reason_kind": {
      "type": "string",
      "enum": ["registry_match", "phonetic_similarity", "context_pattern",
               "prior_correction", "inconsistency_detected", "structural_boundary",
               "confidence_threshold", "reporter_preference"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "confidence_source": {
      "type": "string",
      "description": "How confidence was derived (e.g., 'registry+deepgram_low_confidence')"
    },
    "provenance": {
      "type": "object",
      "required": ["source", "generated_at"],
      "properties": {
        "source": {"enum": ["ai", "deterministic", "reporter"]},
        "provider": {"type": "string"},
        "model": {"type": "string"},
        "prompt_versions": {"type": "object"},
        "context_hash": {"type": "string"},
        "generated_at": {"type": "string", "format": "date-time"}
      }
    },
    "supporting_evidence": {
      "type": "array",
      "items": {"type": "object"}
    },
    "review": {
      "type": "object",
      "required": ["state"],
      "properties": {
        "state": {"enum": ["pending", "accepted", "rejected", "edited", "superseded"]},
        "decided_by": {"type": ["string", "null"], "format": "uuid"},
        "decided_at": {"type": ["string", "null"], "format": "date-time"},
        "decision_note": {"type": ["string", "null"]},
        "final_value": {"type": ["object", "null"]}
      }
    },
    "downstream": {
      "type": "object",
      "properties": {
        "applied_to_working_transcript": {"type": "boolean"},
        "applied_at": {"type": ["string", "null"], "format": "date-time"},
        "reverted_at": {"type": ["string", "null"], "format": "date-time"}
      }
    }
  }
}
```

### 5.2 Provider Adapter Interface (Python)

Location: `providers/adapter.py`

See §4.10 for the interface signature. Concrete implementations live in `providers/anthropic_adapter.py`, `providers/openai_adapter.py`, etc. The `MockAdapter` lives in `providers/mock_adapter.py` and loads fixtures from `tests/fixtures/provider_responses/`.

### 5.3 Modular Prompt Library Structure

Location: `prompts/`

See §4.2 for the directory layout. Each specialty is one `.md` file. The `PromptRegistry` (`services/tie/prompt_registry.py`) loads and composes prompts at runtime.

### 5.4 Knowledge Repository Structure

Location: `knowledge/` (static) + Postgres `case_knowledge` / `reporter_knowledge` / `dynamic_knowledge` schemas (dynamic).

Static knowledge files:

```
knowledge/
├── global/
│   ├── medical_terms.json           (10k+ common medical terms with variants)
│   ├── legal_terms.json             (Texas legal terminology, court names)
│   ├── abbreviations.json           (title/honorific/degree abbreviations)
│   ├── deepgram_artifacts.json      (known Deepgram misrecognitions)
│   └── court_conventions.json       (per-court cause number formats, etc.)
└── seed_registries/
    └── <shipped seed data for new cases>
```

### 5.5 Context Envelope JSON Schema

Location: `schema/context_envelope.schema.json`

Defines the exact structure sent to every specialty call. Ensures reproducibility.

### 5.6 Pipeline Configuration

Location: `prompts/versions/pipeline.json`

```json
{
  "version": "1.0",
  "specialties": [
    {"name": "speaker_reassignment", "prompt_version": "v1", "model_hint": "sonnet", "depends_on": []},
    {"name": "examination_section", "prompt_version": "v1", "model_hint": "haiku", "depends_on": []},
    {"name": "off_record_boundary", "prompt_version": "v1", "model_hint": "haiku", "depends_on": []},
    {"name": "qa_split", "prompt_version": "v1", "model_hint": "sonnet", "depends_on": ["speaker_reassignment"]},
    {"name": "objection_attribution", "prompt_version": "v1", "model_hint": "sonnet", "depends_on": ["qa_split"]},
    {"name": "proper_name_novel", "prompt_version": "v1", "model_hint": "opus", "depends_on": ["qa_split"]},
    {"name": "medical_context", "prompt_version": "v1", "model_hint": "opus", "depends_on": ["proper_name_novel"]},
    {"name": "phonetic_disambiguation", "prompt_version": "v1", "model_hint": "opus", "depends_on": ["proper_name_novel"]},
    {"name": "contextual_number", "prompt_version": "v1", "model_hint": "sonnet", "depends_on": []},
    {"name": "inconsistency_flag", "prompt_version": "v1", "model_hint": "opus", "depends_on": ["proper_name_novel", "medical_context"]}
  ]
}
```

Data-driven. Changing the pipeline requires no code change.

---

## 6. Implementation Roadmap

Summarizes the migration plan from §4.12 as a Gantt-style view.

```
Week:   1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27
Phase 0 [██]
Phase 1    [██████]
Phase 2          [████████]
Phase 3                  [████████████]
Phase 4                              [████████]
Phase 5                                      [██████]
Phase 6                                            [████]
Phase 7                                                [██████]
```

Critical path: Phases 0 → 1 → 2 → 3.

Team recommendations:

- **Phase 0**: 1 engineer + James (discovery, corpus curation).
- **Phase 1**: 1 backend engineer.
- **Phase 2**: 1 backend engineer.
- **Phase 3**: 1 backend engineer + occasional prompt-eng consultation. This is where the reference behavior gets encoded.
- **Phase 4**: 1 frontend engineer + 1 backend engineer.
- **Phase 5**: 1 backend engineer.
- **Phase 6**: 1 backend engineer.
- **Phase 7**: 1 backend engineer.

Every phase ships behind feature flags. Every phase is independently rollback-able.

---

## 7. Success Criteria & Testing Strategy

### 7.1 The reference corpus

The single most important artifact for verifying success is the **Reference Behavior Corpus**: pairs of (raw Deepgram output, expected CSR-quality transcript) from real cases, produced by the Claude Project reference implementation and verified by a human court reporter.

Every prompt or knowledge change must be tested against the corpus. A change that regresses any corpus entry cannot ship.

Target corpus size at Phase 3 exit: 30 transcripts covering:

- Multiple case types (personal injury, medical malpractice, commercial)
- Multiple courts (Bexar, Dallas, Harris counties)
- Multiple witness types (fact witnesses, medical experts, engineering experts)
- Edge cases (short transcripts, very long transcripts, transcripts with technical difficulty)

### 7.2 Golden fixture tests per specialty

Each specialty ships with 10–20 fixtures. Each fixture is a JSON file:

```json
{
  "fixture_id": "objection_attribution_001",
  "description": "Objection with missing speaker label; single opposing attorney present",
  "context_envelope": { ... },
  "expected_corrections": [ ... ]
}
```

Runner: `pytest tests/specialties/`.

### 7.3 End-to-end regression tests

Given a raw Deepgram JSON and a case configuration, produce the working transcript. Compare against expected. Diffs are visible; regressions fail the build.

Runner: `pytest tests/e2e/`.

### 7.4 Reporter acceptance testing

A live reporter runs the workspace against real cases. Metrics tracked:

- Correction accept rate (target > 80% for high-confidence)
- Correction reject rate (target < 5% for high-confidence — indicates prompt drift)
- Time from transcript ingest to certification (target: 40% reduction vs. current)
- Reporter-reported quality vs. current pipeline (survey)

### 7.5 Cost and latency SLOs

- Cost per transcript: under $2.50 for a 60-minute transcript at v1 model routing.
- Latency: full pipeline under 90 seconds for a 60-minute transcript.
- Reporter review time: under 15 minutes for a 60-minute transcript.

### 7.6 Non-regression on non-AI paths

The TIE must not break:

- The certification workflow.
- The DOCX and PDF export paths.
- The audio sync in Stage 3.
- The UFM validation.
- The existing tests that pass today.

CI runs the full existing test suite before any TIE changes are merged.

---

## 8. Appendix: File Inventory Cross-Reference

For implementers doing the migration, this appendix maps sections of the audit to specific files in the current `feature/stage3-workspace-core` codebase.

### 8.1 Files that will change

| File | Change | Audit section |
|---|---|---|
| `transcript_formatter/ai_tools.py` | Retired in favor of TIS | §4.10 |
| `transcript_formatter/spec_engine/processor.py` | Refactored to run rules only; AI moves to TIS | §4.4, §4.5 |
| `transcript_formatter/spec_engine/corrections.py` | Rules extracted to `rules/` modules | §4.4 |
| `transcript_formatter/spec_engine/models.py` | `CorrectionRecord` extended → `CorrectionObject` | §4.8 |
| `formatter_service/main.py` | Now calls TIS via HTTP | §3.1 |
| `formatter_core/*.py` | Preserved as-is; TIE reinforces its separation | §4.4 (R-RND-*) |
| `src/lib/transcript/canonicalIntegrity.ts` | No change; TIE builds on it | §1.2 |

### 8.2 New files

| File | Purpose | Audit section |
|---|---|---|
| `services/tie/` | Transcript Intelligence Service package | §3.1 |
| `services/tie/context_assembler.py` | Context envelope builder | §4.7 |
| `services/tie/prompt_registry.py` | Prompt loader and composer | §4.2 |
| `services/tie/correction_aggregator.py` | Merges and validates corrections | §4.8 |
| `services/tie/pipeline_scheduler.py` | Runs specialties per dependency graph | §4.11 |
| `providers/adapter.py` | ProviderAdapter interface | §4.10 |
| `providers/anthropic_adapter.py` | Anthropic implementation | §4.10 |
| `providers/mock_adapter.py` | Test implementation | §4.10 |
| `prompts/shared/*.md` | Shared prompt components | §4.2 |
| `prompts/specialty/*.md` | One specialty prompt each | §4.2, §4.6 |
| `prompts/policy/*.md` | Policy prompts (verbatim, certification, Morson) | §4.2 |
| `prompts/versions/active.json` | Version pinning | §4.2 |
| `prompts/versions/pipeline.json` | Dependency graph | §4.7 |
| `rules/*.py` | Deterministic rule modules | §4.4 |
| `rules/registry.py` | Rule execution engine | §4.4 |
| `knowledge/global/*.json` | Static glossaries | §4.3 |
| `schema/correction_object.schema.json` | Correction contract | §4.8 |
| `schema/context_envelope.schema.json` | Envelope contract | §4.7 |
| `supabase/migrations/xxxxx_corrections.sql` | New tables | §4.8 |
| `supabase/migrations/xxxxx_knowledge.sql` | Knowledge tables | §4.3 |
| `src/components/workspace/CorrectionsPanel.tsx` | UI panel | §4.9 |
| `src/lib/corrections/` | Frontend correction state | §4.9 |
| `docs/atia/*.md` | This audit + companion docs | Section 4 |

### 8.3 Existing audit documents to consult during implementation

- Before touching Deepgram integration: `DEEPGRAM_PIPELINE_REPORT.md`, `DEEPGRAM_WIRE_PARAMS_REPORT.md`
- Before touching canonical integrity: `W23B_CANONICAL_INTEGRITY.md`
- Before touching keyterms/registries: `KEYTERM_PIPELINE_FINDINGS.md`, `TRANSCRIPT_KEYTERM_AUDIT.md`
- Before touching speaker resolution: `SPEAKER_REASSIGNMENT_FIX_REPORT.md`, `STAGE_2_REPORTER_AUDIT.md`
- Before touching formatter contracts: `FORMATTER_OWNER_AUDIT.md`, `W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`
- Before touching UFM: `UFM_FIELD_AUDIT.md`, `INTAKE_UFM_GAP_ANALYSIS.md`
- Before adding a new provider: `PROVIDER_MIGRATION_REPORT.md`
- Overall architecture reference: `docs/architecture/MASTER_ARCHITECTURE.md`

### 8.4 Files that do NOT change

For clarity, these areas are explicitly out of scope for this audit:

- Intake pipeline (Stage 1) — untouched.
- Deepgram transcription (Stage 2) — untouched.
- Certificate generation and export (Stage 6+) — untouched.
- Audio sync (WaveSurfer) — untouched.
- Authentication and RLS (except new tables get their own policies).

---

## Closing

This audit is not a prompt. It's the specification for a system in which prompts are one small, replaceable piece.

The Claude Project that has been producing high-quality transcripts is the reference implementation whose behavior we characterize, decompose, and rebuild in Depo-Pro-owned form. The Project is knowledge and philosophy, not runtime dependency.

At the end of implementation, Depo-Pro owns:

- A characterization of "what good transcript editing looks like" as an executable test suite.
- A rule engine that handles everything deterministic reliably.
- A small library of focused AI prompts, each versioned and testable.
- A first-class notion of the correction — the atomic unit of transcript intelligence.
- A workspace where reporters review, decide, and refine corrections efficiently.
- A knowledge system that grows with every accepted correction.
- A provider abstraction that keeps Depo-Pro independent of any single AI vendor.
- A pipeline scheduler that runs work in parallel and controls cost.

The migration path is explicit and phased. No step is a big-bang cutover. Every step preserves currently-working behavior.

The final question is not "which model do we use?" It's "what does our correction schema require, and which model can produce that schema most reliably?" That's the correct question to be asking, and this audit puts Depo-Pro in position to ask it.

---

**End of AI Transcript Intelligence Audit v1.0**
