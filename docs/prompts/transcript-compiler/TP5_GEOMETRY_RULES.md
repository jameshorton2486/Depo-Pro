# TP-5 — Geometry Rules

| Field | Value |
|-------|-------|
| **Owner** | TP-5 (Wave 23 producer) |
| **Purpose** | Geometry |
| **Inputs** | Produced Transcript |
| **Outputs** | Rendered Transcript |
| **Consumers** | Wave 24 |

**Layer:** Wave 23 producer `TP-5` (Geometry only)
**Authority:** `Canonical Standards Folder/DP-011_CANONICAL_GEOMETRY_AUTHORITY.md`
**Pipeline:** Produced Transcript → **TP-5** → Rendered Transcript

## Purpose

Lay out the transcript. Geometry **positions**; it never decides content.

**Question answered:** *"How should this semantic element be rendered?"*

## Owns

Tabs · margins · centering · page headers · page footers · line numbers ·
continuations (wrapping / Return-To-Margin / block indent).

---

## Semantic → Geometry map

The semantic layer decides *what* an element is; TP-5 decides only *where it
sits*.

| Semantic element (owner) | Geometry treatment |
|--------------------------|--------------------|
| Caption (W23) | Caption tabs |
| Proceedings (W23) | Proceedings tabs |
| Heading (W23) | Center |
| By-line (W23) | Center |
| Question `Q.` (W22/W23) | Q tabs |
| Answer `A.` (W22/W23) | A tabs |
| Parenthetical (W23) | Parenthetical indent (block indent on wrap) |
| Certification (W23) | Certificate layout |

## Non-negotiable invariants (DP-011)

25 lines/page · 6.5″ text-area width · canonical tab hierarchy ·
Return-To-Margin Continuation (Q/A + colloquy wrap to 0.0″) · parenthetical
block-indent on wrap · canonical speaker-label position · canonical
parenthetical position · line numbers that are visual-only, non-editable,
auto-regenerated, and copy-excluded.

TP-5 never inserts page breaks (that is pagination). A change to any invariant is
a change to the legal shape of the record and requires explicit sign-off.

---

## Never decides

Speaker · `Q.` vs `A.` · proceedings · caption. **It only renders.**
