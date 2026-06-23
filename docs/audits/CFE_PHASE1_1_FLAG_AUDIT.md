# CFE Phase 1.1 Flag Classification Audit

Date: 2026-06-23  
Branch: `feature/stage3-workspace-core`  
Mode: read-only audit

## Scope

This audit reproduces the current `cfe()` output against `etminan_response.json` and inspects every word that received an inline garble flag.

Dataset summary:

- total flagged word occurrences: `499`
- unique flagged tokens: `260`
- top-50 unique tokens cover: `270 / 499` flagged occurrences (`54.1%`)

## Classification Method

The token classes used here are:

- `FUNCTION_WORD`
- `COMMON_WORD`
- `PROPER_NOUN`
- `MEDICAL_TERM`
- `LEGAL_TERM`
- `ORGANIZATION`
- `OTHER`

This report classifies the top 50 unique flagged tokens manually from the extracted current-HEAD output. For suppression design, the top-50 list is the important signal because it captures the majority of all flag events and shows that the current noise problem is dominated by grammar words, not domain terms.

## Top 50 Flagged Tokens

| Rank | Token | Count | Avg. Confidence | Classification |
|---|---|---:|---:|---|
| 1 | `the` | 16 | 0.5434 | `FUNCTION_WORD` |
| 2 | `a` | 16 | 0.5705 | `FUNCTION_WORD` |
| 3 | `and` | 15 | 0.5803 | `FUNCTION_WORD` |
| 4 | `I` | 13 | 0.5784 | `FUNCTION_WORD` |
| 5 | `of` | 12 | 0.5376 | `FUNCTION_WORD` |
| 6 | `that` | 11 | 0.5228 | `FUNCTION_WORD` |
| 7 | `you` | 10 | 0.5030 | `FUNCTION_WORD` |
| 8 | `it` | 10 | 0.5500 | `FUNCTION_WORD` |
| 9 | `miss` | 10 | 0.5714 | `COMMON_WORD` |
| 10 | `this` | 9 | 0.5804 | `FUNCTION_WORD` |
| 11 | `is` | 8 | 0.5351 | `FUNCTION_WORD` |
| 12 | `because` | 8 | 0.5380 | `FUNCTION_WORD` |
| 13 | `as` | 8 | 0.5530 | `FUNCTION_WORD` |
| 14 | `at` | 7 | 0.5176 | `FUNCTION_WORD` |
| 15 | `or` | 7 | 0.5760 | `FUNCTION_WORD` |
| 16 | `to` | 6 | 0.5576 | `FUNCTION_WORD` |
| 17 | `in` | 6 | 0.6236 | `FUNCTION_WORD` |
| 18 | `And` | 5 | 0.5393 | `FUNCTION_WORD` |
| 19 | `so` | 5 | 0.5685 | `FUNCTION_WORD` |
| 20 | `on` | 5 | 0.5897 | `FUNCTION_WORD` |
| 21 | `disc` | 4 | 0.5101 | `MEDICAL_TERM` |
| 22 | `when` | 4 | 0.5417 | `FUNCTION_WORD` |
| 23 | `your` | 4 | 0.5869 | `FUNCTION_WORD` |
| 24 | `K.` | 4 | 0.6818 | `OTHER` |
| 25 | `just` | 3 | 0.4568 | `COMMON_WORD` |
| 26 | `essentially` | 3 | 0.4613 | `COMMON_WORD` |
| 27 | `her` | 3 | 0.5090 | `FUNCTION_WORD` |
| 28 | `This` | 3 | 0.5142 | `FUNCTION_WORD` |
| 29 | `be` | 3 | 0.5152 | `FUNCTION_WORD` |
| 30 | `Not` | 3 | 0.5259 | `FUNCTION_WORD` |
| 31 | `doctor` | 3 | 0.5262 | `MEDICAL_TERM` |
| 32 | `for` | 3 | 0.5279 | `FUNCTION_WORD` |
| 33 | `but` | 3 | 0.5318 | `FUNCTION_WORD` |
| 34 | `he` | 3 | 0.5348 | `FUNCTION_WORD` |
| 35 | `an` | 3 | 0.5474 | `FUNCTION_WORD` |
| 36 | `What` | 3 | 0.5688 | `FUNCTION_WORD` |
| 37 | `if` | 3 | 0.5928 | `FUNCTION_WORD` |
| 38 | `my` | 3 | 0.6167 | `FUNCTION_WORD` |
| 39 | `like` | 3 | 0.6606 | `COMMON_WORD` |
| 40 | `had` | 2 | 0.2692 | `FUNCTION_WORD` |
| 41 | `not` | 2 | 0.3565 | `FUNCTION_WORD` |
| 42 | `their` | 2 | 0.3730 | `FUNCTION_WORD` |
| 43 | `know` | 2 | 0.4246 | `COMMON_WORD` |
| 44 | `say` | 2 | 0.4502 | `COMMON_WORD` |
| 45 | `first` | 2 | 0.4668 | `COMMON_WORD` |
| 46 | `me` | 2 | 0.4994 | `FUNCTION_WORD` |
| 47 | `Could` | 2 | 0.5005 | `FUNCTION_WORD` |
| 48 | `It` | 2 | 0.5122 | `FUNCTION_WORD` |
| 49 | `from` | 2 | 0.5276 | `FUNCTION_WORD` |
| 50 | `out` | 2 | 0.5424 | `COMMON_WORD` |

## Counts By Class

Counts below are exact across the top-50 unique flagged tokens shown above.

| Class | Flagged Occurrences |
|---|---:|
| `FUNCTION_WORD` | 232 |
| `COMMON_WORD` | 27 |
| `MEDICAL_TERM` | 7 |
| `OTHER` | 4 |
| `PROPER_NOUN` | 0 |
| `LEGAL_TERM` | 0 |
| `ORGANIZATION` | 0 |

## Notable Tail Tokens Outside The Top 50

The low-frequency tail still contains some real review-worthy items, but each appears only once or twice:

- `Rico`
- `Laura`
- `Lee`
- `LeGrande.`
- `PLLC,`
- `PLLC`
- `witness`
- `Rules`

This matters because the current flagger is not exclusively wrong. It does catch some proper nouns, organization names, and domain terms. The problem is that those meaningful flags are swamped by stopwords and discourse words.

## Findings

### 1. The noise problem is overwhelmingly grammatical

The top of the list is dominated by:

- articles: `the`, `a`
- conjunctions: `and`, `or`, `because`
- pronouns: `I`, `you`, `it`, `her`, `he`, `me`
- prepositions: `of`, `at`, `to`, `in`, `on`, `from`

That is not garble-review behavior. That is low-confidence-token echoing.

### 2. The current flagger does catch some real review candidates

Examples:

- `disc`
- `doctor`
- `Rico`
- `Laura`
- `PLLC`

So the right Phase 1.1 move is not “turn off inline flags.” It is “suppress low-value classes and preserve domain-sensitive ones.”

### 3. The current threshold is surfacing high-volume low-value tokens

Several highly repeated function words were flagged at middling, not catastrophic, confidence:

- `the` average confidence `0.5434`
- `a` average confidence `0.5705`
- `and` average confidence `0.5803`
- `I` average confidence `0.5784`

That supports a class-aware suppression rule more than a simple threshold bump.

## Recommendation For Suppression Rules

### Recommendation 1

Suppress inline flags for `FUNCTION_WORD` by default.

Rationale:

- This single change would remove the majority of current noise.
- The top-50 sample alone shows `232 / 270` flagged occurrences are function words.

### Recommendation 2

Suppress inline flags for high-frequency `COMMON_WORD` unless they occur inside a flagged multi-word run with a nearby domain-sensitive token.

Examples:

- `miss`
- `just`
- `essentially`
- `like`
- `know`

These may still matter occasionally, but almost never justify standalone scopist flags.

### Recommendation 3

Preserve inline flags for:

- `PROPER_NOUN`
- `MEDICAL_TERM`
- `LEGAL_TERM`
- `ORGANIZATION`

Examples from this corpus:

- names: `Rico`, `Laura`, `Lee`
- org markers: `PLLC`
- domain terms: `disc`, `doctor`, `witness`, `Rules`

These are the classes most likely to represent real transcript risk.

### Recommendation 4

Route `OTHER` through a narrower rule, not a blanket rule.

Examples:

- keep if token is an all-caps acronym, alphanumeric identifier, or obvious fragment near domain tokens
- suppress if token is just a discourse artifact like `K.`

### Recommendation 5

Prefer context-window flagging over isolated token flagging.

Instead of:

```text
Will [SCOPIST FLAG]
be [SCOPIST FLAG]
the [SCOPIST FLAG]
```

prefer:

- one grouped flag for a suspicious phrase containing a proper noun, acronym, or domain term
- no flags for adjacent stopwords unless they participate in the uncertain phrase

## Bottom Line

The Etminan audit confirms that the current Phase 1 inline-flag behavior is over-broad.

The dominant failure mode is:

- low-confidence function words being promoted into scopist flags

The safest Phase 1.1 direction is:

- suppress `FUNCTION_WORD`
- strongly suppress standalone `COMMON_WORD`
- keep `PROPER_NOUN`, `MEDICAL_TERM`, `LEGAL_TERM`, and `ORGANIZATION`
- narrow `OTHER` to explicit high-risk patterns only
