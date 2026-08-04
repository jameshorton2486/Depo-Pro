# ADR-0012 — Witness answers during objection colloquy render as `A.`

**Status:** Accepted
**Date:** 2026-08-03
**Decider:** James (owner)
**Adds:** F11 (new ratified decision)

## Decision

**F11.** When a witness answers during an objection colloquy, the response renders as an **`A.` line**, never as a `THE WITNESS:` speaker-label block.

The `THE WITNESS:` role title (F9) remains valid for genuine colloquy where the witness speaks outside the question-and-answer flow (e.g. addressing the court/reporter). But a witness *answering the pending question* — even one interrupted by or following an objection — is testimony, and testimony is an `A.` line.

## Context

The CSR sample rendered the witness's post-objection answer as `THE WITNESS: I don't recall the exact date.` Correct court format treats that as the answer to the examiner's question, i.e. `A. I don't recall the exact date.`

## Consequences

- The CSR sample in PR #50 must render the post-objection witness answer as `A.`, not `THE WITNESS:`.
- The engine must distinguish "witness answering the pending question" from "witness in free colloquy." This is a structural classification that belongs upstream (with proceedings/region structure, A6), not in the render layer (A8).

## Enforcement

Golden corpus asserts that a witness turn inside an examination (including immediately after an objection ruling) emits `A.`, and that `THE WITNESS:` appears only in non-Q/A colloquy.
