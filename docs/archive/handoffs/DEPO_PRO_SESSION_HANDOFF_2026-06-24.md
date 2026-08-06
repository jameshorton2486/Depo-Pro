# Depo-Pro — Session Handoff & Findings Report
**Date:** 2026-06-24 (end of session)
**Branch:** `feature/stage3-workspace-core`
**Posture:** BETA_FREEZE active — audit-first, one scoped change per commit, no schema/migrations/push/merge without explicit approval.

---

## 0. TL;DR — where we are

The **full pipeline runs end to end on a real deposition** (Etminan): upload → transcribe →
workspace → Certification (Stage 6, all 5 checks, certified) → Export (Stage 7, TXT + JSON working).
That is the core loop, and it works. This session also **closed the entire standards-reconciliation
arc** (governance docs committed; registry wiring audited + fixed) and **ran two decision-gate audits**
(paragraph structure; abbreviation registry).

What's left is a short, sharp, well-prioritized list of **real bugs and missing tools surfaced by
actually using the workspace** — which is exactly the signal we wanted.

**Late-session progress:** P1 (the saveReview blocker) is now **root-caused with a freeze-safe fix
ready** (stale `updated_at` token returned by real-API wrappers — see §2 P1). Two Deepgram code
fixes landed (request alignment + speaker-homogeneous utterance split) but are **unverified** pending
a real re-transcription — see §2 P7.

---

## 1. WHAT WORKS (confirmed live, don't re-investigate)

- End-to-end pipeline: upload → transcribe → workspace → certify → export.
- Stage 6 Certification: all 5 checks (transcript review, speaker mapping, confidence review,
  exhibits, UFM insertions), certification statement, "Certified 2026-06-23".
- Stage 7 Export: **TXT** and **JSON package** export enabled and working.
- Formatting normalization (safe, auto-applied) verified on live output:
  - `doctor Mohammad` → `Dr. Mohammad`
  - `M. D.` → `M.D.`
  - `01:27PM` → `1:27 p.m.`
  - choppy one-line-per-segment blocks consolidated into one clean block
- Garble flagging (DP-012 §6) firing inline (`[SCOPIST: FLAG N: …]`), flag-don't-correct behavior present.
- Speaker 0 correctly surfaced and identifiable; the real garble `wear in the wings` →
  `swear in the witness` was corrected in the "After".
- Registry-backed spacing control path (commit `fbca684`) with tests pinning `No. 12129` (one space)
  and `No.  No.` (two spaces).

---

## 2. OPEN BUGS & GAPS (the fix list for tomorrow)

### P1 — `saveReview` "Transcript changed elsewhere — reload"  [ROOT-CAUSED · FIX READY]
- **Symptom:** confidence/review saves throw `Transcript changed elsewhere — reload.` from
  `requireFreshTranscript` (workspaceService.ts:229) via `ConfidencePanel.tsx:102`. Fired twice live.
- **ROOT CAUSE (audit done):** the freshness guard is CORRECT; the data it's fed is STALE. Real-API
  mutation wrappers (`saveWorking`, `saveReview`, `saveSpeakers`) return the PRE-save
  `target.updated_at`. The client stores that stale token into `jobUpdatedAt`. The `transcripts`
  `before update` trigger bumps `updated_at=now()` on every write, so after a `saveSpeakers` the
  client token is already invalid → the next `saveReview` is correctly rejected. (Repro: load → save
  speakers → stale token → confidence save → throw, matching the live console incl. the double fire.)
- **FIX (freeze-safe — do NOT remove the guard):** in all THREE real-API wrappers, run the mutation,
  then re-resolve the transcript WITHOUT `lastKnownUpdatedAt` (unguarded read) and return the
  POST-save `updated_at`. Cautions: post-save read must be unguarded (else read-after-write race);
  single-writer assumption (re-read is safe for solo beta; RPC-returned token is the post-beta
  hardening — note it in a comment); fix all three wrappers, not just `saveReview`.
- **Tests:** saveSpeakers returns post-save token; saveReview returns post-save token; speaker-save →
  confidence-save does not trip the guard absent a true external change.
- **Why it mattered:** had this been "fixed" by loosening the guard, the workspace would have shipped
  with no concurrency protection on a legal record. Audit-first caught the right fix.

### P2 — Speaker tooling missing: add / remove / reassign-by-paragraph  [HIGH USER VALUE]
- **What Miah needs (from live use):**
  1. **Add a speaker** — diarization found 3 clusters for **5 real voices**; she needs to create the
     missing speakers.
  2. **Remove a speaker** — when diarization over-splits.
  3. **Right-click a paragraph → reassign its speaker label** — e.g. both the videographer AND the
     court reporter are merged into "SPEAKER 0"; she needs to relabel block-by-block.
- **CRITICAL constraint (ties to P3 audit):** per-paragraph speaker reassignment is the **same
  persistence class** as the paragraph merge/split audit (see §3). It is a STRUCTURAL edit (who owns
  which block), not a `working_text` edit. The paragraph audit found structure edits **do not survive
  save/reload** under the frozen contract. So reassignment built today likely works in-session and
  **vanishes on reload** — the same trap.
- **Next step:** AUDIT FIRST (audit-only, same shape as the paragraph audit) — can add/remove/reassign
  persist under the frozen `src/api/types.ts` contract, or do they need the deferred Layer-2 overlay?
  Build the UI only after that answer. Add/remove may touch the speaker map (might persist);
  per-paragraph reassign almost certainly needs the overlay.

### P3 — Deepgram diarization quality (ROOT CAUSE of P2)  [HIGH LEVERAGE]
- **Symptom:** 3 diarized clusters for 5 real speakers; distinct people merged into one cluster
  (videographer + court reporter both = SPEAKER 0).
- **Why it matters:** this is NOT a workspace bug — it's the source ASR diarization collapsing voices.
  The best speaker-correction UI is the one Miah barely has to use, so improving diarization reduces
  how much P2 even gets exercised.
- **Next step:** check the `diarize_model=latest` (v2 diarization) account entitlement — it specifically
  targets speaker-merge. Reminder from project rules: do NOT send `diarize=true` and
  `diarize_model=latest` simultaneously (Deepgram rejects the combo); `mip_opt_out=true` for privileged
  audio; `filler_words=true` is a hard rule; canonical transcript from `results.utterances`. Web-search
  current Deepgram params before writing any API change (their API changes frequently).

### P7 — Deepgram request + normalize fixes — VERIFY before trusting the re-run  [NEEDS VERIFICATION]
- **Done this session (unverified):** aligned request to Playground (`numerals=true`, `utt_split=1`,
  `language=en`; removed app-only `paragraphs=true`) in buildDeepgramRequest.ts; split Deepgram
  utterances into speaker-homogeneous canonical utterances before save in normalize.ts. Tests/build
  pass; Etminan NOT re-transcribed yet.
- **Verify 1 — `utt_split=1` is the WRONG direction:** default 0.8s; raising to 1.0 makes utterances
  LONGER/more-combined. The normalize split is what actually fixes merging. Test 0.8 vs 1.0; don't
  assume the Playground URL value is right.
- **Verify 2 — word identity through the split (CANONICAL SAFETY):** confirm normalize RE-GROUPS words,
  doesn't regenerate them — every word keeps `word_id`/`start_time`/`end_time`/`confidence`/
  `speaker_id`. Confirm the test asserts word identity, not just block count.
- **Verify 3 — `paragraphs=true` removal doesn't orphan display:** earlier this session you ADOPTED
  `results.paragraphs` for display grouping; confirm nothing downstream still reads it.
- **Then:** re-transcribe the ACTUAL Etminan audio, compare to Playground baseline. Confirm correct
  audio↔case binding first (parity_job.json hazard: Etminan text + Garza metadata).
- **Note:** the speaker-homogeneous split only separates utterances where Deepgram DETECTED a speaker
  change — it does NOT separate two real people merged into one cluster. That's P3.

### P4 — "Cannot create copy of the transcript"  [SMALL / ISOLATED]
- **Symptom:** copy-transcript action fails (user reported "Cannot create copy of the transcript the
  application created").
- **Why it matters:** small, concrete, probably a quick fix — but it's a real export/clipboard path
  failure distinct from everything above.
- **Next step:** reproduce, find the copy handler, audit the failure. Likely low-effort.

### P5 — Date/ordinal behavior — verify against reconciled DP-012 §4b  [VERIFY]
- **Observation:** live "After" rendered `04/24/2026` → `April 24, 2026`. The certified transcript
  keeps ordinals (`April 24th, 2026`; `September 15th`, etc.), and reconciled DP-012 §4b makes ordinal
  handling **suggestion-only, not auto-applied**.
- **Next step:** confirm the auto-formatter isn't stripping/altering spoken-date ordinals automatically
  (MM/DD/YYYY → spelled-month may be acceptable; ordinal stripping is the §4b concern). Check a spoken
  date elsewhere in the transcript. Small possible regression against the F2 decision.

### P6 — Garble-flag targeting may be noisy  [LOW / OBSERVE]
- **Observation:** flagged confident words (`please`, `wear`) while the real garble
  (`wear in the wings` → `swear in the witness`) was the meaningful one. Flag-don't-correct is working;
  the *targeting* may be miscalibrated.
- **Next step:** observe across more transcript before tuning. Not urgent.

---

## 3. DECISIONS ALREADY MADE THIS SESSION (don't relitigate)

### Standards reconciliation — DONE & COMMITTED
- `c426cfc` add Canonical Editorial Policy as top-level governing authority
- `96f3b8f` amend DP-012 §4 (figures deterministic / date ordinals suggestion-only) and §5
  (certified-aligned: direct-address titles NOT auto-capitalized)
- `ef8e4d7` point geometry to DP-011; renumber architecture doc out of DP series
- `e931627` cite Canonical Editorial Policy from DP-010/011/012
- Registry single-source: audited + remediated in `fbca684` (CFE `No.` path now registry-gated; tests
  pin behavior). F5 effectively PARTIAL-and-fixed. Residual: `^no\.$` still hardcoded in helper —
  deferred tidy, not a drift hazard (registry gates whether it fires).

### Paragraph structure persistence — AUDITED, BLOCKED, DEFERRED (`6e8e4e9`)
- Verdict: persistent paragraph merge/split is **blocked** under the frozen Stage 3 contract. Save
  flattens everything to one `working_text` per `utterance_id`; user-authored boundaries die on reload.
- Options: A) session-local only (not durable — reject as shippable), B) mutate canonical utterances
  (DANGEROUS — touches Layer 1 word ownership), C) separate paragraph-boundary overlay (clean Layer-2,
  but schema/storage scope expansion).
- **Decision:** DEFER to post-freeze. Paragraph boundaries belong in the SAME Layer-2 overlay as the
  corrections layer AND speaker reassignment — all three are the same missing capability (storing human
  structural decisions). Design them together, post-freeze, informed by Miah's real friction.

### Corrections layer — DEFERRED (earlier this session)
- Edits persist into canonical rows, not a separate corrections layer. Durable corrections layer =
  schema change = deferred to first post-freeze build. (Same Layer-2 overlay as above.)

---

## 4. THE UNIFYING ARCHITECTURAL INSIGHT (read before building anything tomorrow)

Three separate needs have now independently converged on the **same answer**: a post-freeze
**Layer-2 overlay** that stores *human structural decisions* without mutating the canonical
word/utterance/timing layer:
1. corrections layer (durable word/text corrections)
2. speaker reassignment (who really said this block)  ← P2
3. paragraph boundaries (merge/split)                  ← paragraph audit

The frozen contract only persists `working_text` per utterance — it has nowhere to store "this block
is really the court reporter, not the videographer," or "these words form a new paragraph," or "this
correction is an overlay, not a canonical rewrite." That is ONE missing capability, not three. When
freeze lifts, design ONE overlay for all three — not three schema changes. Miah's real friction
(captured via the observation sheet) should drive how the three are weighted.

This is why P2's reassignment can't just be "built tomorrow" — it needs the persistence audit first,
and likely the overlay.

---

## 5. RECOMMENDED ORDER FOR TOMORROW

1. **P1 fix** — implement the freeze-safe wrapper fix (all 3 wrappers return post-save token; 3 tests;
   guard intact; unguarded post-save read; single-writer comment). Root cause already found.
2. **P7 verify + re-transcribe** — check the 3 verification items, set `utt_split` (test 0.8 vs 1.0),
   confirm audio↔case binding, then re-run Etminan and compare to the Playground baseline. This is the
   real test of the Deepgram fixes and feeds P3.
3. **P3** — Deepgram `diarize_model` (v2 batch / `latest`) entitlement check — the root-cause fix for
   merged speakers. Verify current params before changing. Reduces how much P2 is even needed.
4. **P4** — "cannot copy transcript" bug. Small, isolated, fast win.
5. **P2 persistence audit** — can add/remove/reassign speaker persist under the frozen contract, or
   does it need the Layer-2 overlay? Audit-only. Build UI ONLY after.
6. **P5** — verify date/ordinal isn't auto-stripping (against §4b; watch `numerals=true` interaction).
7. **P6** — observe garble-flag targeting across more output before tuning.

DO NOT (still): start the AI Structuring Engine or Wave-21 export (both REFERENCE DESIGN ONLY,
post-beta, flag-gated). Don't build speaker UI before the P2 persistence audit. Don't fix P1 blind.

---

## 6. HOUSEKEEPING / STILL-OPEN THREADS
- Tree hygiene: classified (keep/commit, archive, delete) but confirm the cleanup actually ran —
  delete the two zero-byte DP-012 root duplicates and `parity_job.json` (data hazard: Etminan text +
  Garza metadata + PII), move misplaced audit to `docs/audits/`, scoped commits (no `git add -A`).
- Branch topology: confirm whether `main`/this branch auto-deploys (Vercel production branch) BEFORE
  any push — nothing has been pushed.
- F6 (wave8 profile.py tabs 360/900 → 720/1440), F8 (qa_fixer inline-flag handling), F9 (build the
  standards regression suite — seed from the certified transcript; the `No.` test in `fbca684` is the
  first seed) — small audit-first items, post-P1/P2.
- Miah observation sheet exists (`MIAH_WORKSPACE_OBSERVATION_SHEET.md`) — this live session already
  produced much of the signal; a fuller narrated pass would still sharpen the Layer-2 overlay design.

---

## 7. ARTIFACTS PRODUCED THIS SESSION (for reference)
- `CANONICAL_EDITORIAL_POLICY.md` (capstone, committed)
- `DP012_S4_S5_AMENDED.md` (amendment text, committed into DP-012)
- `CANONICAL_STANDARDS_RECONCILIATION_FINDINGS.md` / `STANDARDS_RECONCILIATION_DECISIONS.md`
- `PROMPT_GOVERNANCE_DOCS_PASS.md`, `PROMPT_F3_F4_DOC_HYGIENE.md`
- `MIAH_WORKSPACE_OBSERVATION_SHEET.md`
- `Etminan_Transcript_Clean.docx` (clean reading copy of the certified transcript)
- This handoff: `docs/archive/handoffs/DEPO_PRO_SESSION_HANDOFF_2026-06-24.md`
