# Depo-Pro Tools

**Depo-Pro Tools** is a Windows 11 desktop application for Texas court
reporters at SA Legal Solutions. It processes Deepgram audio transcription
output into fully formatted, UFM-compliant legal transcript packages ready
for delivery to counsel.

---

## Workflow Overview

```text
1  Transcribe   Upload audio -> Deepgram transcription -> extract case fields
2  Format       AI correction review -> Spec Process (UFM pipeline)
3  Build        Insert admin pages -> review flagged items -> export
4  Train        Teach the AI new correction rules from examples
```

---

## Features

### Transcribe Tab
- Records audio or uploads existing files (MP3, WAV, MP4, M4A)
- Sends to Deepgram for speaker-diarized transcription
- Uploads Notice of Deposition PDFs or DOCX job sheets
- AI extracts case fields automatically: cause number, court, witness,
  counsel names, reporter info, date/time, location
- Grouped UFM field table displays and lets the user verify all extracted
  fields before processing
- `Save UFM Fields to Job Config` commits edits to the `jobs/` folder

### Format Tab
- Non-AI formatter: normalizes spacing, `Q.` / `A.` labels, speaker labels,
  dash style, continuation lines
- **Spec Process (UFM)** — full 8-step pipeline:
  1. Parse Deepgram DOCX blocks
  2. Clean with confirmed spellings and deterministic rules
  3. Classify into `Q / A / SP / PN / FLAG / HEADER / BY` line types
  4. Emit with line numbers `1-25` per page
  5. Apply retroactive post-record spelling corrections (Spec §8)
  6. Generate Corrections Log page (scopist working notes)
  7. Generate Caption / Appearances page
  8. Generate Certificate page
- Speaker Verification dialog — mandatory before processing
- Job Config dialog — full case metadata entry with `CounselEditor` for
  plaintiff and defense attorneys (SBOT, firm, address, phone)
- Load Recent Job Config — re-run previous jobs without re-entering data

### Build Tab
- **Insert Title / Caption Page** — UFM Fig03 + Fig04 from extracted fields
- **Insert Appearances Page** — counsel, SBOT numbers, Also Present
- **Insert Index Page** — witness index + exhibit index with page refs
- **Insert Changes & Signature** — UFM Fig07 + Fig07A, notary block
- **Insert Reporter's Certification** — UFM Fig05
- **Exhibit Manager** — scrollable dialog with:
  - 10 default rows, `＋ Add Row` button
  - CSV import (`Number`, `Description` columns)
  - AI auto-detect from transcript text
- **Scopist Flag Review Panel** — interactive list of all flagged items
  generated during Spec Process, with resolve/pending toggles
- Three export formats:
  - **UFM Word (`.docx`)** — complete bordered document, headers/footers,
    line numbers `1-25`, Courier New 12pt, UFM margins. If Spec Process has
    run, exports the complete pipeline output directly.
  - **UFM PDF (`.pdf`)** — same layout, converted via Word COM -> docx2pdf
    -> LibreOffice -> ReportLab (first available strategy wins)
  - **ASCII (`.txt`)** — plain text, no line numbers, no formatting markers,
    UTF-8, for scopist delivery or archival search

### Train Tab
- Paste a before/after correction example
- AI analyzes and proposes a formatter rule (regex) or AI rule (prompt)
- Accept saves the rule to `custom_formatter_rules.json` or
  `custom_ai_rules.txt` for use in future jobs

---

## Page Format

Every administrative page is a 25-line bordered two-column Word table:

```text
┌────┬──────────────────────────────────────────────────────┐
│  1 │  NO. 2025-CI-12281                                  │
│  2 │                                                     │
│  3 │  BIANCA PEREZ,   )  IN THE DISTRICT COURT OF        │
... 
│ 25 │  or attached hereto.                                │
└────┴──────────────────────────────────────────────────────┘
```

Headers: case style (left) · `Page X of Y` (right)  
Footers: reporter name + CSR (left) · certified date (right)

---

## Install

```powershell
cd C:\Users\james\transcript_formatter
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Dependencies (auto-installed via `requirements.txt`):**  
`customtkinter` · `anthropic` · `deepgram-sdk` · `httpx` · `python-docx`  
`pdfplumber` · `python-dotenv` · `pywin32` (Windows) · `pytest` · `reportlab`

---

## Environment Setup

Create a `.env` file in the project root:

```env
ANTHROPIC_API_KEY=your_anthropic_key_here
DEEPGRAM_API_KEY=your_deepgram_key_here
```

Both keys are required for full functionality:
- Without `ANTHROPIC_API_KEY`: AI field extraction, AI correction, exhibit
  AI-detect, and Train tab analysis are disabled. All other features work.
- Without `DEEPGRAM_API_KEY`: Audio transcription is disabled. All other
  features (including Spec Process on existing DOCX files) still work.

---

## Run

```powershell
python main.py
```

---

## Run Tests

```powershell
python -m pytest spec_engine/tests/test_spec.py -v
```

Current test suite covers:
- Verbatim preservation (`uh` / `um` absolute rule)
- Subpoena duces tecum normalization
- Proper noun corrections (`Ugalde`, `Marrufo`, firm names)
- Affirmation word and duplicate collapse rules
- Doctor artifact normalization
- Emitter format and color tests (`Q/A/SP/PN/FLAG` line types)
- Objection handling and embedded `Q+A` splitting
- Speaker guard enforcement
- Administrative page generators (Title, Caption, Certificate,
  Changes, Witness Index, Exhibit Index)
- Export utilities (ASCII strip, file write)
- JobConfig round-trip serialization (all field groups)
- Scopist flag persistence

---

## Project Structure

```text
main.py                      Desktop application entry point
app.py                       Deepgram pipeline entry point
docx_exporter.py             UFM-compliant DOCX export with headers/footers
formatter.py                 Non-AI deterministic transcript formatter
ai_tools.py                  AI correction, field extraction, training analysis

spec_engine/
  models.py                  JobConfig, CounselInfo, ScopistFlag, ExhibitEntry,
                             WitnessIndexEntry, ChangeEntry, PostRecordSpelling
  document_builder.py        8-step UFM pipeline orchestrator
  classifier.py              Line type classifier + flag generator
  corrections.py             Deterministic spelling/pattern corrections
  emitter.py                 python-docx paragraph writer, LineNumberTracker
  parser.py                  Deepgram DOCX block parser
  exporter.py                ASCII strip and export utility
  pdf_exporter.py            4-strategy PDF conversion chain
  pages/
    _lined_page.py           Shared 25-line bordered table builder
    title_page.py            UFM Fig03 — Style/Title Page
    caption.py               UFM Fig04 — Caption / Appearances
    certificate.py           UFM Fig05 — Reporter's Certificate
    cert_exhibits.py         UFM Fig06 — Exhibit Volume Certification
    changes_signature.py     UFM Fig07+07A — Changes & Signature
    witness_index.py         UFM §11 — Witness Index
    exhibit_index.py         UFM §11 — Exhibit Index
    corrections_log.py       Spec §3.1 — Scopist Working Notes (Page 1)
    post_record.py           Spec §8 — Post-Record Spellings

pipeline/
  transcriber.py             Deepgram audio -> transcript
  assembler.py               Utterance assembly and speaker diarization
  chunker.py                 Text chunking for large transcripts
  preprocessor.py            Pre-transcription audio normalization
  keywords.py                Proper noun and keyterm extraction
  exporter.py                Pipeline results export

jobs/                        Saved JobConfig JSON files (one per deposition)
logs/                        Runtime logs (app, errors, AI, formatting)
session_state.json           Persisted UI state between restarts
```

---

## Key Terminology (Texas Court Reporter Standards)

| Term | Meaning |
|---|---|
| **Cause Number** | Texas court case identifier (NOT "Case Number") |
| **Case Style** | Formatted case name (Plaintiff v. Defendant) |
| **UFM** | Uniform Format Manual — Texas court reporter formatting standard |
| **SBOT** | State Bar of Texas number (8 digits) |
| **CSR** | Certified Shorthand Reporter |
| **Scopist** | Person who edits and proofreads the reporter's rough draft |
| **Post-Record Spelling** | Name spelling confirmed on the record — authoritative, overrides all prior uses |
| **Subpoena Duces Tecum** | Deposition requiring witness to bring documents |

---

## Safety

- AI never runs automatically — only on explicit user action
- AI output is shown in a review window before any text is replaced
- Prompts instruct the model never to rewrite, summarize, or remove testimony
- Filler words (`uh`, `um`) are preserved by absolute rule (Spec §2.1)
- Speaker map must be manually verified before Spec Process runs

---

## Session Behavior

- Last loaded transcript text is restored when the app restarts
- Save location, Deepgram settings, and case fields persist across sessions
- Session state is stored in `session_state.json`
- Job configs (`JobConfig` JSON) are saved to `jobs/` after each Spec Process run

---

## Logging

Runtime logs are written to:
- `logs/app.log` — general activity
- `logs/errors.log` — exceptions and failures
- `logs/ai.log` — AI API requests and responses
- `logs/formatting.log` — formatter rule applications
