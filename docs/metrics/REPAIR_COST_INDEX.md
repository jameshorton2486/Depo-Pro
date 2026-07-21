# Repair Cost Index

## Purpose

Repair Cost Index, or `RCI`, is the primary engineering KPI for Wave 21.

It measures the weighted downstream cost of turning recognition output into a
usable produced transcript.

RCI exists to align technical optimization with the real product objective:

`Minimize reporter labor.`

## Definition

`RCI = Σ(weight × occurrences)`

Each repair type has a predefined weight representing its relative cost to
downstream semantic processing, document production, and reporter correction
effort.

## Weight Table

| Repair Type | Weight |
| --- | --- |
| Examination transition | 10 |
| Speaker ownership | 8 |
| Q/A ownership | 8 |
| By-line | 6 |
| Proceedings | 5 |
| Objection | 5 |
| Parenthetical | 4 |
| Caption | 3 |
| Geometry | 2 |
| Punctuation | 1 |

## Interpretation

Higher-weight repairs represent failures that are more structurally expensive to
fix.

Examples:

- an examination transition failure is more costly than punctuation cleanup
- speaker ownership failure is more costly than caption cleanup
- Q/A ownership failure is more costly than geometry adjustment

## Use

RCI is used to compare benchmark variants.

A recognition-layer configuration is better only if it lowers RCI without
causing unacceptable regressions elsewhere.

## Example

If a run produces:

- `2` examination transition repairs
- `3` speaker ownership repairs
- `4` punctuation repairs

Then:

`RCI = (2 × 10) + (3 × 8) + (4 × 1) = 48`

## Governance

The weight table is part of the Wave 21 recognition standard.

It should not change casually.

If experience shows that the weights do not reflect real reporter effort, the
change should be deliberate and documented so benchmark comparisons remain
meaningful over time.
