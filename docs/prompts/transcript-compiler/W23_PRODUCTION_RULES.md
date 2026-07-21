# W23 — Production Rules

| Field | Value |
|-------|-------|
| **Owner** | Wave 23 |
| **Purpose** | Deposition Production |
| **Inputs** | Structured Transcript Contract |
| **Outputs** | Produced Transcript |
| **Consumers** | TP-5 Geometry |

**Layer:** Wave 23 Deposition Production Engine
**Authority:** `docs/architecture/W23_REGION_MODEL.md`
**Pipeline:** Structured Transcript Contract → **W23** → Produced Transcript

## Purpose

Construct the legal deposition **document** from the semantic contract.

**Question answered:** *"How should this deposition appear?"*

## Region model (canonical order, never reordered)

```
Caption → Proceedings → Examination → Testimony → Certification
```

No produced block spans two regions (Region Isolation); a classified block does
not migrate regions without an explicit architectural decision (Region
Immutability). Producers: `TP-0` region classification · `TP-0.5A` caption ·
`TP-0.75` proceedings metadata · `TP-1` proceedings events · `TP-2` examination
transitions · `TP-3` dialogue · `TP-4` structural events · `TP-5` geometry.

---

## Owns

### Caption (TP-0.5A)
Cause number · court · parties · appearances. Produced from `CaseRecord` /
Stage 1 intake metadata — **never inferred from audio** when metadata exists.

### Proceedings (TP-0.75 / TP-1)
Videographer opening · reporter opening · oath · commencement · on-the-record
date/time · agreement request. This is **production, not correction** — the
proceedings state owns reconstruction.

### Examination (TP-2)
`EXAMINATION` heading · `BY MR. BENTLEY` by-line. By-lines render as
`(BY MR. ___)` **with no colon** (DP-012 §9; supersedes `(BY: MR. JENKINS)`).

### Dialogue (TP-3)
`Q.` · `A.` · attorney colloquy · reporter colloquy.

### Structural events (TP-4)
`(The witness was sworn.)` · `(Whereupon, the deposition commenced.)` ·
`(Exhibit 1 marked.)`

### Certification
Reporter certificate · Rule 203 · signature / changes-and-signature back matter.
Never processed as testimony.

---

## Does NOT own

Recognition (→ W21) · semantics/ownership (→ W22, supplied in the contract) ·
geometry (→ TP-5) · punctuation (→ W25) · AI (→ W26).
