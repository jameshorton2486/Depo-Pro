# Canonical Editorial Policy — Depo-Pro

| Field | Value |
|-------|-------|
| **Status** | APPROVED (capstone policy) |
| **Date** | 2026-06-24 |
| **Scope** | Governs ALL formatting/normalization decisions: every DP-### record, the Canonical Formatting Engine, the AI Structuring Layer, Copy Transcript, DOCX/PDF export, Stage S, and every Codex prompt that touches transcript text. |
| **Precedence** | This is the **top-level policy**. Every DP-### decision record inherits from it. Where a DP record conflicts with this policy, this policy governs and the DP record is corrected. |

---

## The core principle

> **Depo-Pro never silently "improves" a transcript. When the certified transcript, Morson, and the
> UFM disagree, Depo-Pro follows the certified transcript — or makes the difference explicit and
> reviewable. It never quietly substitutes a style preference for the certified record.**

A court reporter's certified transcript is a legal record. The platform's job is to reproduce and
support that record faithfully, not to modernize, beautify, or "correct" it toward an external style
manual. Every formatting rule in this platform is measured against that standard.

---

## 1. Authority hierarchy (binding, in order)

```
1. Certified transcript ground truth   (the Etminan certified record, Miah Bardot CSR 12129)
2. Depo-Pro decision records           (DP-### — must themselves obey this policy)
3. Morson's English Guide / Texas UFM  (external style guides)
```

- A **lower** authority may NEVER override a **higher** one.
- Where the certified record settles a question, that answer governs — even if Morson or the UFM
  would prefer otherwise. (Morson/UFM are adopted **only where they do not conflict** with the
  certified record or an existing DP decision.)
- A DP record that contradicts the certified record is, by definition, **wrong** and must be
  corrected — not treated as having "overridden" the certified record by virtue of being newer.

---

## 2. The three transform classes (decides what an engine may DO)

Every proposed text transform falls into exactly one class. The class determines whether it may be
applied automatically, suggested, or only flagged.

| Class | Definition | Engine behavior |
|-------|------------|-----------------|
| **DETERMINISTIC** | One unambiguous correct output, settled by a clear governing rule AND consistent with the certified record. | May be **auto-applied** by the CFE. |
| **SUGGESTION** | A defensible normalization exists, but it's style-dependent, context-dependent, or diverges from certified practice. | **Suggest only**, reversible, human-confirmed, shipped disabled by default. |
| **JUDGMENT / GARBLE** | Requires interpreting meaning, intent, or uncertain audio; no single deterministic answer. | **Flag, never correct.** Preserve the verbatim token. |

**Test for "deterministic":** if a competent reporter could reasonably render it two different ways,
it is **not** deterministic — it is at most a suggestion. Ambiguity disqualifies auto-apply.

Worked examples (from the F1/F2 reconciliation):
- `fifty-seven → 57` (age, clear governing rule, matches certified) → **DETERMINISTIC**.
- `August 17th → August 17` (certified RETAINS ordinals) → **SUGGESTION** at most; not auto-applied.
- `doctor → Doctor` in direct address (certified uses lowercase; vocative-vs-descriptive is a
  judgment call) → **JUDGMENT**; not auto-applied, flag if anything.
- ASR garble with no authoritative match (`lameness` → likely `layman's`) → **GARBLE**; flag, keep token.

---

## 3. Verbatim preservation (absolute)

- Spoken testimony content is **never** rewritten, deleted, or "cleaned up." Fillers, false starts,
  self-corrections, and repetitions are preserved.
- Transforms operate on the **display/formatting layer** only and must never mutate the canonical
  word/utterance/timing layer (`word_id`, `raw_text`/`original_word`, `start_time`, `end_time`,
  `confidence`, `speaker_id`, word order). Audio sync integrity is sacred.
- A transform that changes token count (e.g. date reformatting) must never break the word-id→timing
  mapping. If it would, it is display-only or it does not happen.

---

## 4. Explicit-override clause (the only sanctioned way to depart from certified)

The owner may choose to adopt a house style that departs from the certified record going forward.
When that happens it must be recorded **as an explicit override**, in a dedicated decision record,
stating:
1. exactly which certified behavior is being departed from,
2. why (the house-style rationale),
3. that it is a deliberate override of authority-rank #1.

An override recorded this way is legitimate. What is **not** legitimate is a DP record that quietly
adopts a Morson/UFM preference *as if it were consistent with* the certified record when it is not —
that is the failure mode this policy exists to prevent.

Even under an explicit override, a transform that is not deterministic (e.g. vocative detection) is
**still suggestion/flag, never auto-apply.**

---

## 5. Drift prevention (enforcement, not just intent)

Prose authority drifts; executable authority does not. Therefore:
- **Standards are backed by a regression suite** (see F9). The certified record's measurable facts
  (spacing counts, lowercase direct-address, retained date ordinals, geometry constants) are encoded
  as tests. A change that violates a frozen standard fails CI.
- **Records and prompts must agree.** When a DP record changes, the operational prompts that cite it
  are updated in the same pass. A record and a prompt that disagree on the same rule is a defect
  (this is exactly how F1/F2 arose — the record flipped, the prompt didn't).
- **The registry is the single source.** Abbreviation/spacing knowledge lives in
  `abbreviation_registry.json`; no module maintains a competing list (see F5).

---

## 6. Conflict-resolution procedure (when a new rule is proposed)

1. Check it against the certified record first. If certified settles it, certified wins.
2. Classify it (§2). If not clearly deterministic, it's suggestion or flag — not auto-apply.
3. If it departs from certified, it requires an explicit override record (§4) or it is rejected.
4. Confirm verbatim/canonical-layer safety (§3).
5. Update the DP record AND its consuming prompts together (§5), and add/extend a regression test.

---

## Directive
1. This policy is the top-level authority; all DP-### records inherit from and must conform to it.
2. Any existing rule that contradicts it is corrected to conform (F1/F2 were the first applications).
3. Cite this policy in new formatting decisions rather than re-deriving the authority hierarchy.
4. Do not change transcript content; this policy governs how rules are decided and applied, not the
   testimony itself.
