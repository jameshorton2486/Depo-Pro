# CFE Fidelity Validation

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only fidelity audit

## Corpus Availability

### Available real transcript artifact

- `etminan_response.json`
  - usable Deepgram response with `results.utterances` and per-word timings/confidence

### Missing or invalid for this audit

- `Heath Thomas transcript`
  - not present in this workspace as a transcript artifact
  - only fixture conventions and NOD/intake references were found
- `Garza transcript`
  - no valid Garza transcript artifact found in this workspace
  - `scripts/fixtures/garza-home-depot.txt` is a notice/intake document, not a transcript
  - `parity_job.json` is not a Garza transcript; it is Etminan content bound to Garza case metadata, so it is not valid for transcript-fidelity evaluation

## Scope of Validation

Actual formatter fidelity could be evaluated only against the Etminan response artifact.

Where a requested rule was not observable in the available real transcript corpus, that rule is marked `UNVALIDATED IN REAL CORPUS` rather than guessed.

## Successes

### 1. Honorific Formatting

Observed in Etminan:

Before:

```text
Good afternoon, doctor.
```

After:

```text
Q. Good afternoon, Doctor.  Can you please state your name for the record?
```

Expected:

```text
Direct-address title capitalized under DP-012 §5.
```

Verdict: `PASS`

Notes:
- Descriptive usage also remained lower-case where not in direct address.
- Example observed: `This is the beginning of the deposition of doctor Mohammad ...`

### 2. Sentence Spacing

Observed in Etminan:

Before:

```text
Do you understand that? Yes.
```

After:

```text
Q. Do you understand that?  Yes.
```

Expected:

```text
Two spaces after a sentence-ending question mark.
```

Verdict: `PASS`

### 3. Honorific / Abbreviation Spacing

Observed in Etminan:

Before:

```text
M. D. Will the court reporter ...
```

After:

```text
SPEAKER 0:  M. D. Will [SCOPIST: FLAG 1: "Will" — verify from audio] the court reporter ...
```

Expected:

```text
One-space abbreviation behavior retained; no false sentence-boundary doubling after abbreviation periods.
```

Verdict: `PASS`

### 4. Context-Sensitive `No.` Handling

Observed in Etminan:

Before:

```text
1991. No. No. No. I'm sorry. 2001.
```

After:

```text
A. No.  No.  No. I'm sorry. 2001.
```

Expected:

```text
Sentence-boundary `No.` remains double-spaced when used as spoken “No,” not collapsed into abbreviation spacing.
```

Verdict: `PASS`

### 5. Direct-Address Capitalization

Observed in Etminan:

Before:

```text
And, doctor Etminan, my name is Dennis Bentley.
where is your practice located at, doctor?
```

After:

```text
Q. And, Doctor Etminan, my name is Dennis Bentley.  I represent the plaintiff ...
Q. where is your practice located at, Doctor?
```

Expected:

```text
Direct-address titles capitalized under DP-012 §5.
```

Verdict: `PASS`

### 6. Inline Garble Flags

Observed in Etminan:

Before:

```text
Rico Laura Alessandro Vargas, PLLC, PLLC, PLLC
```

After:

```text
Q. Rico [SCOPIST: FLAG 1: "Rico" — verify from audio] Laura [SCOPIST: FLAG 2: "Laura" — verify from audio] Alessandro Vargas, PLLC, [SCOPIST: FLAG 3: "PLLC," — verify from audio] ... [LOW_CONFIDENCE]
```

Expected:

```text
Verbatim token preserved; inline scopist flag appended; no silent correction.
```

Verdict: `PASS`

## Unvalidated In Real Corpus

### 1. Question Mark Placement Inside vs Outside Closing Quote

Requested rule:

- DP-012 §2

Corpus result:

- No clear quoted-question example matching the ratified `August 17th?" -> August 17"?` pattern was found in the available Etminan artifact.

Verdict: `UNVALIDATED IN REAL CORPUS`

### 2. Date Normalization

Requested rule:

- DP-012 §4

Corpus result:

- Available Etminan examples use numeric dates (`04/24/2026`, `09/15/2023`) rather than spoken month-day ordinals such as `August 17th`.
- No real-corpus positive transformation example was available.

Verdict: `UNVALIDATED IN REAL CORPUS`

### 3. Age / Number Normalization

Requested rule:

- DP-012 §4

Corpus result:

- The Etminan artifact already contains numeric ages (`57`, `12 or 13 years old`) rather than spoken-word forms such as `fifty-seven years old`.
- The formatter preserved those numeric forms correctly, but no real-corpus positive word-to-figure transformation was available.

Verdict: `UNVALIDATED FOR POSITIVE TRANSFORM IN REAL CORPUS`

## Unexpected Behavior

### 1. Over-Flagging of Low-Confidence Function Words

Observed:

```text
What [SCOPIST: FLAG 1: "What" — verify from audio] is a doctor patient relationship? [LOW_CONFIDENCE]
```

and

```text
Will [SCOPIST: FLAG 1: "Will" — verify from audio] the court reporter be [SCOPIST: FLAG 2: "be" — verify from audio] ...
```

Assessment:

- The current implementation appears to flag every low-confidence token inline, including common function words.
- That is broader than the intended “suspected garble” behavior described in DP-012 §6.
- This is not a Layer-1 integrity issue, but it is likely too noisy for production formatting output.

Disposition: `REGRESSION / TUNING REQUIRED`

### 2. Direct-Address Capitalization Diverges From Historical Etminan Certified Style

Observed:

- raw Etminan content contains lower-case `doctor` in direct address
- formatter now outputs capitalized `Doctor`

Assessment:

- This is aligned with the frozen standards set (`DP-012 §5`)
- It is therefore not a standards-compliance defect
- But it is a deliberate divergence from the historical Etminan transcript style that originally informed earlier decisions

Disposition: `EXPECTED UNDER CURRENT STANDARDS`

## Regressions

### 1. Fidelity Coverage Limited by Corpus Gaps

- No real Heath Thomas transcript artifact available
- No valid Garza transcript artifact available
- This reduces confidence in cross-case generalization for Phase 1 behavior

Disposition: `CORPUS GAP, NOT CODE DEFECT`

## Summary Table

| Rule | Etminan | Heath Thomas | Garza | Result |
|---|---|---|---|---|
| Honorific formatting | Observed | Missing | Missing | `PASS on Etminan only` |
| Sentence spacing | Observed | Missing | Missing | `PASS on Etminan only` |
| Question mark placement | Not observed | Missing | Missing | `UNVALIDATED` |
| Date normalization | Not observed | Missing | Missing | `UNVALIDATED` |
| Age/number normalization | Partially observed, no positive transform | Missing | Missing | `PARTIAL / UNVALIDATED` |
| Direct-address capitalization | Observed | Missing | Missing | `PASS on Etminan only` |
| Inline garble flags | Observed | Missing | Missing | `PASS with noise regression` |

## Bottom Line

The current CFE Phase 1 implementation shows real-corpus success on Etminan for:

- sentence spacing
- abbreviation/honorific spacing
- context-sensitive `No.` handling
- direct-address capitalization
- inline flag rendering

However, this fidelity pass also surfaced one important production risk:

- inline garble flagging is currently too aggressive and appears to treat generic low-confidence words as garbles

And one major audit limitation remains:

- the requested Heath Thomas and Garza transcript artifacts are not actually available in this workspace as valid transcript inputs, so the real-corpus fidelity check is narrower than the prompt intended.
