# Clean-Input Defect and Necessity Matrix

---
authority_tier: T5
status: ACTIVE
owner: Architecture
scope: clean-input-defect-necessity
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

Date: 2026-08-10  
Benchmark transcript: `tr_1786372056908_hyjqv3`  
Status: Baseline assessment

## Benchmark facts

The canonical transcript is intact: 1,757 utterances and 13,952 words load, no utterance is excluded, no word has a working edit or AI suggestion, and canonical identifiers remain present. Zero utterances have a persisted non-UNKNOWN line type. All seven diarized speakers have null assigned names and roles. There are 505 words below 0.75 confidence and 925 below 0.85; average confidence is 0.9720.

| Concern | Authority path | Preservation and mode | Clean-input finding | Classification |
|---|---|---|---|---|
| Canonical loading | Canonical tables → `EditorDocument` | Raw rows/IDs preserved; deterministic read | Complete beyond former 1,000-row cap | CORE |
| Words | `raw_text` → explicit display overlay | Raw immutable; word IDs retained | No persisted edit needed; overlay contract remains necessary | CORE |
| Utterances | Canonical utterances → visible document | IDs retained; explicit exclusion only | 1,757/1,757 retained | CORE |
| Diarization | Deepgram speaker index → canonical speaker IDs | Provider evidence persisted directly | Seven coherent speaker streams | CORE |
| Speaker mapping | Canonical speaker → participant/name | Human-directed; speaker ID retained | All seven unresolved; required workflow | CORE |
| Role assignment | `role`/`speaker_role` + inference → render role | Mixed persisted/session authority | Duplicate columns and inference owners | DUPLICATE AUTHORITY |
| Q/A inference | Roles/text → proposed display structure | Deterministic heuristic; source IDs retained | Needed as assistance, not transcript evidence | SUPPORTING |
| Q/A reconstruction | Presentation/QA/editorial/structure modules → paragraphs | Direct display transform; source ID arrays retained | Multiple owners exceed clean-input need | DUPLICATE AUTHORITY |
| Colloquy | Roles/text → labels/paragraphs | Deterministic display/export transform | Necessary presentation, duplicated ownership | DUPLICATE AUTHORITY |
| Objections | Text/roles → classification/normalization | Deterministic and AI paths overlap | Useful review signal; parallel normalizers unjustified | UNNECESSARY COMPLEXITY |
| Punctuation | Words → typographic display | Raw/IDs retained; directly applied | Basic formatting needed; evidence/display boundary must stay explicit | SUPPORTING |
| Capitalization | Words/names → normalized display | Heuristic direct display or correction | General need mixed with case-specific defaults | CORRUPTION-ERA CANDIDATE |
| Paragraphs | Utterances → paragraphs/lines/pages | Source IDs generally carried forward | Two `buildTranscriptParagraphs` owners threaten parity | DUPLICATE AUTHORITY |
| Abbreviations/spacing | Registry + words → formatted tokens | Raw/IDs retained; direct output | Registry justified; consumers should converge | SUPPORTING |
| Deterministic corrections | Registry/CFE/engines → replacements | Raw retained; visibility/application varies | No Thomas corrections persisted; broad lexical rules not proven necessary | CORRUPTION-ERA CANDIDATE |
| AI processing | Transcript/context → target `CorrectionObject` | Proposal-only target; stable locations | No Thomas result; TIE/provider boundary is approved direction | SUPPORTING |
| Legacy AI review | Canonical transcript → legacy suggestions | Intended proposal path; optional auto-apply | Fails before provider; duplicates TIE responsibility | LEGACY-ACTIVE |
| Correction generation | Registries, engines, legacy AI, TIE → correction records | Inconsistent contracts | Too many generators | DUPLICATE AUTHORITY |
| Correction application | Reviewed correction → working layer | Raw retained; human confirmation required | One audited application path is necessary | CORE |
| Confidence | Provider confidence → flags/review | Deterministic proposal; IDs retained | Targeted review remains valuable | CORE |
| Provenance | Mutations → append-only audit/change records | Before/after + IDs expected | Legally necessary; coverage differs by surface | CORE |
| Stage S | Candidate render → validation/report | Observer with narrow presentation repairs | Useful quality gate; must not become authority | SUPPORTING |
| Workspace render | Canonical + overlays + transforms → TipTap | IDs mostly retained; transforms applied directly | Complete render succeeds, but responsibilities are coupled | UNNECESSARY COMPLEXITY |
| Workspace persistence | Human edits/review/speakers → working tables | Raw immutable; manual Save plus autosave | Required; save authorities need consolidation | CORE |
| Formatter Service | Certified render model → DOCX/PDF | Pure deterministic consumer target | Required; must not correct transcript | CORE |
| Exhibits | Exhibit records → readiness/package | Separate evidence; human curated | Required, independent of transcript reconstruction | CORE |
| UFM | Source-owned case fields → insertions/metadata | Governed ownership; human review | Required; must not infer transcript truth | CORE |
| Certification | Working + checklist → locked state/history | Explicit human action | Required; lifecycle must preserve reissue history | CORE |
| Export | Certified model → artifacts | Should consume without mutation | Required; duplicate render transforms threaten parity | DUPLICATE AUTHORITY |

## Conclusion

Clean Thomas disproves corruption-era reconstruction as the default architecture. The minimum surviving system is immutable canonical evidence, explicit working overlays, human speaker/role mapping, targeted confidence review, proposal-only AI, one audited correction-application path, one shared presentation model, a pure formatter/export boundary, and certification with history. The primary downstream problem is duplicated authority and automatic display transformation, not missing transcript data.

