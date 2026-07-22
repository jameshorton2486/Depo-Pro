# Wave 21 Recognition Quality Standard

## Purpose

This document defines the canonical recognition-quality standard for DEPO-PRO.

Wave 21 governs everything between source audio and the canonical transcript.

Its purpose is not to maximize abstract ASR quality. Its purpose is to
minimize the amount of semantic and document-repair work required downstream by
Wave 22 and Wave 23.

This document is the architectural authority for Wave 21 recognition work.

## Canonical Objective

Wave 21 must answer one question:

`What is the minimum downstream repair burden required to convert source audio into a produced deposition transcript?`

Recognition-quality work is successful only when it reduces downstream labor.

## Canonical Pipeline

The recognition-quality pipeline is:

1. Source audio
2. Deepgram request configuration
3. Deepgram response
4. Canonical intake normalization
5. Canonical transcript
6. Wave 22 semantic runtime
7. Structured transcript contract
8. Wave 23 deposition production engine
9. Produced transcript

Wave 21 owns stages 1 through 5.

## Architectural Position

Wave 21 sits before Wave 22 and Wave 23.

The full transcript pipeline is:

`Audio`
`-> Wave 21 Recognition Quality`
`-> Canonical Transcript`
`-> Wave 22 Semantic Runtime`
`-> Structured Transcript Contract`
`-> Wave 23 Deposition Production Engine`
`-> Produced Transcript`
`-> Workspace / Stage S / DOCX / PDF / TXT`
`-> Reporter Proofreading`
`-> Professional Transcript`

## Governing Principle

The project does not optimize for transcript appearance at the recognition
layer.

The project optimizes for reduced reporter labor.

All Wave 21 configuration changes must therefore be evaluated against their
effect on downstream repair burden, not only against raw ASR output quality.

## Recognition Quality Definition

Recognition quality is the combined quality of:

- lexical recognition
- speaker diarization
- utterance segmentation
- timing integrity
- keyterm recognition
- canonical intake integrity

Recognition quality is measured by both upstream and downstream effects.

## Success Metrics

Wave 21 success requires all of the following:

1. Recognition Quality improves.
2. Repair Cost Index decreases.
3. Reporter correction effort decreases.

No single metric is sufficient by itself.

## Primary KPI

The primary engineering KPI for Wave 21 is:

`Repair Cost Index (RCI)`

RCI is the weighted cost of downstream semantic and production repairs required
after recognition.

RCI is the governing optimization metric for Wave 21.

The mathematical definition lives in:

- `docs/metrics/REPAIR_COST_INDEX.md`

## Secondary Metrics

Wave 21 also tracks secondary metrics, including:

- average utterance duration
- count of long utterances
- merged speaker turns
- missed speaker transitions
- low-confidence word count
- keyterm hit rate
- timing overlaps
- timing gaps
- semantic repair burden
- production repair burden

These metrics support RCI. They do not replace it.

## Benchmark Methodology

Wave 21 is a benchmark-driven engineering program.

No Deepgram or canonical-intake setting should change based on intuition alone.

All configuration changes must be tested against a benchmark matrix and must
produce measurable improvement.

## Adopt / Reject Rule

A recognition-layer change is `Adopt` only if it:

1. improves or preserves recognition quality,
2. reduces Repair Cost Index, and
3. does not increase reporter labor elsewhere in the pipeline.

A recognition-layer change is `Reject` if it merely shifts work downstream or
improves a secondary metric while increasing repair burden.

## Corpus Philosophy

Wave 21 must optimize for legal depositions as a class, not for a single
deposition.

The benchmark corpus begins with `Fixture 001 – Etminan`, but Wave 21 must grow
to cover representative deposition types.

The corpus is the long-term authority for recognition benchmarking.

## Fixture Classes

The target benchmark corpus includes:

- `Fixture 001 – Etminan`
- treating physician
- corporate representative
- interpreter deposition
- multiple-attorney deposition
- multi-day deposition
- poor-audio stress case

These fixtures must represent different recognition and production failure
profiles.

## Current Repository Baseline

The current Deepgram request baseline is defined in:

- `src/lib/deepgram/buildDeepgramRequest.ts`
- `supabase/functions/transcribe-start/index.ts`

Current baseline request parameters are:

- `model=nova-3`
- `punctuate=true`
- `diarize_model=latest`
- `filler_words=true`
- `numerals=true`
- `utterances=true`
- `utt_split=0.8`
- `smart_format=true`
- `language=en`
- `mip_opt_out=true`

Current auto-seeded keyterms derive from:

- witnesses
- attorneys
- case number
- reporter name

The current canonical-intake baseline includes normalization that:

- falls back to word-built utterances when utterances are absent
- splits utterances when speaker changes occur inside a Deepgram utterance
- preserves punctuated words when present

## Wave 21 Workstreams

Wave 21 is divided into the following permanent workstreams:

- `W21A` Deepgram benchmark framework
- `W21B` canonical intake audit
- `W21C` recognition quality reporting
- `W21D` benchmark execution plan
- `W21E` corpus benchmarking

`W21E` is an ongoing operating practice, not a one-time sprint.

## Benchmark Run Requirement

Every benchmark execution must produce a dated benchmark run artifact:

`W21_BENCHMARK_RUN_YYYYMMDD.md`

Each run must include:

- audio description
- Deepgram request configuration
- recognition metrics
- semantic repair burden
- production repair burden
- Repair Cost Index
- comparison to prior baseline
- final recommendation: `Adopt` or `Reject`

## Change Policy

This standard should not change because a benchmark result changes.

Benchmark outcomes may change implementation decisions.

They do not change the standard itself unless the architecture of recognition
quality changes.
