# Screen Flow
Version 1.0

---

## Purpose

This document defines the complete screen-by-screen navigation flow for DEPO-PRO.
It serves as the single source of truth for routing decisions, stage transitions,
and back-navigation rules.

---

## Navigation Model

DEPO-PRO uses a **linear stage shell** — not a router with arbitrary URL access.

- The user moves forward through 7 stages in sequence.
- Back-navigation is permitted to any previously completed stage.
- Forward-navigation past an incomplete stage is blocked.
- There is no URL-based routing. Stage is held in `StageContext`.

---

## Stage Map

```
┌─────────────────────────────────────────────────────────┐
│                     DEPO-PRO Shell                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Stage Nav Bar (always visible)                   │  │
│  │  1 Intake · 2 Creation · 3 Workspace · 4 Exhibits │  │
│  │  5 UFM · 6 Certification · 7 Export               │  │
│  └───────────────────────────────────────────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Active Stage Screen                              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Stage 1 — Intake

**Entry condition:** Always accessible. First screen on launch or new case.

**Screens:**

| Screen | Description |
|---|---|
| `IntakeScreen` | Case metadata form — case name, case number, court, deponent, counsel, reporter |

**Exit condition:** All required UFM fields validated. User clicks "Open Transcript Editor" (or equivalent CTA).

**On exit:** Writes `case.json`. Advances stage to 2 (Transcript Creation).

**Back navigation:** N/A — first stage.

---

## Stage 2 — Transcript Creation

**Entry condition:** `case.json` exists with valid required fields.

**Screens:**

| Screen | Description |
|---|---|
| `TranscriptCreationScreen` | Audio upload, Deepgram configuration, keyterm injection, submission |
| `TranscriptCreationMonitor` | Progress indicator while Deepgram job runs |
| `TranscriptCreationResults` | Preview of raw transcript before proceeding |

**Exit condition:** Deepgram response received and `raw_transcript.json` written. User confirms results.

**On exit:** Advances stage to 3 (Transcript Workspace).

**Back navigation:** Allowed to Stage 1 to edit case metadata.

---

## Stage 3 — Transcript Workspace

**Entry condition:** `raw_transcript.json` and `working_transcript.json` exist.

**Screens:**

| Screen | Description |
|---|---|
| `TranscriptWorkspace` | Full editor — TipTap, WaveSurfer, RightSidebar panels |

**Sub-panels (within RightSidebar):**

| Panel | Tab |
|---|---|
| `SpeakerPanel` | Speakers |
| `SuggestionsPanel` | AI Review |
| `ConfidencePanel` | Confidence |
| `ExhibitsPanel` | Exhibits |
| `ChangeLogPanel` | Changes |

**Exit condition:** User marks review complete or manually advances. `review_state.json` written.

**Back navigation:** Allowed to Stage 2 (re-run transcription).

---

## Stage 4 — Exhibits

**Entry condition:** `working_transcript.json` exists.

**Screens:**

| Screen | Description |
|---|---|
| `ExhibitsScreen` | Upload, rename, categorize, link exhibits to transcript locations |

**Exit condition:** User confirms exhibit list complete.

**On exit:** Writes `exhibits.json` and `exhibit_index.json`. Advances to Stage 5.

**Back navigation:** Allowed to Stage 3.

---

## Stage 5 — UFM Insertions

**Entry condition:** `case.json`, `exhibits.json` exist.

**Screens:**

| Screen | Description |
|---|---|
| `UFMScreen` | Generate and preview appearance page, certificate, case caption, attorney list, exhibit index |

**Exit condition:** All UFM sections generated and user approves. Writes `ufm_payload.json`.

**Back navigation:** Allowed to Stage 4.

---

## Stage 6 — Certification

**Entry condition:** `ufm_payload.json` exists. All UFM required fields populated.

**Screens:**

| Screen | Description |
|---|---|
| `CertificationScreen` | Final checklist — completeness, missing pages, witness info, CSR sign-off |

**Exit condition:** CSR checks all items and confirms. Writes `certification_record.json`.

**Back navigation:** Allowed to Stage 5.

---

## Stage 7 — Export

**Entry condition:** `certification_record.json` exists.

**Screens:**

| Screen | Description |
|---|---|
| `ExportScreen` | Format selection (DOCX, PDF, TXT, JSON), package generation, download |

**Exit condition:** Export package downloaded. Case marked complete.

**Back navigation:** Allowed to Stage 6.

---

## Stage Transition Rules

| Rule | Detail |
|---|---|
| Forward gating | A stage may not be entered until all prior stages have an exit condition met |
| Back always allowed | Any completed stage may be re-entered from the nav bar |
| Re-entry invalidation | Editing Stage 1 or 2 data invalidates downstream outputs and requires re-confirmation |
| State persistence | `StageContext` holds current stage. Case data held in `CaseContext`. |

---

## Transition Invalidation Map

| If user edits... | Then these stages must be re-confirmed |
|---|---|
| Stage 1 (case metadata) | Stage 5 (UFM re-generates), Stage 6 (certification re-checks) |
| Stage 2 (transcription) | Stage 3 (workspace reloads), Stage 6 (certification re-checks) |
| Stage 3 (transcript edits) | Stage 6 (certification re-checks) |
| Stage 4 (exhibits) | Stage 5 (UFM exhibit index re-generates) |

---

## Shell Component Layout

```
DepoEditor
└── StageProvider
    └── CaseProvider
        └── StageShell
            ├── StageBanner          ← always visible, shows current stage
            ├── StageNavBar          ← 7-step breadcrumb
            └── StageRouter
                ├── stage === "intake"      → IntakeScreen
                ├── stage === "creation"    → TranscriptCreationScreen
                ├── stage === "workspace"   → TranscriptWorkspace (existing EditorInner)
                ├── stage === "exhibits"    → ExhibitsScreen
                ├── stage === "ufm"         → UFMScreen
                ├── stage === "certification" → CertificationScreen
                └── stage === "export"      → ExportScreen
```
