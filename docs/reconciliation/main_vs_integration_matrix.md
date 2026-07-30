# Reconciliation Matrix — `main` ↔ `feature/stage3-workspace-core`

**Purpose:** turn an unsafe blind merge into a reviewed, decision-driven reconciliation.
**Read-only:** this document changes no code and does not touch `main`.

## Situation
- **Merge-base:** `ad0f27a` (2026-06-12) — the two lines diverged ~7 weeks ago.
- **Unique to `main`:** 62 commits. **Unique to integration:** 299 commits.
- **Conflicting code files:** ~30 (plus 3 docs). All in the transcript/workspace core.
- A textual merge cannot resolve these correctly because several are **semantic** forks
  (same feature, two incompatible implementations). This matrix names each one.

---

## Part 1 — The three architectural decisions (owner call required)

These are not merge conflicts; they are product/architecture choices. Nothing should
move into `main` until these are decided.

### D1 — Deepgram recognition tuning  (`buildDeepgramRequest.ts`, `normalize.ts`)
| | `main` | integration |
|---|---|---|
| utt_split | **1.2** | **1.0** (from 0.8) |
| language | **`en-US` explicit** | not set |
| paragraphs | — | **`true`** (upstream metadata) |
| diarize | — | **diarize fixes** (drop diarize_model 400; explicit diarize=true) |

**Recommendation (high confidence on the additive parts):** take integration as the base
(its `paragraphs=true` + diarize fixes are strictly correct and already validated), and
**graft `main`'s explicit `language=en-US`** on top. `utt_split` **1.0 vs 1.2 is the one
genuine tuning call** — your ear on real depositions decides. Both split mixed-speaker
utterances in `normalize.ts`; integration's version is the one wired to the resumable
finalize worker, so prefer it and spot-check `main`'s split logic for anything better.

### D2 — Speaker resolution architecture  (`workspaceService.ts`, `transcriptRepository.ts`, `SpeakerPanel.tsx`, `DocumentContext.tsx`, `buildEditorContent.ts`, `TranscriptEditor.tsx`)
| | `main` | integration |
|---|---|---|
| Approach | **deterministic** identity resolution; overlay maps many labels → one participant; read-time resolver; **strict fallback** (surface unresolved, stop over-attribution) | **AI-assisted**: speaker-resolution engine + **human verification gate** (engine2); AI-suggested badge; Q/A re-classification; structure engine (engine3); AI-suggestion overlay |

**These are complementary, not mutually exclusive — and the ATIA wants both.** The ATIA's
"deterministic-first, AI for judgment, human verifies" model maps exactly onto: `main`'s
deterministic resolver as the **base layer**, integration's AI suggestions as the **layer
on top**, both behind a verification gate. **Recommendation:** keep integration's AI/
verification pipeline (it's what the bridge work extends) and **re-introduce `main`'s
deterministic overlay resolver as the pre-AI pass** so obvious mappings never reach the
model. This is the single most valuable — and most delicate — reconciliation. Do it as
its own reviewed step, not folded into a bulk merge.

### D3 — Formatting / geometry  (`index.css`, `UtteranceNode.ts`, `pagination.ts`, `colloquy.ts`, `ExportScreen.tsx`, `buildEditorContent.ts`)
| | `main` | integration |
|---|---|---|
| Focus | **export/DOCX geometry**: Formatter geometry → DOCX, Stage S RenderLine, honorific spacing, Q/A tab layout | **workspace/canonical**: canonical formatting engine, geometry styling in editor, paragraph-fixer pipeline, **Recognition Evidence / Canonical Baseline** layer |

Largely **complementary** (export side vs. workspace side) but they collide on the shared
render files. **Caveat that only you can resolve:** the WORKSPACE_TRANSCRIPT_PIPELINE_AUDIT
argued *against* the CFE/paragraph-fixer path in favor of the faithful Recognition
baseline — and integration already added that baseline layer. So there is tension *inside*
integration too. **Recommendation:** keep `main`'s DOCX/export geometry (export path is
uncontested), and for the workspace render, decide baseline-first vs. paragraph-fixer
before merging — don't let a textual merge pick silently.

---

## Part 2 — Per-file matrix

**Tier A — Additive (both features wanted; combine, low risk):**
| File | `main` added | integration added |
|---|---|---|
| `api/caseService.ts` (+test) | case reuse, speaker-map badge | atomic certification lock |
| `lib/supabase.ts` (+test) | transcript refinement, dev auth bypass (flag) | auth bootstrap hardening |
| `lib/keyterms/harvestKeyterms.ts` (+test) | seed keyterms from case participants | spoken-name variants, org short forms, medical library |
| `types/database.ts` | speaker-resolution overlay tables | nullable `deepgram_speaker` |
| `IntakeScreen/DocumentUploadPanel.tsx` | multi-select ordered upload | upload cancellation, lint gate |
| `TranscriptCreationScreen.tsx` | ordered per-segment status list | resumable finalize worker, pre-analysis guards, left-rail nav |
| `RightSidebar.tsx` | export routing | correction-readiness panel, nav |
| `CaseBrowserScreen.tsx` | case reuse | left-rail rollout |
| `supabase/functions/editor-api/index.ts` | reassembly preview, speaker overlay, per-segment finalize | certification lock, AI-suggestion accept/reject/accept-all endpoints |

→ Mostly union-merges. Verify no signature drift where both touched the same function.

**Tier B — Semantic (belongs to a D1–D3 decision above):**
| File | Decision |
|---|---|
| `lib/deepgram/buildDeepgramRequest.ts` (+test) | **D1** |
| `lib/transcript/normalize.ts` | **D1** |
| `api/workspaceService.ts` (+test), `api/transcriptRepository.ts` | **D2** |
| `components/SpeakerPanel/SpeakerPanel.tsx` | **D2** |
| `context/DocumentContext.tsx` | **D2** (+ workspace state) |
| `lib/buildEditorContent.ts`, `TranscriptEditor/TranscriptEditor.tsx` | **D2 + D3** |
| `index.css`, `extensions/UtteranceNode.ts`, `editor/pagination.ts`, `editor/stageS/colloquy.ts`, `ExportScreen/ExportScreen.tsx` | **D3** |
| `Toolbar/Toolbar.tsx` | D3 (copy/clipboard) + nav refactor — reconcile nav |

**Tier C — Pipeline architecture (finalize):**
| File | Note |
|---|---|
| `supabase/functions/transcribe-callback/index.ts`, `transcribe-start/index.ts` | `main` = per-segment inline finalization + keyterm seeding; integration = **resumable Cloud Run finalize worker (DTAS Phase 2)** + CORS/atomic fixes + retranscription. **Recommendation: integration's finalize architecture wins** (it's the DTAS line and what the recovery/watchdog work builds on); preserve `main`'s keyterm-seeding + segment-review *concepts* on top. |

---

## Part 3 — Recommended execution (each step its own reviewed PR)
1. **Tier A union-merges** onto a `reconcile/main` branch — mechanical, low risk, shrinks the surface.
2. **D1** (Deepgram) — smallest semantic decision; lands the tuning + additive fixes.
3. **Tier C** (finalize) — adopt integration's worker, graft `main`'s keyterm/segment concepts.
4. **D2** (speaker resolution) — the deterministic-base + AI-on-top integration; heaviest review.
5. **D3** (formatting) — after the baseline-vs-fixer call is made.
6. Only then open the reconciliation PR into `main`, with the unique-`main` features verified present.

## Not in this matrix, but at risk
This session's **ATIA/bridge work is still uncommitted** and touches several Tier B/C files
(`buildEditorContent.ts`, `workspaceService.ts`, `editor-api`, `transcribe-start`,
`normalize.ts`). It should be committed to its own branch before any of the above begins,
or a branch switch will lose it.
