# WAVE8 PORT MAP — reference implementation → web app prompts
### How `depo_final_wave8` (desktop Python) accelerates the remaining Vite/React/Supabase work.

## Standing rule for every prompt that cites this map
The wave8 module is the NORMATIVE ALGORITHM. The task is faithful TRANSLATION to TypeScript, not redesign. Deltas forced by the stack (Postgres vs SQLite, storage vs disk, React vs PySide) are logged in the prompt report; behavioral deltas are forbidden without a boundary-log entry. Where practical, the wave8 module doubles as a TEST ORACLE: run the same fixture through both and compare outputs.

## Setup (one commit, prepend to the next prompt that runs)
Commit the reference source into the web repo, read-only, excluded from build and test globs:
- `reference/wave8/backend/` ← the zip's `backend/` (1.2 MB, 134 .py files)
- `reference/wave8/docs/` ← the zip's `docs/` (the authoritative dictionaries the three `docs/*.md` references were compiled from)
- Add to AGENTS.md: `reference/wave8/` is read-only normative reference; never imported, never executed in CI.

## Module → prompt map
| wave8 module | What it is | Web prompt it feeds | Port strategy |
|---|---|---|---|
| `services/keyterms.py` | Harvest engine: NAME/FIRM regexes, stopword + structure blacklists, multiword fixes, 100-cap, priority scheme | **5C Task 2 (immediate)** | Translate the rule tables verbatim (regexes, blacklists); oracle-test against its outputs |
| `services/nod_parser/orchestrator.py` + `intelligence.py` | Mature NOD extraction incl. keyterm priorities, ufm_* canonical fields | Extraction-coverage upgrade (future 5D) | Diff its field coverage vs the web parser's 15; port missing extractors |
| `models/canonical.py` + `services/intake_store.py` | Canonical UFM field naming; single-writer enforcement (`filter_ufm_fields`, `merge_stage1_ufm_fields`) | 5C Task 3 envelope keys; ongoing | Adopt the ufm_* names as the metadata envelope vocabulary (already started: ufmCause, ufmStyle…) |
| `preprocessing/probe.py` + `presets.py` | Audio profiling → Deepgram preset + param overrides (audio_profile.json) | Prompt 6-era enhancement | Translate preset classification; overrides merge onto §3.1 base (base keys never dropped) |
| `transcript/assembler.py` | normalize(): the §3.3 mapping in code | Already rebuilt (Prompt 5 Task 4) | ORACLE ONLY: same Deepgram fixture through both; outputs must match |
| `corrections/*` (pipeline, typography, artifacts, patterns, regex_rules, legal_phrases, guards, flags, log) | The G·A·M·T·F·U correction engine, ~1,500 lines | **Correction-engine prompt (Stage 3)** | Translate stage-by-stage, one commit per stage module; correction_log entries identical; speaker-map gate enforced before entry |
| `stage_s/*` (renderer, line_builder, objection_handler, parentheticals, off_record, colloquy, transitions, audit) | RenderLine production: Q/A tether, objection isolation, BY-lines, off-record handling | **Stage S rendering prompt (Stage 3→5)** | Translate module-per-module; RenderLine shape already canonical via DATA_STRUCTURES_REFERENCE |
| `pagination/*` + `geometry/*` | 25-slot pages, continuations, twips/points engine, UFM profile | **Pagination prompt (Stage 5)** | Translate; geometry constants already mirrored in DATA_STRUCTURES_REFERENCE §8 |
| `packaging/admin_pages.py` | The five UFM template generators WITH Texas statutory text (TRCP 203.2/203.3, UFM Figures) | **Template/packaging prompt (Stage 6)** | The statutory strings port VERBATIM — zero rewording without James/Miah sign-off; population logic translates |
| `api/packaging.py` `_build_metadata_for_job` | Metadata assembly with override-wins merge | 5C Task 3 (shape) + packaging prompt (full) | 5C builds the preview subset; packaging prompt completes the merge order |
| `transcript/packet.py` + `ingest.py` | raw/working packet discipline, single ingest orchestrator | Already mirrored (Prompt 5) | Cross-check only |
| `export/*` | DOCX/PDF/RTF/TXT writers | **Export prompt (Stage 7)** | python-docx/reportlab do NOT port; translate the LINE/PAGE layout decisions onto the web stack's chosen writer; preview and export must share one renderer (wave8's own rule) |
| `lexicon/` | Legal vocabulary lists | Corrections + keyterms | Port data files as-is (JSON/TS constants) |

## Revised remaining-prompt arc (each now translation-first)
5B (UX fixes) → 5C v2 (previews + keyterm harvest, citing keyterms.py) → 7 (auth/RLS — unchanged, no wave8 dependency) → 5D (extraction coverage diff) → Corrections engine → Stage S rendering → Pagination/geometry → Templates/packaging → Export. Exhibits and Certification UI slot in per the shell's stages, fed by transcript_exhibits-equivalent work.

## What wave8 does NOT decide
Auth/RLS (desktop had none — Prompt 7 stands alone), Supabase storage layout (ours is proven), multi-case lifecycle (ours is newer than wave8's), resumable uploads, and the session model UI (wave8 models sessions in SQLite; the web payload approach was already decided in Prompt 5 DECISION 1).
