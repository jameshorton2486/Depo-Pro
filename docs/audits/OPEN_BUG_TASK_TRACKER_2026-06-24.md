# Depo-Pro — Open Bug & Task Tracker
**As of:** 2026-06-24 (updated end of session +P1 audit +Deepgram fixes)  ·  Branch: `feature/stage3-workspace-core`  ·  BETA_FREEZE active

Work top-to-bottom. Each item: what's wrong → first action (audit-first) → done-when.

---

## P1 — saveReview "Transcript changed elsewhere — reload"  [ROOT-CAUSED · FIX READY]
- **Wrong:** review/confidence saves fail; `requireFreshTranscript` (workspaceService.ts:229) throws.
  Fires from `saveReview` via `ConfidencePanel.tsx:102`.
- **ROOT CAUSE (audit `P1_SAVE_REVIEW_FRESHNESS_AUDIT`):** the guard is correct; the data it's fed is
  stale. Real-API mutation wrappers (`saveWorking`, `saveReview`, `saveSpeakers`) return the
  PRE-save `target.updated_at`. The client stores that stale token into `jobUpdatedAt`. The
  `transcripts` table's `before update` trigger bumps `updated_at=now()` on every write, so after a
  `saveSpeakers` the client token is already invalid → the next `saveReview` is correctly rejected.
  Repro: load → save speakers → stale token → confidence save → throw (matches console, incl. 2× fire).
- **FIX (freeze-safe; no schema/contract/migration; do NOT remove the guard):** in the real-API
  branches of all THREE wrappers, run the mutation, then re-resolve the transcript row WITHOUT passing
  `lastKnownUpdatedAt` (a plain/unguarded resolve), and return the POST-save `updated_at`.
- **Implementation cautions:**
  - Post-save read must be UNGUARDED (don't route it back through the freshness check → would throw on
    your own write / create a read-after-write race).
  - Single-writer assumption: re-reading the timestamp after your own write is safe for single-user
    beta. The hardened version is to have the mutation RPC RETURN the `updated_at` it set (token = the
    one your transaction wrote). That likely touches the Edge Function contract → POST-BETA. Add a code
    comment: "single-writer assumption; RPC-returned token is post-beta hardening."
  - Fix ALL THREE wrappers in one pass (same bug, three hats) — not just `saveReview`.
- **Tests:** (1) real-API `saveSpeakers` returns post-save token; (2) real-API `saveReview` returns
  post-save token; (3) speaker-save → confidence-save does NOT trip the guard when no true external
  change occurred.
- **Done when:** all three wrappers return post-save tokens, three tests pass, guard intact.

## P4 — "Cannot copy transcript"  [QUICK WIN]
- **Wrong:** copy-transcript action fails on the generated transcript.
- **First action:** reproduce; locate the copy handler; identify failure (clipboard API? empty source?
  serialization?).
- **Done when:** copy produces the expected transcript text.

## P2 — Speaker tools: add / remove / reassign-by-paragraph  [HIGH VALUE — AUDIT FIRST]
- **Wrong:** no way to add missing speakers (3 clusters for 5 voices), remove extras, or right-click a
  paragraph to relabel its speaker (videographer vs court reporter both = SPEAKER 0).
- **First action:** AUDIT-ONLY persistence check (same shape as paragraph audit) — can
  add/remove/reassign survive save/reload under frozen `src/api/types.ts`? Per-paragraph reassign is a
  STRUCTURAL edit and likely needs the deferred Layer-2 overlay.
- **Done when:** audit verdict recorded; build UI only if a persistence path exists.
- **⚠ Do not build UI before this audit** — same persistence trap as paragraph merge/split.
- **Note:** the normalize.ts speaker-homogeneous split (see P7) only separates utterances where
  Deepgram DETECTED a speaker change. It does NOT separate two real people Deepgram merged into one
  cluster — that's P3.

## P3 — Deepgram diarization (root cause of P2)  [HIGH LEVERAGE]
- **Wrong:** 3 diarized clusters for 5 real speakers; distinct voices merged (videographer + court
  reporter both = SPEAKER 0).
- **First action:** check `diarize_model=latest` / v2 batch entitlement (targets speaker-merge).
  CONFIRMED via docs 2026-06-24: use `diarize_model` (don't also send `diarize=true` — rejected if
  both); v2 is BATCH ONLY (not streaming); `diarize_model=latest` gets newest. Web-search/verify
  current before changing. Keep `filler_words=true`, `mip_opt_out=true`; canonical from
  `results.utterances`.
- **Done when:** entitlement confirmed + controlled re-transcription shows cluster count vs 5 real.

## P7 — Deepgram request + normalize fixes — VERIFY before trusting re-run  [NEEDS VERIFICATION]
- **Done already (this session):** aligned request to Playground — added `numerals=true`, `utt_split=1`,
  `language=en`; removed app-only `paragraphs=true` (buildDeepgramRequest.ts:13). Split Deepgram
  utterances into speaker-homogeneous canonical utterances before saving (normalize.ts:125). Tests
  updated; typecheck/build/test pass. Etminan NOT yet re-transcribed.
- **VERIFY 1 — `utt_split=1` direction:** default is 0.8s; raising to 1.0 makes utterances LONGER
  (more combined) — the WRONG direction for the merge problem. The normalize split is what actually
  fixes merging. TEST 0.8 (default) vs 1.0 and compare; don't assume 1.0 is right just because it was
  in the Playground URL.
- **VERIFY 2 — word-identity through the split (CANONICAL SAFETY):** confirm normalize.ts RE-GROUPS
  words into utterances, does NOT regenerate them. Every word must keep original `word_id`,
  `start_time`, `end_time`, `confidence`, `speaker_id`. Confirm normalize.test.ts ASSERTS word-level
  identity preserved across the split, not just block count. (Touches the canonical/timing layer — the
  sacred one.)
- **VERIFY 3 — `paragraphs=true` removal doesn't orphan display:** earlier this session you ADOPTED
  `results.paragraphs` for display grouping (DEEPGRAM_PARAGRAPHS_EVALUATION). Confirm no downstream
  display code reads `results.paragraphs` now that they're no longer requested, or that grouping
  silently breaks.
- **Then:** re-transcribe the ACTUAL Etminan audio and compare to Playground baseline.
- **⚠ Binding hazard:** confirm the re-run binds the correct audio to the correct case (parity_job.json
  was Etminan text + Garza metadata; a case-to-audio mismatch was confirmed on one test case). Don't
  compare against a contaminated baseline.

## P5 — Date/ordinal auto-format check  [VERIFY]
- **Wrong (maybe):** live output `04/24/2026` → `April 24, 2026`; certified KEEPS ordinals and §4b says
  ordinal handling is suggestion-only.
- **First action:** check a spoken date in live output; confirm the formatter isn't auto-stripping
  ordinals. Note `numerals=true` is now on at the source — watch its interaction with §4a/§4b.
- **Done when:** confirmed compliant with DP-012 §4b, or auto-strip removed.

## P6 — Garble-flag targeting noisy  [OBSERVE]
- **Wrong (minor):** flagged confident words (`please`, `wear`); real garble was the phrase.
- **First action:** observe across more output before tuning. No change yet.
- **Done when:** enough samples to decide if targeting needs tuning.

---

## Housekeeping (not blocking, do when convenient)
- [ ] Confirm tree-hygiene cleanup ran: delete 2 zero-byte DP-012 root dupes + `parity_job.json`
      (PII/wrong-metadata hazard); move misplaced audit to `docs/audits/`; scoped commits, no `git add -A`.
- [ ] Confirm branch deploy topology (Vercel production branch) BEFORE any push. Nothing pushed yet.
- [ ] F6: wave8 `profile.py` tabs 360/900 → 720/1440 (audit-first).
- [ ] F8: `depo_qa_fixer.py` inline-flag handling (strip span, keep token).
- [ ] F9: build standards regression suite; seed from certified transcript (the `No.` test in
      `fbca684` is seed #1).

## Parking lot (post-beta — do NOT start now)
- Layer-2 overlay (corrections + speaker reassignment + paragraph boundaries — ONE design).
- RPC-returned `updated_at` token (P1 hardening — removes single-writer assumption).
- AI Structuring Engine (flag-gated, post-beta).
- Wave-21 canonical export architecture (post-beta).
- DOCX/PDF SaaS export (beta stays TXT/JSON; certified DOCX path is the desktop app).
