# TRANSCRIPT FIDELITY ROUND 2

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only audit

## Purpose

Measure cumulative transcript-quality progress after:

- CFE Phase 1
- CFE Phase 1.1
- Keyterm Pipeline Phase 1

## Inputs Reviewed

- `etminan_response.json`
- `docs/audits/CFE_PHASE1_VALIDATION.md`
- `docs/audits/CFE_PHASE1_1_VALIDATION.md`
- `docs/audits/KEYTERM_PHASE1_VALIDATION.md`
- `docs/audits/CFE_FIDELITY_VALIDATION.md`

## Executive Summary

Round 2 shows clear progress in downstream transcript presentation quality:

- deterministic formatting behavior is stronger
- garble-flag noise is materially lower
- request-budget preservation is now protecting the right names and entities before Deepgram submission

However, the currently available Etminan transcript artifact is still the original Deepgram output. That means:

- CFE improvements are directly confirmable on the available artifact
- garble-flag improvements are directly confirmable on the available artifact
- keyterm-preservation improvements are only indirectly confirmable from request-budget validation, not from a newly improved transcript result

So the current evidence supports this conclusion:

- formatting quality: improved and confirmed
- flag quality: improved and confirmed
- raw transcription quality: still limited by the old artifact, with improvements from Keyterm Phase 1 not yet transcript-verified

## Confirmed Improvements

### 1. Formatting Quality Improved

Confirmed from prior fidelity and implementation validation:

- sentence spacing behaves correctly
- honorific/abbreviation spacing behaves correctly
- context-sensitive `No.` handling behaves correctly
- direct-address capitalization behaves consistently with the frozen standards set

Evidence:

- `docs/audits/CFE_PHASE1_VALIDATION.md`
- `docs/audits/CFE_FIDELITY_VALIDATION.md`

### 2. Flag Quality Improved

Confirmed from Phase 1.1 validation:

- inline flags dropped from `499` to `181`
- function-word noise dropped from `272` to `0`
- common-word noise dropped from `46` to `7`
- proper nouns, medical terms, legal terms, and organization markers were preserved

Evidence:

- `docs/audits/CFE_PHASE1_1_VALIDATION.md`

### 3. Keyterm Preservation Improved

Confirmed from request-budget validation:

Before protection, only two critical Etminan/Vargas entities survived the overflow scenario:

- `Mohammad Etminan`
- `Rocio Laura Elizondo Vargas`

After protection, the preserved set expanded to:

- `Mohammad Etminan`
- `Rocio Laura Elizondo Vargas`
- `Dennis Malley`
- `Christian R. Ramon`
- `Rico Law Firm, PLLC`
- `Standing Seam & Specialty Company, Inc.`
- `Hidalgo County, Texas`
- `Cause Number C572224L`

And the first terms sacrificed became:

- `oral deposition`
- `read and sign`
- `certified court reporter`
- `stenographically`
- `Texas Rules of Civil Procedure`
- `remote video conference`
- `civil action`

Evidence:

- `docs/audits/KEYTERM_PHASE1_VALIDATION.md`

## Unconfirmed Improvements

### 1. Improved Raw Name Recognition

This is the biggest unconfirmed area.

Why it is still unconfirmed:

- `etminan_response.json` is a pre-existing Deepgram output artifact
- Keyterm Phase 1 changes the terms that reach Nova-3 before transcription
- no new Etminan re-transcription artifact exists yet on this branch for A/B comparison

Therefore, we cannot yet claim that the new preserved keyterms have actually improved the recognized transcript text for:

- witness names
- attorney names
- firms
- organizations
- jurisdiction/case identifiers

### 2. Improved Medical-Term Recognition

The transcript still contains strong medical content, including:

- `orthopedic`
- `ligamentous`
- `epidural steroid injections`
- `lumbar discectomy`
- `pars interarticularis`

But this round cannot prove whether Keyterm Phase 1 materially improved medical-term recognition because the underlying artifact predates the new request-budget behavior.

## Remaining Highest-Value Quality Defects

The current Etminan artifact still shows significant upstream recognition defects in names/entities and a few high-salience phrases.

### Name / Entity Defects

Observed examples:

- `Procedure of Vargas`
- `KEPKE`
- `standing steam`
- `SPECIALLY COMPANY, INC.`

These are high-value transcription defects because they affect:

- party names
- attorney context
- organization names
- defendant identity

### Reporter / Proceeding Phrase Defects

Observed examples:

- `corporal license`
- `Doctor. Etminan`

These are lower value than the entity defects above, but still visible quality issues.

### Transcript Context Defects Still Visible

Observed examples from the available artifact:

- witness/party naming is still partially degraded
- law-firm/entity strings remain unstable
- organization phrasing is not consistently canonical

## Names, Organizations, Firms, Medical Terms, and Flags

### Names

Observed positives:

- `doctor Mohammad Etminan` appears
- `Dennis Malley` appears
- `Christian R. Ramon` appears
- `Dennis Bentley` appears

Observed negatives:

- `Rocio Laura Elizondo Vargas` does not appear in full canonical form
- `Procedure of Vargas` appears instead of a clean party/firm phrase
- `KEPKE` appears instead of `Koepke`

Verdict:

- improved preservation is confirmed upstream
- improved final transcript naming is not yet confirmed

### Organizations / Firms

Observed positives:

- `PLLC` markers survive
- `Hidalgo County, Texas` appears
- `Quantum Pain` appears repeatedly

Observed negatives:

- `Standing Seam & Specialty Company, Inc.` is degraded to `standing steam` / `SPECIALLY COMPANY`
- `Rico Law Firm, PLLC` does not appear cleanly in the artifact

Verdict:

- still a major remaining fidelity weakness

### Medical Terms

Observed positives:

- `orthopedic` appears correctly
- many procedure/diagnostic terms remain recognizable
- the transcript retains enough medical terminology to be usable

Observed negatives:

- there are still localized garbles and unstable phrasing in complex explanations

Verdict:

- medical-term handling is better than entity handling in the current artifact

### Flag Quality

Observed status:

- major improvement already confirmed by Phase 1.1
- the dominant noise source is no longer function words
- remaining residual noise is concentrated in `OTHER` and domain-specific edge cases

Verdict:

- materially improved

## Improvements Confirmed vs Unconfirmed

### Confirmed

- standards-driven formatting quality improved
- inline-flag signal-to-noise improved substantially
- keyterm request-budget preservation now protects critical entities over generic legal boilerplate

### Unconfirmed

- whether the improved preserved keyterms measurably improve the Etminan transcript text itself
- whether entity-name recognition is now good enough without further keyterm work

## Recommendation

The next step should be a controlled A/B re-transcription of the Etminan audio using the current branch.

This should take precedence over:

- `Stage 1 Attorney Directory`
- `Keyterm Phase 2`
- additional formatter-focused audit work
- AI structuring work

Those workstreams are lower priority because the highest-value remaining uncertainty is narrower and measurable:

- did the preserved Keyterm Phase 1 entities materially improve actual Deepgram recognition?

That question is now the dominant roadmap gate. It should be answered before committing more implementation time to adjacent initiatives.

The retranscription should still be split into formal gates so the comparison stays valid.

### Gate A — Audio Verification

Before any Deepgram spend, prove all of the following for the Etminan artifact pair:

- exact audio file identity
- exact audio duration
- exact case linkage
- exact old-transcript-to-audio relationship

If those points cannot be proven, the result must be recorded as `INCONCLUSIVE` and the retranscription should not run. Without verified source-audio continuity, the comparison collapses into:

- old transcript
- different audio
- new transcript

which is not a usable fidelity test.

Current audit evidence suggests this gate is promising, because the live data already ties the reviewed transcript to:

- `case_id = case_20260622_x416k5`
- `transcript_id = tr_1782164554896_cra5eh`
- `audio_id = f_1782164501272_s20t`
- `original_filename = 04-24-26 Dr Mohammed Etminan, MD - Audio (1) (1).mp3`
- `duration_seconds = 4993.968`

Evidence source:

- `DATA_REALITY_FINDINGS.md`

But that still needs to be treated as the formal precondition for the A/B test, not as an implied assumption.

### Gate B — Retranscription

Only after Gate A passes:

1. re-transcribe the verified Etminan audio with current branch behavior
2. compare old vs new transcript output
3. score the specific entity/fidelity targets that Keyterm Phase 1 is meant to protect

The highest-value targets are the known entity failures already visible in the original artifact, especially:

- `Procedure of Vargas` -> `Rocio Vargas`
- `standing steam` -> `Standing Seam`
- `SPECIALLY COMPANY` -> `Specialty Company`

Perfection is not required. Material improvement on names, firms, organizations, and case-context entities is enough to validate that Keyterm Phase 1 is paying off.

### Gate C — A/B Entity Comparison

Compare the original artifact against the retranscribed result for the specific entities that the current branch was built to protect:

- `Etminan`
- `Vargas`
- `Malley`
- `Ramon`
- `Rico Law Firm, PLLC`
- `Standing Seam & Specialty Company, Inc.`
- `Hidalgo County, Texas`
- `Cause Number C572224L`

The known failure examples in the original artifact remain the most important signals:

- `Procedure of Vargas`
- `KEPKE`
- `standing steam`
- `SPECIALLY COMPANY`

### Decision Guidance

If Gate C shows:

- cleaner witness/party/attorney/firm/entity recognition
- fewer organization-name failures
- improved preservation of case identifiers and jurisdictions

then the next major workstream should likely shift toward workflow value, such as `Stage 1 Attorney Directory`.

If Gate C still shows:

- weak party-name recognition
- weak attorney/firm recognition
- persistent organization corruption

then `Keyterm Phase 2` is justified.

## Bottom Line

Round 2 confirms that the branch is materially better in presentation quality and request-time keyterm protection.

Round 2 does not yet confirm that the raw Etminan transcript itself improved from Keyterm Phase 1, because no post-fix retranscription artifact exists in the workspace.

The highest-value remaining defect class in the available corpus is still upstream entity recognition:

- names
- firms
- organizations
- case-context phrases

So the next evidence-driven move is:

1. verify the Etminan source audio and transcript relationship
2. if verification passes, re-transcribe the same audio with current branch behavior
3. compare raw transcript fidelity against the existing artifact
4. then choose between `Keyterm Phase 2` and `Stage 1 Attorney Directory`

Until that retranscription exists, the roadmap should not advance to `Attorney Directory`, `Keyterm Phase 2`, or additional transcript-quality speculation work.
