# Wave 23B — Canonical Integrity Expansion

**Status:** Implemented in the active callback gate.
**Owner:** `src/lib/transcript/canonicalIntegrity.ts`.

## Scope completed

The canonical gate is read-only and now checks:

- invalid transcript duration;
- duplicate speaker, utterance, and word identifiers;
- orphan word-to-utterance and word/utterance-to-speaker references;
- contiguous global word and utterance ordinals;
- orphan utterances with no canonical words;
- invalid or reversed word/utterance times;
- monotonic word start times;
- word-timing overlap residue warnings;
- utterance timing that fails to bound its source words;
- non-contiguous word spans inside an utterance;
- suspicious adjacent duplicate utterance spans; and
- single-source transcripts that bypass the auto-chunk duration threshold.

## Pipeline behavior

`transcribe-callback` runs this gate after normalization/merge and before atomic ingest. A failure routes the transcript to the existing manual-review persistence path. Warnings are preserved as diagnostics and do not mutate or reject otherwise coherent canonical content.

## Ownership boundary

This module validates canonical shape and temporal coherence only. It does not correct text, reassign speakers, reconstruct paragraphs, or change word IDs, timings, or raw text.

## Exit criteria

- Reporter repair burden: reduced by preventing malformed canonical input from reaching the workspace.
- Single owner: canonical validation remains owned solely by `canonicalIntegrity.ts`.
- Duplicate logic: none introduced.
- Test coverage: duplicate IDs, orphan references, ordinals, invalid times, timing bounds, duplicate spans, and chunk threshold are covered.
- Releasability: the callback continues to use the established manual-review fallback on failure.
