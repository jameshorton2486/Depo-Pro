# W22 — Semantic Rules

| Field | Value |
|-------|-------|
| **Owner** | Wave 22 |
| **Purpose** | Semantics |
| **Inputs** | Canonical Transcript |
| **Outputs** | Structured Transcript Contract |
| **Consumers** | Wave 23 |

**Layer:** Wave 22 Semantic Runtime
**Authority:** `docs/architecture/W22-2A_STRUCTURED_TRANSCRIPT_CONTRACT.md`
**Pipeline:** Canonical Transcript → **W22** → Structured Transcript Contract

## Purpose

Determine what the speech **means** — ownership and role. The words are already
correct (W21); the attribution is what W22 fixes.

**Question answered:** *"Who is speaking, and what is their semantic role?"*

## Owns

- Speaker ownership (witness / reporter / attorney)
- Objection ownership
- Split-question reconstruction
- Semantic reassignment

---

## R22.1 — Reporter misclassification (witness answer)

```
THE REPORTER:
She had a lumbar discectomy.
        ↓
A.
She had a lumbar discectomy.
```

**Disposition.** Reassign to the witness as an answer. Deterministic when
directory resolution is unambiguous; otherwise flag to W26.

## R22.2 — Attorney question misclassified as reporter

```
THE REPORTER:
Can you please state...
        ↓
Question semantic (owned by examining counsel)
```

**Disposition.** Reassign the turn to the examining attorney; it carries
question semantics. The reporter never owns `Q.`/`A.`.

## R22.3 — Objection nested inside an answer

Split the objection out of the `A.` span and give it to the objecting attorney
as its own colloquy turn.

```
MR. RAMON:
Objection. Form.
```

The witness answer then resumes as its own `A.` turn.

## R22.4 — Split-question reconstruction

A single examination question fractured across utterances is reassembled into
one question turn owned by examining counsel.

---

## Does NOT own

Proceedings · caption · headers · by-lines · geometry · the *placement* of
`Q.`/`A.` markers (→ TP-5). W22 emits ownership and role into the contract; it
never positions anything or authors document regions.
