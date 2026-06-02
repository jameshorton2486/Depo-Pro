# DEPO-PRO MASTER ARCHITECTURE DOCUMENT
Version 1.0 — Official System Architecture and Development Blueprint

---

## PURPOSE

This document serves as the official architectural authority for DEPO-PRO.

All future development performed by Bolt, Claude, ChatGPT, Codex, or human developers must follow this architecture.

Whenever a conflict exists between older specifications and this document, **this document governs**.

---

## PROJECT MISSION

DEPO-PRO is a legal deposition production platform designed for Court Reporters.

The system assists in:
- Case intake
- Transcript creation
- Transcript editing
- Exhibit management
- UFM metadata generation
- Certification workflows
- Transcript export

**Primary objective:** Produce highly accurate deposition transcripts while reducing manual effort through AI-assisted review tools.

The final transcript is always reviewed and certified by a human court reporter. AI may suggest corrections. AI may never become the certifying authority.

---

## MVP PHILOSOPHY

The MVP must prioritize:
- Reliability
- Simplicity
- Transcript Accuracy
- Human Review

The MVP must NOT prioritize:
- Fancy automation
- Complex workflow engines
- Multi-user collaboration
- Cloud infrastructure
- Attorney portals

These features may be added later. The initial target is **local execution on a Windows PC**.

---

## OFFICIAL WORKFLOW

The official workflow consists of seven stages.

### STAGE 1 — INTAKE

**Purpose:** Create a deposition case and collect all metadata required later in the workflow.

**Functions:**
- Create new case / Load existing case
- Upload Notice of Deposition
- Upload intake notes
- Enter witness information
- Enter attorney information
- Enter court reporter information
- Build keyterm dictionary
- Validate UFM-required fields
- Save case

**Primary Outputs:** `case.json`, `keyterms.json`, uploaded intake documents

**Required Components:** Case Context Banner, UFM Validation Panel, Keyterm Dictionary, Case Metadata Editor

---

### STAGE 2 — TRANSCRIPT CREATION

**Purpose:** Generate transcripts from audio.

**Functions:**
- Upload audio/video
- Configure Deepgram options (diarization, speaker count, keyterms)
- Submit transcription request
- Save results

**Primary Outputs:** `deepgram_response.json`, `raw_transcript.json`, `working_transcript.json`, `transcript.txt`

**Required Components:** Audio Upload Panel, Deepgram Configuration Panel, Transcript Generation Monitor, Transcription Results Viewer

---

### STAGE 3 — TRANSCRIPT WORKSPACE

**Purpose:** Review and edit transcript content. This stage is the core of the application.

**Functions:**
- Display transcript with synchronized audio
- Navigate and search transcript
- Apply corrections
- Review low-confidence words
- Review speaker assignments
- Review AI suggestions

**Primary Outputs:** `working_transcript.json`, `review_state.json`, `audit_log.json`

**Required Components:** TipTap Editor, WaveSurfer Audio Player, Review Queue, AI Suggestion System, Low Confidence Review Panel, Search and Navigation

---

### STAGE 4 — EXHIBITS

**Purpose:** Manage deposition exhibits.

**Functions:**
- Upload, rename, categorize exhibits
- Link exhibits to transcript locations
- Jump from transcript to exhibit

**Primary Outputs:** `exhibits.json`, `exhibit_index.json`, uploaded exhibit files

---

### STAGE 5 — UFM INSERTIONS

**Purpose:** Generate transcript metadata sections.

**Functions:**
- Appearance page generation
- Certificate generation
- Case caption generation
- Exhibit index generation
- Attorney list generation
- CSR information insertion

**Primary Outputs:** `appearance_page.json`, `certificate_page.json`, `ufm_payload.json`

---

### STAGE 6 — CERTIFICATION

**Purpose:** Perform final validation before release.

**Functions:**
- Transcript completeness validation
- Missing page validation
- Witness information validation
- Certification checklist
- Final CSR review

**Primary Outputs:** `certification_record.json`, `validation_report.json`

---

### STAGE 7 — EXPORT

**Purpose:** Generate deliverable transcript packages.

**Functions:**
- DOCX, PDF, TXT, JSON export
- Transcript package export

**Primary Outputs:** Certified Transcript Package

---

## OFFICIAL USER INTERFACE

The application uses a **single workflow shell**. The user should never leave the workflow. Each stage appears as a screen within the application.

**Navigation order:**
1. Intake
2. Transcript Creation
3. Transcript Workspace
4. Exhibits
5. UFM Insertions
6. Certification
7. Export

---

## OFFICIAL ARCHITECTURE

**Frontend:** React, TypeScript, Vite, Tailwind CSS, TipTap, WaveSurfer

**Backend (Initial MVP):** Local services only. No cloud infrastructure required.

**Storage:** Local filesystem. JSON-based storage. No database required for MVP.

---

## EXISTING COMPONENTS

The Transcript Editor repository already contains major portions of Stage 3. These components are **authoritative**. Do not rebuild them.

**Existing components:**
- TipTap Editor
- WaveSurfer Integration
- Transcript Review Workspace
- Suggestion System
- Audio Synchronization

Future development must integrate with these components rather than replacing them.

---

## HUMAN REVIEW POLICY

AI may:
- Suggest corrections
- Suggest speaker assignments
- Suggest formatting
- Suggest metadata

AI may not:
- Certify transcripts
- Automatically finalize transcripts
- Hide changes from operators

Every AI change must be reviewable, auditable, acceptable, and rejectable.

---

## DEVELOPMENT RULES

**DO:**
- Build one stage at a time
- Reuse existing components
- Extend existing architecture
- Keep state management centralized
- Use existing styling conventions

**DO NOT:**
- Rebuild working components
- Create duplicate workflows
- Create duplicate editors
- Create duplicate navigation systems
- Create multiple architectures
- Create parallel versions of the same feature

---

## IMMEDIATE DEVELOPMENT PRIORITIES

1. Stage 1 — Intake
2. Stage 2 — Transcript Creation
3. Connect Stage 2 outputs to Stage 3 Workspace
4. Stage 4 — Exhibits
5. Stage 5 — UFM Insertions
6. Stage 6 — Certification
7. Stage 7 — Export

No future work should bypass this order without documented justification.
