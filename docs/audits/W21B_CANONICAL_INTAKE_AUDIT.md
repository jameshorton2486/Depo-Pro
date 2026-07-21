# W21B Canonical Intake Audit

## Authority

- `docs/architecture/W21_RECOGNITION_QUALITY_STANDARD.md`

## Purpose

This audit defines what the canonical-intake layer is currently repairing after
Deepgram returns a response.

Its purpose is to reveal how much downstream structure work is compensating for
recognition-layer imperfections.

## Current Intake Boundary

The current normalization entry point is:

- [src/lib/transcript/normalize.ts](/C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts)

Related quality signals also exist in:

- [src/lib/audio/audioPreAnalysis.ts](/C:/Users/james/projects/depo-pro/src/lib/audio/audioPreAnalysis.ts)
- `src/lib/transcript/integrityAudit.ts`

## Current Repairs Performed Today

### 1. Utterance Fallback

If Deepgram utterances are missing, canonical intake builds fallback utterances
from the flat word stream.

Current effect:

- prevents total utterance loss
- preserves progress into Wave 22
- hides a recognition-layer deficiency that should be measured

### 2. Speaker-Split Repair

If a Deepgram utterance contains a speaker change inside the utterance, intake
splits the utterance into speaker-homogeneous segments.

Current effect:

- reduces merged-speaker carryover into semantic producers
- proves that some diarization/segmentation defects are already being repaired

### 3. Punctuated Word Preservation

Canonical intake prefers `punctuated_word` when available and falls back to the
bare word otherwise.

Current effect:

- improves text fidelity
- mixes recognition and formatting concerns that should still be tracked

## Audit Questions

Wave 21B must answer the following questions with data.

### Speaker Merges

- How often does Deepgram return an utterance containing multiple speakers?
- How often is canonical intake splitting those utterances?
- Which fixtures exhibit the highest rate?

### Boundary Splits

- How often do fallback or repair paths create better utterance boundaries than
  the original Deepgram response?
- Are long pauses creating incorrect merges?
- Are interruptions being absorbed into the wrong speaker turn?

### Long Utterances

- How many utterances exceed target conversational turn lengths?
- How many downstream semantic errors correlate with long utterances?

### Timing Integrity

- Are there missing timestamps?
- Are there overlaps between utterances?
- Are there orphan words or timing discontinuities?

### Speaker Continuity

- Are speaker identifiers stable enough for downstream speaker-resolution work?
- How often do diarized speaker runs appear to change at implausible points?

## Current Risk Assessment

Based on current repository behavior, the canonical-intake layer is already
compensating for at least two classes of recognition defects:

1. missing utterances
2. mixed-speaker utterances

That means some Wave 22 and Wave 23 complexity is likely downstream payment for
Wave 21 imperfections.

## Canonical Intake Metrics

Wave 21B should add measurement for:

- count of fallback-built utterances
- count of speaker-split repairs
- count of long utterances before repair
- count of long utterances after repair
- timing overlap count
- timing gap count
- orphan word count
- speaker continuity anomalies

## Output of This Audit

This audit should become the baseline answer to:

`What is canonical intake repairing today that recognition should ideally prevent upstream?`

That answer informs both:

- Wave 21 optimization priorities
- Wave 23 testimony-state complexity

## Current Recommendation

Do not change canonical-intake behavior yet.

Measure current repair behavior first so future Wave 21 changes can be judged by
whether they reduce the amount of intake repair required.
