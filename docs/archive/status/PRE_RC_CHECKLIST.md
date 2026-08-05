# DEPO-PRO — PRE-RELEASE-CANDIDATE CHECKLIST

Single source of truth for everything between "now" and cutting `release/stage3-rc`.
Consolidates carry-forward items scattered across Stage 1-5 audit reports.

**Branch:** `feature/stage3-workspace-core` · **Freeze:** ACTIVE (staging-only, no merge to deploy)  
**Last updated:** 2026-06-09 · *reconciled against live tree (Stage 1.5 landed)*

---

## ✅ DONE & HUMAN-VERIFIED
- Audit baseline + role-preserving dedup integrity fix (Stage 0.5 guard; Cukjati multi-role case pinned)
- Stage 1 — Attorney directory: create / reuse / firm auto-fill / UFM population / role preservation (verified in browser)
- **Stage 1.5 — Attorney function (multi-select):** canonical function set + single-vs-multi **decided and implemented**; multi-function stored as a first-class array (`AttorneyFunctionValue = AttorneyFunction[] | AttorneyRole`); legacy `OTHER` preserved; role-preservation guard green. **This retires the former `function: OTHER` must-fix.**
- Stage 2 — Reporter: selection → case + UFM certificate fields (csr_name/license/expiration/firm_registration) (verified)
- Participant add-dialog → shared centered blocking modal, sticky save, no clipping (verified across Reporter/Attorney/Other)
- GitHub: branch + backup tag synced to origin; non-destructive cleanup plan written (no branches deleted)

## ✅ AUDITED — REUSE, ALREADY WIRED (no work needed)
- Interpreter — case shape, directory details, modal add-flow, UFM appearances, keyterms. `oath_administered` HAS a live UFM consumer.
- Videographer — case shape, directory details, modal add-flow, UFM appearances + derived firm entries, keyterms.

---

## AUDIT VERDICTS — INTAKE LIFECYCLE (consolidated, 3 audits)

### Round-trip / UFM idempotency — ✅ PASS (RC gate cleared)
- `INTAKE_END_TO_END_VALIDATION_AUDIT` (commit `4748109`). Offline harness over a maximal fixture: `recordEqual=true`, `ufmEqual=true`, `doubleNormalizeIdempotent=true`.
- Meaning: produce UFM → save → reload (`normalizeCaseRecord`) → re-emit UFM yields an **identical** envelope; no fields lost; load normalization is idempotent.
- This was the highest-risk architectural unknown in the intake arc. **Proven at the logic level.**
- Caveat: proven offline (Stream 1). Live-DB corroboration (Stream 2) is an open verification below — not a gate.

### Conflict / provenance atomicity — KNOWN BOUNDED RISK (accepted for RC, not a blocker)
- `ATOMICITY_AUDIT` (follow-up to integrity audit `bef2764`). **Two-layer model:**
  - Authoritative provenance (`value` / `source` / `confirmed` / `conflict`) lives **inside `cases.payload`** and is written in the **single atomic** `saveCase` upsert — it cannot diverge from the value.
  - The `field_provenance` **table** is a **separate** append-only audit log, written **fire-and-forget** with swallowed errors, no retry, no flush-on-unload.
- **Blast radius:** a dropped log row **cannot** corrupt a case value or flip a confirmation (those are payload-driven). Worst case is an incomplete history view, or a *spurious* re-opened conflict in the workspace editor — the underlying value stays correct. The feared "wrong value while conflict shows closed" direction does not occur.
- **RC call:** accept as a known, bounded **audit-trail** risk. **Post-beta hardening** (logic-only, no schema change): (a) give `persistEntry` retry / surface-on-failure instead of swallowing; (b) reconcile `deriveOpenConflicts` against the payload `confirmed`/`conflict` flags so a missing log event can't re-open a settled conflict.

### Attorney array order canonicalization — ✅ CLOSED (fully)
- The Stage-1.5 integrity audit had flagged "reload canonicalizes array order." **Not reproduced.** Both the round-trip harness (order preserved) and static code agree: **no `.sort()`** in `normalizeCaseRecord.ts`, `case.ts`, `buildUfmMetadata.ts`, or `ParticipantsPanel.tsx`; `buildUfmMetadata` emits attorneys in `record.attorneys.map()` order.
- The current model represents multi-function as a **real first-class array** (`AttorneyFunctionValue = AttorneyFunction[] | AttorneyRole`). The earlier snapshot-based "singular-only / phantom `functions[]`" caveat is **resolved** — the array exists in the tree, and it round-trips with order intact.

---

## REMAINING BEFORE RC

No open **hard blocker** remains. Stage 1.5 was the last one and it has landed. The items below are build work and one decision, none of which gate a clean RC by themselves.

### Build work (canonical sets already decided)
- **Role-In-Proceeding dropdown (non-counsel participants).** Canonical set DECIDED: Corporate Representative, Records Custodian, Paralegal, Legal Assistant, Scheduler, Expert Consultant, Observer, Family Member, Technical Support, Videographer, Other. (Attorney EXCLUDED.) Prevents free-text garbage. `buildUfmMetadata` does not constrain role values today — just needs building.
- **`representing` free-text consistency.** Free-form phrasing ("FOR THE PLAINTIFF" vs "Plaintiff" vs "FOR PLAINTIFF") → inconsistent `ATTORNEY FOR ^ PARTY` lines. Consider a constrained set. Lower priority.

### Decision still open
- **`appearance_label` — snapshot vs live (persistence semantics) — LEANING SNAPSHOT.** When a saved case's `appearance_label` is later changed in the directory contact, should the already-saved case change with it? Leaning **snapshot**: a saved legal record should not mutate because a directory entry was edited afterward — historical accuracy and reproducible exports outrank centralized maintenance. Recorded as leaning-snapshot; do not implement under freeze. (Surfaced by `ATOMICITY_AUDIT`: `appearance_label` currently survives via a later directory-contact join, which is what makes the live-vs-snapshot question live.)

---

## ✅ DECISIONS MADE — BUILD DEFERRED
- **Speaker-label field — two-field model DECIDED.** UFM `appearances[].appearance_label` (e.g. `KAREN M. ALVARADO`) stays **separate** from a future `transcript_speaker_label` (e.g. `MS. ALVARADO`). Design is settled; the transcript-side speaker-label pipeline is a post-freeze build, not an RC item. (`appearance_label` feeds the UFM APPEARANCES page only; transcript by-lines run through the separate `speaker_label` pipeline.)

---

## POST-FREEZE FEATURE EPIC (deferred — deliberate build batch AFTER beta)
Tracked separately; do NOT build under the freeze.
- Transcript-side `transcript_speaker_label` pipeline (the build behind the now-decided two-field model)
- Witness / Deponent: dedicated entry form + read-and-sign vs signature-waived CERTIFICATE BRANCH (orphaned field today)
- Videographer media-log workflow: on/off-the-record statements, media/video log, equipment notes (no consumer today)
- First-class Corporate Representative form (currently generic "Other" participant)
- First-class Records Custodian form (currently generic "Other" participant)
- `reporter_profiles` schema extension: firm / phone / email for signed-in reporter profile (needs-schema)
- `case_name` legacy field cleanup (shadows canonical `case_style`)
- Attorney edit workflow (missing feature)
- Gamified "Case Readiness" meter → convert to objective checklist (UX decision)
- **Provenance-log durability hardening** (from `ATOMICITY_AUDIT`): retry/surface for `persistEntry`; reconcile `deriveOpenConflicts` against payload flags. Logic-only, no schema.

---

## OPEN VERIFICATIONS (close opportunistically — NOT RC gates)
- **Stream 2 live-DB corroboration** — not run in the validation audit (local Supabase stack down, no linked non-prod token). Stream 1 plus the live deployed app (active beta saves) already evidence real DB round-trips. Re-run the Stream-2-only read-only SQL when the local stack is up (`supabase start`) or against a non-prod project with one maximal `case_id`. ~20 min. This is the only item holding the validation audit at `PASS-WITH-RISKS` rather than `PASS`.

---

## RELEASE MECHANICS (when ready to cut RC)
1. Cut `release/stage3-rc` (this is the anchor that makes branch cleanup safe).
2. Then run the manual branch deletions from `docs/operations/GITHUB_CLEANUP_PLAN.md` (`feature/stage3-adapter-layer`, `feature/stage3-mount-contract`, `feature/stage3-provider-migration`). Retain `stage3-pre-merge-backup` until after a successful release merge.
3. Consider merge to main / deploy only at beta exit.

---

## KNOWN-HARMLESS NOISE (not bugs)
- MSW "Failed to fetch" / "[vite] server connection lost" → dev-server restart + hard refresh (`Ctrl+Shift+R`). Never an app bug so far.
- "LF will be replaced by CRLF" → Windows line-ending normalization.
- Occasional `.git/index.lock` race → self-clears, or `Remove-Item .git\index.lock -Force` then retry.
- Pre-existing lint errors (`conflictStore`, `nodParser`, `reporterNotesParser`) → post-beta cleanup, not from recent work.
