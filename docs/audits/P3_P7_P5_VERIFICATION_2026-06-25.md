# P3 / P7 / P5 Verification Audit

Date: 2026-06-25
Branch: `feature/stage3-workspace-core`
Auditor: Codex

## Scope

This audit verifies three queued items:

1. P3 — Deepgram `diarize_model=latest` entitlement and request compatibility
2. P7 — `utt_split=1` direction and normalize word-identity preservation
3. P5 — date/ordinal auto-format behavior against reconciled DP-012 §4b

## P3 — Deepgram `diarize_model=latest`

### Code status

The batch request builder is now correct.

- Request builder: [src/lib/deepgram/buildDeepgramRequest.ts](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:50)
- `diarize=true` is not present anywhere in the batch request path.
- `diarize_model: "latest"` is present at [buildDeepgramRequest.ts:53](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:53)
- `filler_words: "true"` is present at [buildDeepgramRequest.ts:54](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:54)
- `utterances: "true"` is present at [buildDeepgramRequest.ts:56](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:56)
- `utt_split: "0.8"` is present at [buildDeepgramRequest.ts:57](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:57)
- `mip_opt_out: "true"` is present at [buildDeepgramRequest.ts:60](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:60)
- The request-builder tests lock the corrected behavior:
  - [src/lib/deepgram/buildDeepgramRequest.test.ts](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.test.ts:76)
  - `expect(request.wireQueryString).toContain("diarize_model=latest")`
  - `expect(request.wireQueryString).not.toContain("diarize=true")`
- No streaming request builder exists in the app codebase today, so there is no app-side path currently sending `diarize_model` on streaming requests.

### Official Deepgram docs

Deepgram's current diarization docs state:

- `diarize_model` is the recommended parameter for diarization model selection.
- `diarize_model=latest` resolves to the latest GA batch diarizer, currently v2.
- `diarize=true` is deprecated and routes to the v1 diarizer.
- Requests must not set both `diarize` and `diarize_model`; requests that set both are rejected.

Source:
- https://developers.deepgram.com/docs/diarization

Relevant lines captured from the docs page:

- “Specifying `diarize_model` both enables diarization and selects the model version. You do not need to also set `diarize=true`.”
- “The `diarize` parameter is deprecated.”
- “Don’t set both `diarize` and `diarize_model` — requests that set both are rejected.”

### Verdict

- **Docs verdict:** confirmed. The request builder now matches the current recommended Deepgram batch diarization path.
- **Entitlement verdict:** confirmed via live API check below.

### Next action

Use the corrected request path when the next real Etminan re-transcription runs and compare cluster quality against the prior `diarize=true` baseline.

## P3 Live Entitlement Check — 2026-06-25

Request params used: `diarize_model=latest`, `model=nova-3`, `utterances=true`, `filler_words=true`, `mip_opt_out=true`

Response status: `200`

Speaker fields present in response: yes

Evidence:

- `results.channels[0].alternatives[0].words[*].speaker` was populated
- `results.utterances[*].words[*].speaker` was populated
- `results.utterances[*].speaker` was populated

Verdict: **CONFIRMED**

Note: `diarize_model=latest` requires no separate entitlement on Deepgram cloud accounts. No upgrade required. Fix `e731ebf` is confirmed correct on docs side and now confirmed by live API response on this account.

## P7 — `utt_split=1` direction and word-identity preservation

### `utt_split=1` direction

The app currently sends:

- `utt_split: "1"`

Source:
- [src/lib/deepgram/buildDeepgramRequest.ts](C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts:57)

Deepgram's current docs state:

- `utt_split` default is `0.8`
- `utt_split` is the silence length, in seconds, after which a new utterance begins

Source:
- https://developers.deepgram.com/docs/utterance-split

Implication:

- Raising `utt_split` from `0.8` to `1.0` requires a longer pause before a new utterance begins.
- Therefore `utt_split=1` moves in the direction of fewer, longer Deepgram utterances, not more aggressive splitting.

### Normalize split safety

The current normalize layer compensates by re-splitting Deepgram utterances when word-level speaker changes occur inside a single Deepgram utterance.

Source:
- Split implementation: [src/lib/transcript/normalize.ts](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:125)
- Canonical projection: [src/lib/transcript/normalize.ts](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.ts:180)

The existing test coverage is strong and already proves word-level preservation across that split.

Source:
- [src/lib/transcript/normalize.test.ts](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.test.ts:22)

The test asserts:

- utterances are split when speaker changes inside one Deepgram utterance
- total word count is preserved
- canonical `word_id`s are still generated deterministically in sequence
- each resulting canonical word preserves the source word's:
  - `start`
  - `end`
  - `confidence`
  - `speaker`

Specifically:

- [normalize.test.ts:61](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.test.ts:61) asserts `start_time`
- [normalize.test.ts:62](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.test.ts:62) asserts `end_time`
- [normalize.test.ts:63](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.test.ts:63) asserts `confidence`
- [normalize.test.ts:66](C:/Users/james/projects/depo-pro/src/lib/transcript/normalize.test.ts:66) asserts `speaker_index`

### Limitation

This split only helps when Deepgram already detected a speaker change at the word level inside one utterance. It does not solve the harder case where Deepgram collapses two real speakers into the same diarized speaker cluster. That remains P3.

### Verdict

- **`utt_split` direction:** current `utt_split=1` moves the wrong direction for finer segmentation.
- **Normalize safety:** verified. The regrouping preserves the source word timing/confidence/speaker mapping exactly as currently projected into canonical words.

### Next action

- Change request verification target from “Playground matched” to “behaviorally correct.”
- Test `utt_split` at the documented default `0.8` against `1.0` on the same audio before trusting the app-side request alignment.

## P5 — Date/ordinal auto-format behavior vs DP-012 §4b

### Code status

The formatter still auto-strips spoken date ordinals when the previous token is a month name.

Source:
- [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:407)
- Applied in [src/lib/format/cfe.ts](C:/Users/james/projects/depo-pro/src/lib/format/cfe.ts:507)

Current behavior:

- `August 17th` becomes `August 17`
- `May 23rd` becomes `May 23`

### Standards status

Reconciled DP-012 §4b makes date ordinal stripping suggestion-only, not auto-applied. Certified examples retain spoken ordinals.

### Verdict

- **Non-compliant.** The live formatter is still auto-applying a transform that the reconciled standard moved to suggestion-only.

### Next action

Remove automatic ordinal stripping from the live formatter path and, if desired later, reintroduce it only as a reversible suggestion flow rather than a deterministic normalization.

## Consolidated verdict

- **P3:** closed. Docs are clear and the live API check returned `200` with speaker fields present.
- **P7:** verified. `utt_split=1` is directionally wrong for increased segmentation, but normalize splitting preserves canonical word-level timing/confidence/speaker data correctly.
- **P5:** verified regression. Date ordinal stripping is still live in `cfe.ts` and conflicts with reconciled DP-012 §4b.

## Recommended next action

1. Run the next Etminan re-transcription against the corrected Deepgram batch request and compare diarization quality against the prior baseline.
2. Treat P7 as a small follow-up audit/change: test `utt_split=0.8` vs `1.0` and stop assuming the Playground value is correct for this app.
3. Treat P5 as the next standards-compliance code fix: remove auto date-ordinal stripping from the formatter path.
