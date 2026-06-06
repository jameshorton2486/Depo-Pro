## Wave8 Orientation

Resolved reference root: `C:\Users\james\Downloads\wave8 zip`

### `reference/wave8/backend/services/keyterms.py`
- Implements the keyterm harvest engine used by intake text parsing and NOD parsing before Deepgram submission.
- The core rule tables are `MAX_KEYTERMS=100`, `MIN_TERM_LENGTH=4`, `MULTIWORD_FIXES`, `STRUCTURE_BLACKLIST`, `BOUNDARY_NOISE_WORDS`, and `STOPWORDS`, plus the `NAME_PATTERN` and `FIRM_PATTERN` regexes.
- The extraction flow is `normalize_legal_terms` → `normalize_text` → regex harvest → `_is_valid_term` / `_strip_boundary_noise` → case-insensitive dedupe → `_prioritize`.
- Priority order is proper multi-part names first, then legal all-caps terms, then multi-word phrases, then everything else.
- This feeds Prompt `5C` Task 2 directly per the port map. No mismatch found.

### `reference/wave8/backend/services/nod_parser/intelligence.py`
- Builds Deepgram-side intelligence from parsed NOD data: categorized keyterms, speaker hints, and a recommended request config.
- The key constants are the category labels, the `PRIORITY_*` bands, `STANDARD_LEGAL_TERMS`, and `RECOMMENDED_DEEPGRAM_CONFIG` (`nova-3`, `diarize_model=latest`, `utterances`, `filler_words`, `smart_format`, `numerals`).
- `split_defendants`, `_titlecase`, and the person-identity helpers prevent duplicate or degraded person/firms entries while preserving the strongest name form.
- `build_keyterms` emits ordered `{term, category, priority, boost, source}` rows; `build_speaker_hints` emits downstream diarization hints only.
- This feeds the future extraction-coverage upgrade (`5D`) and informs the `ufm_*` field vocabulary alignment mentioned in the port map. No mismatch found.

### `reference/wave8/backend/models/canonical.py`
- Defines the canonical Python-side domain vocabulary for case identity, participants, reporter credentials, deposition sessions, keyterms, and the composite packets.
- The key constants are the `JurisdictionType`, `LocationType`, `KeytermSource`, and `WorkspaceState` enums/literals plus the `_utc_now_iso` timestamp helper.
- Important canonical field names include `case_number_value`, `caption_full`, `judicial_district`, `location_type`, and `workspace_state`; translation is expected at the boundary rather than renaming the canonical layer.
- The packet model is intentionally assembled from small composable models rather than a giant nested structure.
- This feeds `5C` Task 3 and the ongoing metadata envelope naming work. No mismatch found.

### `reference/wave8/backend/api/packaging.py`
- Exposes the packaging endpoints and contains `_build_metadata_for_job`, the metadata assembly seam the port map specifically calls out.
- The important rule is override-wins merge order: start from persisted case/session/reporter/party/deposition metadata, then apply caller-supplied overrides last on every key.
- `_build_metadata_for_job` also derives formatted court strings, deposition method labels, proceedings dates/times, counsel/appearances fallbacks, and certificate date defaults.
- The assemble/certify endpoints freeze from locked transcript snapshots, verify raw-packet integrity, and record provenance around package assembly/certification.
- This feeds `5C` Task 3 for preview-shape work and the later full packaging prompt. No mismatch found.

### `reference/wave8/backend/packaging/admin_pages.py`
- Generates the five administrative/UFM pages from structured metadata only: caption, appearances, chronological index, witness index, exhibit index, corrections/signature, and reporter certificate.
- The key constants are `_RULE`, `DEFAULT_TEMPLATE_VERSION`, and the exact statutory / UFM text embedded in `build_caption_page`, `build_appearances_page`, and especially `build_certificate_page`.
- Placeholder behavior is explicit: missing metadata becomes bracketed placeholders and keeps the package in DRAFT rather than fabricating content.
- The certificate page also binds the output to package/snapshot/state-hash identifiers, which matters for later certification integrity.
- This feeds the Stage 6 template/packaging prompt, with statutory strings to be ported verbatim later. No mismatch found.

### `reference/wave8/backend/stage_s/renderer.py`
- Orchestrates deterministic Stage S structural rendering from utterances plus a confirmed speaker mapping into ordered `RenderLine` objects and audit entries.
- The major rule tables are implicit in the imports and state machines: `OFF_RECORD` / `ON_RECORD`, `qa_mode_for_role`, objection detection, transition detection, and the one-time examination-open emission.
- Processing order is stable-sort utterances by `utterance_index`, apply record-state transitions, preserve off-record spans, flag unmapped speakers, isolate objections, and emit Q/A or colloquy lines with dash handling and inline re-attribution.
- The renderer is explicitly idempotent and never mutates its inputs; it tracks interruption/resumption and BY-line re-emission in audit output.
- This feeds the later Stage S rendering prompt directly per the port map. No mismatch found.

### `reference/wave8/backend/stage_s/line_builder.py`
- Supplies the deterministic primitive constructors that `renderer.py` uses to materialize semantic lines.
- The key constants come from `backend.stage_s.models`: `LINE_Q`, `LINE_A`, `LINE_BY`, `LINE_EXAMINATION`, `LINE_COLLOQUY`, `LINE_PARENTHETICAL`, `LINE_FLAGGED`, and the tab constants `TAB_QA_DESIGNATION`, `TAB_COLLOQUY`, `TAB_PARENTHETICAL`, `TAB_MARGIN`.
- `qa_line`, `colloquy_line`, `parenthetical_line`, `by_attribution_line`, `examination_header_line`, and `flagged_line` define the exact line-type/text semantics the later TS port must preserve.
- `qa_mode_for_role` is a tiny but important role→Q/A mapping seam used by the renderer to keep logic deterministic.
- This also feeds the Stage S rendering prompt. No mismatch found.

### `reference/wave8/backend/corrections/pipeline.py`
- Defines the fixed deterministic correction-engine stage order and enforces the speaker-map-confirmed gate before any correction work runs.
- The explicit stage sequence is `G -> A -> M -> X -> (S, Q deferred to Stage S) -> T -> U -> F`, with parity mode currently running `G, A, M, T, F, U` because `X/S/Q` are not all built yet.
- The key pipeline seams are regex pre-stage replay, guarded-span protection, artifact cleanup, metadata substitution, legal phrase handling, typography, unguarding, and final flag detection.
- `run()` returns `CorrectionResult` with rendered lines, correction log, flags, and the parity-mode marker; `_process_utterance()` owns the per-utterance stage application.
- This feeds the future Stage 3 correction-engine prompt exactly as the port map says. No mismatch found.

### `reference/wave8/backend/geometry/profile.py`
- Defines the authoritative UFM geometry profile as physical constants rather than business logic.
- The key constants are `TWIPS_PER_INCH`, `TWIPS_PER_POINT`, page size, margins, `format_box_line_pt`, `text_area_min_width_inches=6.5`, `body_font_pt=12`, `lines_per_page=25`, `line_spacing_pt=28`, and the 5-tab `tab_stops_twips`.
- `GeometryProfile` exposes convenience properties like `text_area_width_twips`, `meets_text_area_minimum`, and `tab_twips()` that later pagination/layout code consumes.
- The Texas profile is locked as `TEXAS_UFM = GeometryProfile(name="texas_ufm")`; comments document the compliance fix for the right margin.
- This feeds the later pagination/geometry prompt. No mismatch found.

### `reference/wave8/backend/preprocessing/presets.py`
- Implements deterministic audio classification into named Deepgram preset deltas layered over a base param set.
- The key constants are the four presets (`studio`, `courtroom`, `zoom_mixed`, `phone`), the `PRESETS` map, and `DEFAULT_PRESET = courtroom`.
- `classify_audio(profile)` is total and ordered: narrowband sample rate → phone, stereo downmix → zoom_mixed, high activity + loud → studio, very quiet fallback → phone, else courtroom.
- The invariant comments are important: presets never override `filler_words` or `model`; they only supply minimal deltas like `utt_split` and `multichannel`.
- This feeds the later audio-profile / Deepgram preset enhancement prompt. No mismatch found.

## Port-Map Coverage Check

No mismatches found between the nine orientation targets and `docs/WAVE8_PORT_MAP.md`. The files all map cleanly to the future prompts named in the port map.

## Wave8 Modules Present On Disk But Not Mentioned In The Port Map

- Top-level backend modules/directories present but not explicitly called out by the map: `ai_review/`, `api/` routes other than `packaging.py`, `database/`, `db/`, `deepgram/`, `diagnostics/`, `models/` other than `canonical.py`, `packaging/` support modules other than `admin_pages.py`, `services/` modules other than `keyterms.py`, `nod_parser/orchestrator.py`, and `intake_store.py`, `transcript/` modules other than `assembler.py`, `packet.py`, and `ingest.py`, plus `transcript_state/`, `app.py`, and `config.py`.
- The notable unmentioned candidates are `services/intake_text_parser.py`, `services/speaker_mapping.py`, `services/workspace.py`, `transcript/audio_retention.py`, `transcript/provenance.py`, `transcript/render.py`, `transcript/repository.py`, `packaging/packager.py`, `pagination/paginator.py`, and the `ai_review/` cluster.
- No action taken here; this is only the orientation inventory the prompt asked for.
