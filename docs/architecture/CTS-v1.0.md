# Canonical Transcript Specification (CTS)

**Version:** 1.0
**Status:** Companion to DTAS v1.0. Defines the **canonical object model** — the nouns of the transcript system. Level 1 of the Depo-Pro Architecture Specification (DPAS).
**Scope of this document:** *Objects only.* CTS defines **what canonical objects exist, their identities, their relationships, and their invariants.** It contains no schema, no code, no serialization format, no processing behavior, and no transformation semantics. Those live in the companion documents. The governing rule of that boundary: **CTS describes what a transcript is made of, never how it is built or stored.**
**Implements:** DTAS v1.0 (this specification is subordinate to every DTAS Law; where they appear to conflict, DTAS wins and CTS is the defect).
**Evidence base:** the current-state audit of the render pipeline and `TRANSCRIPT_PIPELINE_REPORT.md`. CTS abstracts the objects those documents observed in code; it does not reference their tables or fields.

---

## 0. Relationship to the specification set

DTAS asks *why*. CTS asks *what exists*. The layers below CTS ask *where* (DPS) and *what a transformation is* (DTS), and *how it is built* (Implementation Specification).

| Document | Question | This document's relationship |
|---|---|---|
| DTAS | Why is the architecture organized this way? | CTS is subordinate to it |
| **CTS** *(this)* | **What objects exist, and what are their identities, relationships, and invariants?** | — |
| DPS | Where do transformations happen? | consumes CTS's objects |
| DTS | What is a transformation? | operates on CTS's objects |
| Implementation Spec | How is it built (schema, code)? | realizes CTS's objects |

CTS is the **shared vocabulary**: every other document, and every implementation, speaks in the objects defined here. A term used elsewhere that is not defined here is undefined.

---

## 1. Preamble — why an object model

DTAS's First Principle is that *every fact exists exactly once; every other representation is a reference, a derivation, or an overlay.* That principle is only enforceable if the "facts" and the "everything else" have **named, bounded objects** with stated invariants. CTS provides those names and invariants so that "reference," "derivation," and "overlay" have precise referents.

CTS is deliberately small. It names the canonical objects, assigns each to one of DTAS's three classes, states what makes each valid, and defines how they relate. It stops there.

---

## 2. The three object classes (from DTAS §5)

Every CTS object belongs to **exactly one** class. The class fixes the object's mutability and reversibility; it is not a stylistic label.

- **Immutable** — evidence. Admitted once from recognition; never edited (DTAS Laws 2, 3). The source of truth.
- **Derived** — regenerable. Computed from immutable objects plus overlays; disposable; never a source of truth (Law 5).
- **Overlay** — authored. Human or AI additions layered on top of evidence; always removable to recover the original (Laws 6, 7, 11).

An object's class is stated in its definition below and is itself an invariant: an object may not change class.

---

## 3. The object catalog

Each object is defined by: **Class**, **Definition**, **Identity**, **Invariants**, **Relationships**.

### 3.1 Immutable objects (recognition evidence)

#### 3.1.1 Word Token
- **Class:** Immutable.
- **Definition:** The smallest unit of evidence — a single recognized word, with its recognized text, its start and end time, its confidence, and a reference to the Acoustic Speaker who uttered it.
- **Identity:** Persistent (§4). A Word Token's identity never changes and is never reused.
- **Invariants:**
  - Its recognized text is verbatim and never edited (a correction is an Overlay, §3.3.2).
  - Nothing is discarded: verbal fillers, disfluencies, and low-confidence tokens are Word Tokens like any other (Law 3).
  - Confidence lies in [0, 1]; start time ≤ end time.
  - Belongs to exactly one Utterance and is attributed to exactly one Acoustic Speaker.
- **Relationships:** *belongs-to* one Utterance; *attributed-to* one Acoustic Speaker.

#### 3.1.2 Utterance
- **Class:** Immutable.
- **Definition:** A continuous recognized turn of speech — an ordered sequence of Word Tokens from a single Acoustic Speaker over a contiguous span of time. The unit of Recognition (distinct from a Paragraph, §3.2.1).
- **Identity:** Persistent.
- **Invariants:**
  - Contains at least one Word Token; the Word Token order **is** the ordering authority within the Utterance.
  - Attributed to exactly one Acoustic Speaker; a turn is bounded where the Acoustic Speaker changes.
  - Its time span is the span of its Word Tokens.
- **Relationships:** *contains* (ordered) Word Tokens; *attributed-to* one Acoustic Speaker; ordered among Utterances by time.

#### 3.1.3 Acoustic Speaker
- **Class:** Immutable.
- **Definition:** A voice cluster produced by recognition (diarization) — a speaker identified by the *sound* of the voice, before any human identity or role is assigned.
- **Identity:** Persistent, as a stable cluster index within a Recognition.
- **Invariants:**
  - Exists independently of any human identity; it is never renamed. A human name or role is a Speaker Map Overlay (§3.3.1), never a mutation of the Acoustic Speaker.
  - Distinct Acoustic Speakers are never silently merged; unifying clusters across sources is a recorded operation, not an edit to the object.
- **Relationships:** *clusters* Word Tokens and Utterances attributed to it.

#### 3.1.4 Recognition
- **Class:** Immutable.
- **Definition:** The complete admitted recognition result for a transcript's source set — its Acoustic Speakers, Utterances, and Word Tokens. The root immutable object; the single source of truth for what was said.
- **Identity:** Persistent (one Recognition per transcript).
- **Invariants:**
  - Admitted once; never edited thereafter (Law 2).
  - There is exactly one Recognition per transcript; no competing copy of the same facts exists (Law 1).
  - Every Derived or Overlay object references it; it references nothing above itself.
- **Relationships:** *contains* Acoustic Speakers, Utterances, Word Tokens.

### 3.2 Derived objects (regenerable presentation)

Derived objects are computed from immutable objects and overlays. They are **disposable**: destroying one loses nothing, because it regenerates. None is ever a source of truth (Law 5). *How* they are produced is out of CTS scope (DPS/DTS/Render Model).

#### 3.2.1 Paragraph
- **Class:** Derived.
- **Definition:** A presentation grouping of Word Tokens for reading. The unit of **presentation**, as opposed to the Utterance, which is the unit of **recognition**.
- **Identity:** Render identity (§4) — valid within a given rendering, not persistent.
- **Invariants:** composed of Word Tokens by reference to their persistent identity; carries no fact that is not already a Word Token or an Overlay; never authoritative.
- **Relationships:** *composed-of* Word Tokens (by reference).

#### 3.2.2 Line and Page
- **Class:** Derived.
- **Definition:** Geometry units of a rendered transcript — a Line is a laid-out row of tokens; a Page is a bounded set of Lines. Units of the Render Model.
- **Identity:** Render identity only.
- **Invariants:** fully regenerable from immutable objects, overlays, and the render configuration; carry no independent facts; never authoritative. Their layout rules are defined by the Render Model, not by CTS.
- **Relationships:** *composed-of* Word Tokens / Paragraphs (by reference).

### 3.3 Overlay objects (authored additions — human or AI)

Overlays sit atop the immutable objects. Each is **removable** to recover the original evidence (Law 11). No Overlay ever mutates an immutable object (Law 6).

#### 3.3.1 Speaker Map
- **Class:** Overlay.
- **Definition:** An assignment of a human **Identity** (a name) and a **Role** (e.g. attorney, witness, reporter, videographer, interpreter) to an Acoustic Speaker.
- **Identity:** Persistent (the assignment is a recorded, addressable object).
- **Invariants:** references an Acoustic Speaker by persistent identity; never alters it; is reversible (removing the map restores anonymous Acoustic Speakers). Multiple candidate maps may coexist; at most one is *accepted* at a time.
- **Relationships:** *maps* one Acoustic Speaker → one Identity + Role.

#### 3.3.2 Correction
- **Class:** Overlay.
- **Definition:** An authored replacement for the displayed text of a Word Token — the "working text" layered above the immutable recognized text.
- **Identity:** Persistent; targets a Word Token by persistent identity.
- **Invariants:** the Word Token's recognized text is unchanged; the Correction is reversible (removing it restores the recognized text); the **canonical granularity of a Correction is the Word Token** (a coarser-grained edit resolves to Word-Token-level Corrections — the mechanism of that resolution is out of CTS scope).
- **Relationships:** *overlays* one Word Token.

> *Reconciliation note (evidence):* the current implementation captures some edits at Utterance-text granularity rather than per Word Token (per the render-pipeline audit). CTS fixes the canonical target as the Word Token; reconciling the implementation to it is an Implementation-Specification concern, not a change to this object model.

#### 3.3.3 Annotation
- **Class:** Overlay.
- **Definition:** An authored mark attached to the transcript that is not a text correction — including record-boundary markers (pre-record, on-record, off-record, post-record), procedural parentheticals, exclusion marks (content retained but withheld from an output), and notes.
- **Identity:** Persistent; attaches to a Word Token, an Utterance, a span, or a boundary by persistent identity.
- **Invariants:** never removes or edits evidence; an exclusion Annotation withholds content from a derived view but never deletes the underlying immutable objects; reversible.
- **Relationships:** *attaches-to* an Utterance, span, or boundary.

#### 3.3.4 AI Suggestion
- **Class:** Overlay.
- **Definition:** A machine-proposed Correction, Speaker Map, Annotation, or Structural Classification, carrying a confidence and a **review state** (proposed, accepted, rejected).
- **Identity:** Persistent; targets the object it proposes to affect, by persistent identity.
- **Invariants:** is metadata only and never authoritative until accepted (Law 7); acceptance is itself a recorded, reversible act that produces the corresponding Overlay; carries provenance (its origin, method, confidence, and timestamp).
- **Relationships:** *targets* a Word Token, Utterance, or Acoustic Speaker; *proposes* an Overlay.

#### 3.3.5 Structural Classification
- **Class:** Overlay.
- **Definition:** Meaning assigned to Utterances or lines — question/answer, colloquy, examination, objection, proceeding — as reviewable metadata.
- **Identity:** Persistent; targets Utterances by persistent identity.
- **Invariants:** overlays evidence, never alters it; is reviewable and reversible; a probabilistic classification is an AI Suggestion (§3.3.4) until accepted.
- **Relationships:** *classifies* one or more Utterances.

---

## 4. Identity model (per DTAS §12)

Every object carries identity in one of three kinds. This is what makes provenance and lineage possible.

- **Persistent identity** — assigned to immutable objects (Word Token, Utterance, Acoustic Speaker, Recognition) and to authored overlays. It never changes and is never reused. It is the anchor every reference points to.
- **Logical identity** — an object's meaning-level identity that can survive derivation: a Paragraph or Line references the *persistent* identities of the Word Tokens it presents, so a rendered element can always be traced back to the evidence it came from.
- **Render identity** — the transient identity of a derived presentation element (a Line, a Page), valid only within a single rendering and never persisted as truth.

**Governing rule:** every Derived and every Overlay object references immutable objects by **persistent identity**. This is the lineage guarantee — no matter how a token is grouped, corrected, relabeled, or paginated, it can be traced to the one Word Token it derives from. (The general theory of lineage across *transformations* is DTS's concern; CTS establishes only that objects carry the persistent references that make it possible.)

---

## 5. Relationship model (per DTAS §13)

The canonical object graph and its cardinalities:

```
Recognition ─contains─▶ Acoustic Speaker   (1 → many)
Recognition ─contains─▶ Utterance          (1 → many)
Recognition ─contains─▶ Word Token         (1 → many)

Utterance   ─contains (ordered)─▶ Word Token        (1 → many)
Utterance   ─attributed-to─▶ Acoustic Speaker       (many → 1)
Word Token  ─belongs-to─▶ Utterance                 (many → 1)
Word Token  ─attributed-to─▶ Acoustic Speaker       (many → 1)

Speaker Map            ─maps─▶ Acoustic Speaker      (1 → 1, one accepted)
Correction             ─overlays─▶ Word Token        (many → 1)
Annotation             ─attaches-to─▶ Utterance/span/boundary
AI Suggestion          ─targets─▶ Word Token/Utterance/Acoustic Speaker
Structural Classification ─classifies─▶ Utterance    (1 → many)

Paragraph   ─composed-of (by reference)─▶ Word Token
Line / Page ─composed-of (by reference)─▶ Word Token / Paragraph
```

**Relationship invariants:**
- Every relationship from a Derived or Overlay object to an immutable object is a **reference by persistent identity**, never a copy.
- No relationship cycles among immutable objects; the immutable graph is a strict containment tree rooted at Recognition.
- An Overlay relationship never implies mutation of its target.

---

## 6. Invariant catalog (consolidated)

The rules that make an instance of the model *valid*. Each maps to a DTAS Law.

| # | Invariant | DTAS |
|---|---|---|
| I1 | Exactly one Recognition per transcript; no competing representation of the same facts | Law 1 |
| I2 | Word Tokens, Utterances, and Acoustic Speakers are never edited; nothing is discarded at recognition | Laws 2, 3 |
| I3 | Each recognized fact exists once; every other appearance is a reference, derivation, or overlay | Law 4 |
| I4 | Paragraphs, Lines, and Pages are derived and never authoritative | Law 5 |
| I5 | Speaker Maps, Corrections, Annotations, and Classifications overlay evidence and are always removable | Law 6 |
| I6 | AI Suggestions are metadata and never authoritative until an accept produces an Overlay | Law 7 |
| I7 | Every object carries provenance (origin, method, confidence, review state as applicable) | Law 9 |
| I8 | Every Derived or Overlay object is reversible to the immutable truth | Law 11 |
| I9 | Persistent identities never change and are never reused; references survive derivation | §12 |
| I10 | Word order within an Utterance is the ordering authority; Utterances order by time | — |

An implementation is CTS-conformant only if every one of these holds for every instance.

---

## 7. Reconciliation with DTAS

| CTS object | Class | Primarily serves |
|---|---|---|
| Recognition | Immutable | Laws 1, 2 |
| Word Token | Immutable | Laws 2, 3, 4 |
| Utterance | Immutable | Laws 2, 4 |
| Acoustic Speaker | Immutable | Laws 2, 6 |
| Paragraph | Derived | Law 5 |
| Line / Page | Derived | Laws 5, 8 |
| Speaker Map | Overlay | Laws 6, 11 |
| Correction | Overlay | Laws 6, 11 |
| Annotation | Overlay | Laws 3, 6, 11 |
| AI Suggestion | Overlay | Laws 7, 9 |
| Structural Classification | Overlay | Laws 6, 10 |

---

## 8. What CTS does not define (scope boundary)

- **Storage and schema** — tables, columns, indexes, serialization: Implementation Specification.
- **Processing and stages** — where and in what order objects are produced or transformed: DPS.
- **Transformation semantics** — what a transformation is, its patch algebra, its reversibility mechanics: DTS.
- **Render geometry** — pagination rules, margins, tab stops, line layout: the Render Model.
- **Recognition vendor** — how audio becomes Word Tokens: outside the boundary (DTAS §19).

CTS names the objects and their invariants. Everything about *how* they come to exist, are stored, or are transformed belongs to the documents above.

---

## 9. Glossary (the canonical nouns)

- **Recognition** — the immutable admitted ASR result; the root source of truth.
- **Word Token** — the smallest immutable unit: a recognized word with timing, confidence, and acoustic speaker.
- **Utterance** — a continuous recognized turn; a unit of Recognition; immutable.
- **Acoustic Speaker** — a diarization voice cluster, identified by sound, before human identity.
- **Paragraph** — a derived presentation grouping of Word Tokens (unit of presentation).
- **Line / Page** — derived geometry units of the Render Model.
- **Speaker Map** — overlay assigning a human Identity and Role to an Acoustic Speaker.
- **Correction** — overlay replacing a Word Token's displayed text (working text).
- **Annotation** — overlay mark: boundaries, parentheticals, exclusions, notes.
- **AI Suggestion** — a machine proposal with confidence and review state; metadata until accepted.
- **Structural Classification** — overlay meaning (Q/A, colloquy, examination) on Utterances.
- **Persistent / Logical / Render identity** — the three kinds of identity (§4).

---

*End of CTS v1.0. It defines the objects; it does not define how they move through the system (DPS), what a transformation is (DTS), or how they are stored (Implementation Specification). The next document to author, per the Decision Matrix ratification order, is the Depo-Pro Processing Standard (DPS).*
