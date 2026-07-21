# `main` Reconciliation — 62-Commit Classification

**Audit type:** READ-ONLY. **Generated:** 2026-07-13
**Purpose:** The mandated safeguard before any `main` reconciliation — classify
the 62 commits unique to `origin/main` so no unique history is discarded.

**No branch was merged, reset, or deleted. This is analysis only.**

---

## Divergence

- **Merge base:** `ad0f27a` — 2026-06-12 (`fix(conflict): await provenance writes…`).
- Since then: **`main` +62 unique / trunk +147 unique.** True parallel development
  for ~1 month.
- `git cherry` classifies **all 62 `main` commits as `+` (unique)** — none are
  patch-identical to the trunk. This alone does **not** mean "unique features": a
  divergent *reimplementation* of the same feature also shows as `+`. The buckets
  below resolve that by checking whether each feature exists on the trunk.

## Evidence: do `main`'s signature features exist on the trunk?

| Feature signature | Files on trunk | Reading |
|-------------------|----------------|---------|
| `speakerResolution` / `speaker_resolution` | **8** | Reimplemented on trunk → superseded |
| `utt_split` (Deepgram) | **2** | Present on trunk (own value) → superseded/parallel |
| overlay migrations | trunk has 3 (Jun 27–Jul 03) | Trunk reimplemented the overlay schema → superseded |
| multi-select / `appendSource` | **1** | Partially present → verify completeness |
| `renderStageS` (Stage S engine) | **0** | **Only on `main`** → triage |
| `VITE_DEV_AUTH` (dev auth bypass) | **0** | **Only on `main`** → triage (likely intentional exclusion) |
| `copyTranscript` (clipboard) | **0** (by identifier) | **Likely only on `main`** → verify |

## Classification buckets

### A. Superseded by the trunk's Wave 22/23 architecture (~40 commits)
Speaker resolution/attribution, transcript reassembly & refinement, representation
unification, paragraph rendering, formatter/DOCX geometry, honorific spacing,
keyterm seeding — the trunk has its own, newer implementations (region model,
W22-2A contract, DP-011 geometry, 8-file speaker resolution). Plus ~18
`docs(prompts)`/`docs(audit)` commits that are historical design records now
superseded by the compiler library and current audits.
**Disposition:** no action needed; do not re-import. Preserved via archive tag.

### B. Potentially UNIQUE to `main` — preservation decision required (~5 features)
| Feature | Commits (approx) | Assessment |
|---------|------------------|------------|
| Stage S rendering engine (`renderStageS`, `RenderLine`, role-resolution module, Stage S-fed DOCX path) | ~5 | Absent on trunk. Trunk chose the **region model** instead. Likely a **superseded alternative architecture**, but the code is unique — confirm it is truly replaced before discarding. |
| Multi-select audio upload / per-segment finalization / segment concatenation | ~4 | Only 1 related file on trunk. Multi-file flow may be **more complete on `main`** — verify against trunk's multifile work. |
| Copy transcript clipboard action | ~2 | 0 by identifier on trunk, though trunk has `P4_COPY_TRANSCRIPT_AUDIT.md` — **verify** whether trunk shipped an equivalent. |
| `VITE_DEV_AUTH` local auth bypass | 1 | Only on `main`. Dev-only; **likely intentionally excluded** from the release line. |
| Reuse-matching-cases / prevent dead-end workflow | 1 | Unknown — **manual review**. |

### C. Unknown — manual review (subset of B)
Stage S, copy-transcript, multi-file completeness, and case-reuse each need a
one-line human confirmation ("trunk already does this" / "must port") before the
reconciliation strategy is finalized. That confirmation is a per-feature `git
show <sha>` + trunk check — cheap, but a human call.

## Verification results (2026-07-13, read-only)

Per-feature check of bucket B/C against the trunk tree:

| Feature | Trunk evidence | Verdict |
|---------|----------------|---------|
| Multi-file upload / per-segment | `src/lib/transcript/multifileCallbackFlow.ts` + `20260610165436_add_multifile_source_columns.sql` present | **Superseded — drop** |
| Copy transcript (clipboard) | Clipboard copy present (`ExportScreen.tsx`, `CorrectionsPanel.helpers.ts`, payload previews) | **Superseded — drop** |
| Stage S rendering engine | `renderStageS` absent; trunk uses the frozen Wave 23 **region model** | **Superseded by chosen architecture — drop (with conscious ack)** |
| `VITE_DEV_AUTH` dev bypass | Absent on trunk | **Drop (dev-only, not for release line)** |
| Reuse-matching-cases / dead-end guard | Not found on trunk (only test keyword hits) | **Unique but minor — DEFER to backlog** (commit `05996ad`) |

**Net:** four of five are superseded/drop; one small feature (case-reuse, 1
commit) is genuinely unique and is deferred to the backlog, not lost (preserved
in the archive tag and citable by SHA). **No critical unique work would be
discarded** by adopting the trunk as truth. The reconciliation is de-risked.

## Recommendation

**Do NOT reset or fast-forward `main` to the trunk, and do NOT tag an RC yet.**
Either would risk discarding bucket B/C work — the exact "single biggest
repository risk."

Safe path:

1. **Tag `main` as `archive/main-pre-reconcile-2026-07-13`** (nothing lost, ever).
2. **Adopt the trunk as the go-forward release line** (it is the newer
   architecture and the current default).
3. **Triage bucket B/C** feature-by-feature: for each, decide *superseded*
   (drop), *port* (cherry-pick onto the trunk), or *defer* (backlog item). Record
   the calls in `OPEN_DECISIONS`.
4. Only **after** triage: reconcile `main` to the trunk (merge or, post-archive,
   reset), restore `main` as default, and cut the RC.

Bucket A does not block anything. Only the ~5 bucket-B/C features gate the RC —
and they are a short, bounded triage, not open-ended work.
