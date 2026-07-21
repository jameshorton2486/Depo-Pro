# W21A Deepgram Benchmark Framework

## Authority

- `docs/architecture/W21_RECOGNITION_QUALITY_STANDARD.md`

If this framework conflicts with the Wave 21 standard, the standard wins.

## Purpose

This document defines the benchmark framework used to evaluate Deepgram request
configuration changes.

It does not authorize configuration changes by itself.

## Current Baseline Inventory

The current production request is defined in:

- [src/lib/deepgram/buildDeepgramRequest.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/buildDeepgramRequest.ts)
- [supabase/functions/transcribe-start/index.ts](/C:/Users/james/projects/depo-pro/supabase/functions/transcribe-start/index.ts)

### Current Request Parameters

| Parameter | Current Value |
| --- | --- |
| `model` | `nova-3` |
| `punctuate` | `true` |
| `diarize_model` | `latest` |
| `filler_words` | `true` |
| `numerals` | `true` |
| `utterances` | `true` |
| `utt_split` | `0.8` |
| `smart_format` | `true` |
| `language` | `en` |
| `mip_opt_out` | `true` |

### Current Omissions to Audit

The current request does not explicitly benchmark:

- `paragraphs`
- explicit endpoint settings
- explicit diarization enable/disable mode
- multichannel strategy
- audio transcoding or normalization prior to submission
- richer intake-derived keyterm generation

## Existing Keyterm Strategy

Current auto-seeded keyterms derive from:

- witness names
- attorney names
- case number
- reporter name

Current logic is implemented in:

- [src/lib/keyterms/autoSeedKeyterms.ts](/C:/Users/james/projects/depo-pro/src/lib/keyterms/autoSeedKeyterms.ts)
- [src/lib/deepgram/requestBudget.ts](/C:/Users/james/projects/depo-pro/src/lib/deepgram/requestBudget.ts)

## Benchmark Objective

The benchmark objective is not to maximize a single Deepgram metric.

The benchmark objective is to minimize downstream repair burden, measured
primarily through Repair Cost Index.

## Configuration Variables

The benchmark framework evaluates the following variable groups.

### Group 1: Utterance Segmentation

Variables:

- `utterances`
- `utt_split`
- any explicit endpointing controls adopted later

Question:

Does the setting reduce merged turns and downstream semantic repair?

### Group 2: Keyterm Strategy

Variables:

- current auto-seed baseline
- expanded intake-derived keyterms
- prioritized legal/medical term sets

Question:

Does the setting improve named-entity and domain-term recognition enough to
reduce repair burden?

### Group 3: Audio Strategy

Variables:

- original source submission
- normalized WAV analysis copy
- other standardized analysis formats if later justified

Question:

Does audio normalization reduce downstream repair cost enough to justify
pipeline complexity?

### Group 4: Feature Matrix

Variables to benchmark:

- `paragraphs`
- `smart_format`
- `filler_words`
- `numerals`

Question:

Does each feature materially improve legal deposition recognition when measured
by downstream repair burden?

## Benchmark Experiments

### Experiment 1: Baseline

Run the current production configuration unchanged.

This establishes the comparison baseline.

### Experiment 2: Utterance Matrix

Hold all other settings constant and run an `utt_split` matrix.

Suggested initial matrix:

- `0.6`
- `0.7`
- `0.8`
- `0.9`
- `1.0`
- `1.2`

### Experiment 3: Keyterm Matrix

Compare:

- current auto-seed only
- expanded intake-derived keyterms
- expanded keyterms with budget prioritization

### Experiment 4: Audio Matrix

Compare:

- original source file
- normalized WAV analysis copy

### Experiment 5: Feature Matrix

Compare targeted feature toggles one at a time.

Initial matrix:

| Feature | Baseline | Variant |
| --- | --- | --- |
| `paragraphs` | off | on |
| `smart_format` | on | off |
| `filler_words` | on | off |
| `numerals` | on | off |

## Benchmark Evaluation Rules

Each benchmark result must be evaluated in this order:

1. recognition integrity
2. canonical intake integrity
3. semantic repair burden
4. production repair burden
5. Repair Cost Index

No configuration change may be adopted because it makes the transcript look
cleaner while increasing repair burden.

## Required Metrics

Each experiment must report at least:

- average confidence
- speaker count
- speaker-transition errors
- average utterance duration
- long utterance count
- overlap count
- gap count
- keyterm hit rate
- semantic repair burden
- production repair burden
- Repair Cost Index

## Success Criteria

A benchmark variant is successful only when it:

- preserves or improves recognition quality, and
- lowers Repair Cost Index versus the accepted baseline

## Deliverables

Wave 21 benchmark executions must generate:

- `W21_BENCHMARK_RUN_YYYYMMDD.md`

Using:

- `docs/audits/W21C_RECOGNITION_QUALITY_REPORT_TEMPLATE.md`

## Current Recommendation

Do not change production Deepgram settings yet.

Use this framework first to measure the current request against Etminan and the
future corpus fixtures.

## Executable scorer

`src/lib/deepgram/recognitionBenchmark.ts` provides the deterministic scoring layer for approved synthetic or de-identified benchmark packets. It reports word error rate, keyterm phrase recall, speaker confusion rate, and manual corrections per thousand reference words. Benchmark media and reference transcripts remain outside the repository unless they are fully synthetic.

Every production comparison must record the effective request artifact saved by `transcribe-start`, including the audio profile, expected speaker count, language, diarizer, and utterance split. A configuration change is accepted only when it reduces repair burden on the representative corpus without materially degrading keyterm recall or speaker attribution.
