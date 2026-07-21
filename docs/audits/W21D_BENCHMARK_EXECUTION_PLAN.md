# W21D Benchmark Execution Plan

## Authority

- `docs/architecture/W21_RECOGNITION_QUALITY_STANDARD.md`
- `docs/metrics/REPAIR_COST_INDEX.md`

## Purpose

This document defines how Wave 21 benchmarks are executed, compared, and
accepted.

It is the operating manual for recognition-quality benchmarking.

## Benchmark Corpus

The benchmark corpus begins with:

- `Fixture 001 – Etminan`

It must expand to include:

- `Fixture 002 – Treating physician`
- `Fixture 003 – Corporate representative`
- `Fixture 004 – Interpreter deposition`
- `Fixture 005 – Multiple attorneys`
- `Fixture 006 – Multi-day deposition`
- `Fixture 007 – Poor audio`

## Benchmark Order

Wave 21 benchmark execution should proceed in this order:

1. establish the current baseline on `Fixture 001`
2. run the request-configuration matrix on `Fixture 001`
3. select the most promising variants
4. validate those variants across the corpus
5. adopt only the variants that reduce RCI across the class of depositions

## Benchmark Procedure

Each experiment run must:

1. identify the fixture
2. document the exact Deepgram request configuration
3. document the audio condition
4. run canonical intake normalization
5. measure recognition metrics
6. measure semantic repair burden
7. measure production repair burden
8. calculate RCI
9. compare against accepted baseline
10. issue an `Adopt` or `Reject` recommendation

## Configuration Matrix

The initial benchmark matrix includes:

### Matrix A: Baseline

- current production request unchanged

### Matrix B: Utterance Segmentation

- `utt_split=0.6`
- `utt_split=0.7`
- `utt_split=0.8`
- `utt_split=0.9`
- `utt_split=1.0`
- `utt_split=1.2`

### Matrix C: Keyterms

- current auto-seed
- expanded intake-derived keyterms
- expanded prioritized keyterms under budget

### Matrix D: Audio

- original source
- normalized WAV analysis copy

### Matrix E: Feature Toggles

- `paragraphs`
- `smart_format`
- `filler_words`
- `numerals`

## Acceptance Criteria

A variant is accepted only if:

1. it does not materially degrade recognition integrity,
2. it reduces RCI versus the accepted baseline, and
3. it does not increase reporter labor elsewhere in the workflow

## Regression Criteria

A variant is rejected if:

- RCI increases,
- semantic repair burden increases,
- production repair burden increases without offsetting structural gains,
- improvements appear only on a single fixture but regress across the corpus

## Acceptance Thresholds

The exact thresholds may evolve as the corpus matures, but initial adoption
should require:

- lower RCI than current accepted baseline
- no critical regression in speaker ownership quality
- no critical regression in examination detection inputs
- no material increase in canonical-intake repair work

## Reporting Requirement

Every benchmark run must use:

- `docs/audits/W21C_RECOGNITION_QUALITY_REPORT_TEMPLATE.md`

Every run must generate:

- `W21_BENCHMARK_RUN_YYYYMMDD.md`

## Ongoing Practice

`W21E – Corpus Benchmarking` is a standing engineering practice.

It is not complete after a single sprint.

Any proposed recognition-layer change must be measured against the current
accepted benchmark baseline before adoption.
