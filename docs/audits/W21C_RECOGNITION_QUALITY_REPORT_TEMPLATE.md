# W21C Recognition Quality Report Template

Use this template for every Wave 21 benchmark run.

Filename:

`W21_BENCHMARK_RUN_YYYYMMDD.md`

## Run Metadata

- Date:
- Fixture:
- Fixture Class:
- Audio Source:
- Benchmark Owner:
- Comparison Baseline:

## Audio

- Original filename:
- MIME type:
- Duration:
- File size:
- Estimated bitrate:
- Source condition:
- Normalized analysis copy used:

## Deepgram Request

- Model:
- Punctuate:
- Diarization:
- Diarize model:
- Utterances:
- `utt_split`:
- Smart format:
- Filler words:
- Numerals:
- Paragraphs:
- Endpointing:
- Multichannel:
- Keyterm strategy:
- Keyterm count:

## Recognition Metrics

| Metric | Value |
| --- | --- |
| Average confidence |  |
| Speaker count |  |
| Speaker switch count |  |
| Long utterances |  |
| Average utterance length |  |
| Longest utterance |  |
| Overlapping utterances |  |
| Timing gaps |  |
| Low-confidence words |  |
| Attorney name hit rate |  |
| Witness name hit rate |  |
| Domain-term hit rate |  |

## Canonical Intake Metrics

| Metric | Value |
| --- | --- |
| Fallback utterances built |  |
| Speaker-split repairs |  |
| Orphan words |  |
| Speaker continuity anomalies |  |
| Timing integrity warnings |  |

## Semantic Repair Burden

| Repair Type | Count |
| --- | --- |
| Speaker ownership repairs |  |
| Q/A ownership repairs |  |
| Examination transition repairs |  |
| Proceedings repairs |  |
| By-line repairs |  |
| Objection repairs |  |
| Parenthetical repairs |  |

## Production Repair Burden

| Repair Type | Count |
| --- | --- |
| Caption repairs |  |
| Dialogue production repairs |  |
| Structural event repairs |  |
| Geometry-related semantic repairs |  |
| Punctuation cleanup caused by recognition |  |

## Repair Cost Index

- Score:
- Calculation reference: `docs/metrics/REPAIR_COST_INDEX.md`

## Comparison to Baseline

| Category | Baseline | Current | Delta |
| --- | --- | --- | --- |
| Recognition Quality |  |  |  |
| Semantic Repair Burden |  |  |  |
| Production Repair Burden |  |  |  |
| Repair Cost Index |  |  |  |

## Recommendation

- Result: `Adopt` / `Reject`
- Reason:

## Notes

- Observed strengths:
- Observed regressions:
- Follow-up experiments:
