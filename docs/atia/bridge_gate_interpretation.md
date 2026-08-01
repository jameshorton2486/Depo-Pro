# Bridge Gate — How to Read the Round-Trip Results

Companion to `scripts/atia_bridge_roundtrip.sh`. When the gate runs against a real
transcript (Garza first, ideally Caram too), read the output with this table so a
weak result routes to the *right* fix — prompt vs. plumbing vs. projection — instead
of a guess.

## Pre-flight (before blaming quality)
- **Step 0 tables missing** → migration `20260729120000_corrections.sql` not applied.
  A missing table 500s the Edge Function with an opaque error that looks identical
  to "no corrections produced." Always rule this out first.
- **Step 1 response has no `"mode":"bridge"`** → `AI_REVIEW_BRIDGE` isn't set on the
  deployed function (deploy-time vs request-time env). The response shape is the flag check.

## Step 5 — cost numbers (correction_runs)
| Signal | Reading | Fix |
|---|---|---|
| `tokens_in` 15–25k | normal for ~15k words | — |
| `tokens_in` > 40k | projection is over-including (audio metadata? confidence detail? raw Deepgram JSON?) | trim the transcript projection **before** touching the prompt |
| `tokens_out` < 500 | model producing very few corrections | prompt problem, not plumbing |
| `tokens_out` > 8k | verbose reasons or extra fields the schema drops | check `rejected_count` to confirm |
| `latency` > 90s (Sonnet) / > 120s (Opus) | transport misconfigured or internal retries | check streaming vs non-streaming in the transport |
| `rejected_count` > 20% of total | schema-alignment issue | iterate the prompt's **output examples**, not the schema |

## Step 2 — correction quality
- **No speaker humanizations** → the prompt isn't treating `SPEAKER 0`/`SPEAKER 1` as
  a humanize signal. Highest-value fix; sharpen the speaker-identity section of
  `transcript_formatter/prompts/bridge/full_review.md`.
- **Humanizations but no Q/A split** → merged-Q/A detection is weak — but first confirm
  the transcript actually contains a clear merged Q/A. Garza may have few; Caram has more.
- **Corrections present but odd shapes** → cross-check `rejected_count`; the prompt is
  producing well-intentioned output that misses the contract.

## Step 3/4 — apply
- `applied: true` with `review.state: "accepted"` → **round-trip proven end to end**,
  regardless of correction quality. Panel work becomes safe.
- `applied: false` + `pending_reason: "structural_apply_engine_v2"` → expected for
  `qa_split` and other structural types (accepted, apply deferred — not a failure).
- `applied: false` + `apply_error` set → apply-engine bug or permissions; plumbing, not prompt.

## Run two transcripts, not one
Garza (auto/MVP profile) and **Caram** (med-mal: more polyhydramnios-type medical
terminology, more explicit objections) stress different parts of the bridge prompt.
Two green results is a much stronger quality signal than one. If one is good and the
other weak, the delta tells you what the prompt is sensitive to.

## Branch after the gate
- **Quality there** → 64-file archive (own atomic commit, clean tree) → panel PR
  (+ `client.ts`/`workspaceService` wiring, visually distinct from deterministic flags).
- **Quality weak** → iterate `bridge/full_review@v1` → re-run script → re-gate.
