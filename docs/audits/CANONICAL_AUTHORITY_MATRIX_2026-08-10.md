# Canonical Authority Matrix

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: canonical-authority-audit
supersedes: null
superseded_by: null
approved_by: null
version: null
effective_date: 2026-08-10
ratified_date: null
last_reviewed: 2026-08-10
next_review: 2027-08-10
ratification: NOT_REQUIRED
implementation_status: PARTIAL
---

This Phase E audit identifies the intended owner of each major Depo-Pro responsibility. It is evidence, not a ratified architecture standard. Target owners derive from `docs/architecture/MASTER_ARCHITECTURE.md`, ratified domain standards and ADRs, ATIA v1.0, the clean-input assessment, and current implementation reachability.

## Matrix

| Responsibility | Current authorities | Competing authorities | Target authority | Consumers | Migration required | Risk | Evidence |
|---|---|---|---|---|---|---|---|
| Intake field ownership | `FieldRegistry`, source-specific parsers, `CaseRecord` | UI/builders can reshape values | Source-owned parsers feeding canonical `CaseRecord` fields | Workspace, keyterms, UFM, export | Prevent builders from renormalizing persisted values | High | `docs/DATA_FIELD_REFERENCE.md`; `src/lib/canonical/FieldRegistry.ts` |
| Phone formatting | `PhoneNumberPolicy`; contact/reporter form helpers | Display/input helpers may format independently | `PhoneNumberPolicy` through `CanonicalFormatter` | Intake, contacts, UFM, export | Route persisted canonical formatting through policy; keep display-only formatting non-authoritative | Medium | `src/lib/canonical/PhoneNumberPolicy.ts`; policy tests |
| Cause numbers | `CauseNumberPolicy`; parser/UI cleanup | Parser-local and UFM formatting paths | `CauseNumberPolicy` through `CanonicalFormatter` | Intake, UFM, caption, export | Migrate local normalizers; retain presentation-only punctuation when documented | High | `src/lib/canonical/CauseNumberPolicy.ts`; characterization tests |
| Person names | `NamePolicies`; parser/contact normalization; entity registry | Transcript entity matching and UI formatting can disagree | `NamePolicies` for canonical values; `entityRegistry` consumes them for matching only | Intake, speakers, keyterms, UFM, export | Remove independent canonicalization from consumers | High | `src/lib/canonical/NamePolicies.ts`; `src/lib/transcript/entityRegistry.ts` |
| Organizations and firms | `CanonicalFormatter`; `firmService` write canonicalizer; parser logic | Builder/display transformations | Canonical formatting policy at write boundary | Intake, contacts, UFM, export | Converge write paths; presentation may abbreviate without persistence | Medium | `src/api/firmService.ts`; canonical tests |
| Courts and case captions | Canonical field policies; parsers; UFM/spec-engine page builders | Builders can recreate capitalization/caption truth | Canonical case data; UFM renders without renormalizing | UFM, title/caption pages, export | Separate data normalization from page composition | High | `docs/standards/CANONICAL_FIELD_GOVERNANCE.md`; UFM builders |
| Reporter and scheduling data | `CaseRecord`, reporter profile, source-owned Intake fields | Hardcoded AI defaults and UFM fallback values | Canonical case/profile data with provenance | Deepgram context, AI context, UFM, certification | Remove case-specific defaults; make missing context explicit | High | AI-review audit; `src/api/reporterProfileService.ts` |
| Deepgram keyterms | Canonical case terms plus `normalizeDeepgramKeyterms` | AI/entity registries may independently invent context | Canonical Intake/keyterm dictionary transformed only for provider syntax | Transcription request | Ensure provider adapter consumes canonical terms without changing meaning | Medium | `src/api/transcriptionService.ts`; keyterm tests |
| Raw transcript evidence | Canonical transcript tables and immutable `raw_text` | Editable overlays and render transforms | Canonical Deepgram evidence tables/artifacts | Working Transcript hydration, audit, AI proposals | Enforce immutable raw boundary and stable IDs | Critical | `AGENTS.md`; `canonicalIntegrity.ts`; clean-input matrix |
| Working Transcript text | canonical words/utterances plus editable `text`; Workspace state | AI suggestions, correction registry, Stage S/render packages can appear authoritative | Persisted canonical working rows; component state is a temporary edit buffer | Workspace, AI proposal context, UFM/finalization | Prove load/edit/save/reopen; eliminate automatic display substitution | Critical | `workspaceService.ts`; `workspacePresentation.ts`; C1/C1b commits |
| Speaker identity | `transcript_speakers`; participant mapping; `speaker_resolution_current`; display resolver | Incompatible `speaker_id`/`raw_speaker_id` schemas and fallback labels | Canonical transcript speaker record mapped to participant; human decision overrides proposals | Workspace, Q/A, AI, export | Reconcile schema contract non-destructively; keep provider cluster immutable | Critical | AI-review audit; `resolveSpeakerDisplayName.ts` |
| Speaker role | `transcript_speakers.role`; legacy `speaker_role`; utterance assumptions | Multiple columns plus heuristic inference | Canonical speaker-role field with explicit human override | Q/A, labels, UFM/export | Select one persisted field via governed migration; consumers read it only | Critical | clean-input matrix; Supabase migrations; Workspace types |
| Q/A structure | persisted `line_type`; `structureEngine`; Workspace presentation heuristics; `qaFixer`; spec-engine | Several modules classify/split the same dialogue | Persisted structured line type after proposal/human review; deterministic renderer consumes it | Workspace, Stage S, export | Characterize and migrate heuristic engines to proposal or compatibility roles | Critical | `structuredTranscript.ts`; `structureEngine.ts`; `qaFixer.ts` |
| Colloquy and objections | structure engine, correction engines, Workspace presentation, spec-engine | AI and deterministic normalizers overlap | Reviewed structural classification; renderer owns final label layout | Workspace review, finalization, export | Stop text mutation during render; retain uncertainty as proposals | High | clean-input matrix; engine tests |
| Punctuation and capitalization | editorial/formatting/correction engines; paragraph display improvements; AI | Repeated transforms can overwrite accepted text | Working Transcript content after explicit correction; renderer only applies typography | Workspace, UFM, export | Classify transforms as proposal, accepted edit, or pure typography | Critical | `editorialEngine.ts`; `formattingEngine.ts`; `paragraphDisplayImprovements.ts` |
| Transcript corrections | correction registry/engines/orchestrator, AI suggestions, bridge, TIE `CorrectionObject` | Inconsistent contracts and direct application paths | ATIA `CorrectionObject` proposal contract plus one audited human-approved application path | Corrections UI, Working Transcript, audit | Characterize legacy; migrate generators; block duplicate application | Critical | `correctionObject.ts`; Python TIE schema; ATIA; AI-review audit |
| AI provider invocation | TS AI engines/bridge, Edge `ai-review`, Python provider adapters, quarantined `ai_tools.py` | Direct and vendor-specific paths | `transcript_formatter/providers` vendor-neutral adapter boundary | Controlled TIE pipeline | Keep legacy operational during migration; no new provider instantiations elsewhere | Critical | `AGENTS.md`; `test_import_guard.py`; ATIA |
| AI review persistence | legacy suggestion rows; bridge correction tables; future CorrectionObjects | Non-atomic row writes and unapplied remote migrations | Atomic correction run containing validated CorrectionObjects | Workspace correction review | Design idempotent run boundary; production schema deployment is gated | Critical | AI-review audit; `supabase/functions/ai-review/index.ts` |
| Paragraph reconstruction | `workspacePresentation.buildTranscriptParagraphs`; `transcriptParagraphs.buildTranscriptParagraphs`; spec-engine builders | Two TS owners plus Python reconstruction | One shared structured presentation model consuming approved line types | Workspace, Stage S, TXT/DOCX/PDF | Establish parity fixtures, migrate consumers, retire duplicate builders only after gates | Critical | clean-input matrix; both TS modules and tests |
| Workspace rendering | `workspacePresentation`; `unifiedRendering`; TipTap conversion | Display document transforms can alter visible words | One non-mutating render projection from Working Transcript | TipTap, search, audio sync | Preserve word IDs/audio timing; remove correction decisions from render | Critical | `workspacePresentation.ts`; `unifiedRendering.ts` |
| Workspace persistence | `workspaceApi` manual save/autosave; component state | Multiple save triggers can race or imply versions | One repository/save transaction; manual Save remains, autosave supplements it | Workspace | Characterize conflict/retry behavior and round trip | Critical | `src/api/workspaceService.ts`; `AGENTS.md` |
| Transcript lifecycle/retranscription | transcription job history, version labels/selectors, recovery functions | Jobs can appear as competing editable transcript versions | One user-visible Working Transcript; job/version history is evidence/recovery | Case lifecycle, Workspace loaders, certification | Hide routine version choice; retain exceptional admin recovery | Critical | `retranscription.ts`; `transcriptVersionLabels.ts`; settled product decision |
| Stage S | finalization pipeline, validators, geometry checks | Can overlap reconstruction/rendering | Observer/validator of a candidate final model; never text authority | UFM/finalization, certification | Document unique checks; remove mutating repairs or classify as explicit proposals | High | `src/lib/stageS`; `finalizationPipeline.ts` |
| Exhibits | exhibit records/index builders | UFM/export may independently reshape exhibit metadata | Canonical exhibit records and one finalization interface | Workspace, UFM, certification package | Define stable interface and keep transcript text separate | Medium | Stage 4 services/tests; Master Architecture |
| UFM metadata | `buildUfmMetadata`; Python `ufm_engine`; spec-engine page builders | Multiple builders may renormalize case data | Canonical case data + exhibit data assembled once; UFM owns presentation sections | Finalization, certification, render | Characterize parity and prohibit upstream truth mutation | Critical | `src/lib/ufm/buildUfmMetadata.ts`; `transcript_formatter/ufm_engine/` |
| Certification | `src/lib/certification.ts`; database lock/RPC; finalizer | Artifact creation and lifecycle state can diverge | Human-triggered certification record with immutable history and current pointer | Workspace progression, export | Design reissue/supersession without deleting prior evidence | Critical | certification tests; Master Architecture |
| Pagination and geometry | geometry engine, Stage S, Python renderers/exporters | Multiple implementations may produce different pages | One documented finalized render model and geometry authority | DOCX/PDF/export | Golden parity before consolidation | Critical | `geometryEngine.ts`; formatter exporters; ADR-0015 |
| Rendering/export | unified TS render model, export adapter/service, formatter core, Python spec/UFM exporters | Several output paths reinterpret transcript content | One finalized-data contract; pure format adapters consume it | DOCX, PDF, TXT, JSON packages | Select canonical path per supported format, characterize output, migrate consumers | Critical | `unifiedRendering.ts`; `exportAdapter.ts`; formatter services |
| Recovery | watchdog, recover-transcript, multifile/chunk paths | Historical normal route and exceptional recovery are intertwined | Explicit exceptional recovery operation preserving raw evidence | Operations/admin only | Remove from normal UI/routing only after reachability and recovery characterization | High | `recoveryPolicy.ts`; `recover-transcript`; accepted auto-chunk commit |

## Highest-value consolidation order

1. Preserve one Working Transcript and make all rendering/correction layers non-authoritative.
2. Select canonical speaker identity/role and structured line-type contracts before repairing AI review.
3. Converge AI generation on validated CorrectionObjects and one audited application path.
4. Consolidate paragraph/presentation ownership with parity tests.
5. Make UFM, Stage S, and export pure consumers of one finalized model.
6. Remove routine retranscription/version selection from the normal user workflow while retaining exceptional recovery.

## Deferred decisions

- Production schema reconciliation for speaker/correction tables requires a non-destructive migration plan and deployment Human Gate.
- Final selection among Python/TypeScript rendering implementations requires golden output parity evidence not yet present.
- Legacy AI code remains available as characterization and fallback until ATIA migration and deletion gates pass.
