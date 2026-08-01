# Deepgram Transcription Benchmark

## Purpose

The benchmark is an analysis-only developer tool for comparing transcription configurations against a certified transcript. It does not write transcript data, save benchmark history, or change production defaults.

Production remains independently configured. A benchmark recommendation is evidence for human review, never an automatic settings update.

## Five-pass methodology

`benchmark.json` defines the candidate `utt_split` values, invariant Deepgram parameters, keyterms, and scoring weights. Before each request, `BenchmarkBatchRunner` verifies that `utt_split` is the only changing request parameter. Every successful response follows the same path:

1. Convert the Deepgram response to the benchmark transcript model.
2. Run the existing Stage S validation and repair-burden measurement.
3. Compare the reconstructed transcript with the certified transcript.
4. Calculate recognition, speaker, legal-structure, repair, and editing metrics.
5. Include the result in one consolidated Markdown, JSON, and CSV report.

Candidate failures are recorded without preventing later candidates from running. A transient transport failure receives one bounded retry.

## Running from the UI

The Benchmark screen is available only in Vite developer mode from the Case Browser.

1. Select the source audio or video.
2. Select its matching `.docx` or `.txt` certified transcript.
3. Enter a Deepgram API key. The key remains in component memory and is not exported.
4. Review the configuration.
5. Select **Run Five-Pass Benchmark**.
6. Download `DeepgramBenchmark.md`, `DeepgramBenchmark.json`, and `benchmark_scores.csv`.

## Running from PowerShell

The CLI reads `DEEPGRAM_API_KEY` from the process environment or the selected `.env` file without printing it.

```powershell
node scripts/run-five-pass-benchmark.mjs `
  --audio C:\private-corpus\audio.m4a `
  --certified C:\private-corpus\certified.docx `
  --configuration benchmark.json `
  --output C:\private-corpus\benchmark-output
```

Never place real deposition audio, certified transcripts, or generated reports in Git. `benchmark-corpus/manifest.json` contains metadata placeholders only; private corpus paths are supplied at runtime.

## Scoring

Weights are configuration-owned rather than compiled into the application:

| Category | Default weight |
| --- | ---: |
| Word accuracy | 20 |
| Q/A recovery | 20 |
| Speaker accuracy | 15 |
| Reconstruction | 15 |
| Paragraph quality | 10 |
| Objection recovery | 10 |
| Colloquy recovery | 5 |
| Editing cost | 5 |

If the two leading scores are within 0.5 points, the recommendation prefers fewer Stage S repairs, then lower estimated editing time, then higher speaker accuracy.

Do not change weights in response to one deposition. First determine whether the same tradeoff repeats across a representative certified corpus.

## Integrity and repeatability

Every report records SHA-256 hashes for the audio, certified transcript, and complete configuration. The runner is deterministic when its provider response is identical.

Deepgram responses may vary slightly across repeated requests using the same inputs. Provider variability must be measured separately from application determinism. For consequential configuration decisions:

1. Repeat the same candidate several times.
2. Record the observed range for WER, speaker accuracy, repairs, editing estimate, and overall score.
3. Compare candidate score differences with that variability range.
4. Require consistent results across multiple deposition categories before changing production.

## Keyterms

Keyterms are part of the invariant configuration and must be identical for every candidate in a batch. A production-representative benchmark should include case-specific names, organizations, medical or technical terms, and other terms that the normal transcription request would upload.

An empty keyterm list is valid for framework verification but is not sufficient to characterize production performance.

## Regression corpus

Build and maintain an access-controlled private corpus that includes clean in-person testimony, remote testimony, difficult audio, multiple attorneys, objections, crosstalk, specialized terminology, telephone participants, and interpreters. Keep only synthetic or de-identified metadata in this repository.

Run the unchanged benchmark before and after Deepgram model updates, request-parameter changes, Stage S modifications, or reconstruction changes. Preserve each accepted baseline report and its input hashes outside Git.

## Production boundary

The benchmark must not:

- call production transcription orchestration;
- write production transcript, audit, review, speaker, or cache records;
- persist benchmark history to Supabase;
- update `transcribe-start`;
- update application defaults; or
- apply its recommendation automatically.

Production `utt_split` remains `1.0` until a separately reviewed corpus-level decision approves a change.
