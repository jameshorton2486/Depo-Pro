# Depo-Pro Transcript Architecture Standard (DTAS)

**Version:** 1.0
**Status:** Constitutional authority. Ratified architecture. Every future change to the transcript system must conform to this document or amend it.
**Scope of this document:** *Architecture only.* This document defines what a transcript **is**, what is **immutable**, the **laws** that govern it, **who owns** each transformation, the **AI charter**, the **Render Model**, and **provenance**. It contains no schema, no code, no vendor APIs, and no migration plan. Those live in the three companion documents.

---

## 0. How the four documents relate

DTAS is the first of four documents. Each answers a different question and changes at a different rate.

| # | Document | Answers | Contains | Stability |
|---|---|---|---|---|
| 1 | **DTAS — Architecture Standard** *(this document)* | What is a transcript? What is immutable? What are the laws? | Principles, laws, ownership, charters | Constitutional — rarely changes |
| 2 | **Canonical Transcript Specification (CTS)** | What are the objects and their invariants? | Object definitions, relationships, allowed mutations | Slow — changes with the model |
| 3 | **Implementation Specification** | How is it built on this stack? | Schema, interfaces, indexes, persistence, performance engineering | Fast — changes with technology |
| 4 | **Migration Roadmap** | In what order do we get there? | Phased plan, sequencing, deadlines | Continuous — changes constantly |

**The inversion this establishes.** The system is designed around a **Canonical Transcript Model**, not around any recognition vendor's output, any database's tables, or the current pipeline. Recognition output, storage, and pipelines are *implementations of* the model. When implementation and architecture disagree, architecture wins — the implementation is the defect.

---

## 1. Preamble — why DTAS exists

A deposition transcript is **legal evidence**. It is cited in motions, read into the record, and relied upon by courts. Its integrity — the guarantee that what a witness said is faithfully preserved and that every subsequent change is attributable and reversible — is the product. Everything else is convenience.

Historically the system grew implementation-first: the recognition vendor's JSON, the database's tables, and the transformation pipeline became the de facto model of what a transcript is. That inverts the correct dependency. Formatting logic competed across subsystems; the same fact was stored in several places and drifted; failures were silent; and it was not always possible to say where a given word or label came from.

DTAS corrects the dependency once and for all: **there is one canonical model of a transcript, and every other artifact is a reference to it, a derivation from it, or an overlay upon it.**

---

## 2. The First Principle

> **Every fact exists exactly once. Every other representation is a reference, a derivation, or an overlay.**

This is the axiom from which the laws follow. A "fact" is a unit of recorded reality — a spoken word, a timestamp, a confidence value, a recognized speaker cluster. It is stored once, in the canonical model, as immutable evidence. Anything that *looks like* that fact elsewhere in the system is one of exactly three things:

- a **reference** — a pointer to the single stored fact;
- a **derivation** — a value computed deterministically from facts, and regenerable at will; or
- an **overlay** — a human or AI addition layered on top of, never inside, the facts.

If a piece of information is none of these, it does not belong in the system.

---

## 3. What is a transcript?

**Architecturally, a transcript is a canonical, immutable record of recognized speech in a proceeding, together with the reversible overlays that interpret, correct, structure, and present it.**

Two ideas must never be conflated:

- **The transcript as evidence** — the immutable recognition of what was said, when, by which acoustic speaker, and with what confidence. This is the thing the law cares about.
- **The transcript as presentation** — the paginated, labeled, formatted document a human reads or exports. This is a *view*, produced deterministically, and never the source of truth.

A transcript is not a document, a file, a database row, or a vendor response. Those are all representations. The transcript is the canonical model; the representations are its shadows.

---

## 4. The architectural pipeline

Information flows in one direction through named stages. Each stage has a single responsibility and a hard boundary. No stage may reach backward and alter the output of an earlier stage; it may only add references, derivations, or overlays.

```
Audio
  │        the acoustic reality of the proceeding
  ▼
Recognition
  │        speech → word tokens, timings, confidence, acoustic speakers
  ▼
Canonical Transcript Model
  │        the single immutable source of truth (words, utterances, speakers)
  ▼
Semantic Interpretation
  │        meaning as metadata: objections, colloquy, proceeding structure, roles
  ▼
Editorial
  │        reversible presentation rules: fillers, punctuation, capitalization, numbers
  ▼
Legal Structure
  │        examinations, Q&A, parentheticals, certification framing
  ▼
Render Model
  │        the one authoritative presentation form (Law 8)
  ▼
Workspace  ·  DOCX  ·  PDF  ·  JSON
           all four are views of one Render Model
```

Stage responsibilities, in brief (the objects and invariants are specified in the CTS, not here):

- **Recognition** turns audio into word-level facts. It preserves everything and interprets nothing.
- **Canonicalization** admits recognition into the single model, assigning persistent identity and enforcing the model's invariants. It adds no meaning.
- **Semantic Interpretation** attaches *meaning as metadata* — what is an objection, who is the examining attorney, where the proceeding goes on and off the record. It never edits words.
- **Editorial** applies reversible presentation rules — removing verbal fillers from the *reading* view, normalizing punctuation and numbers — as overlays that can be lifted to reveal the untouched evidence.
- **Legal Structure** arranges the interpreted, edited content into the forms a legal record requires — examinations, question-and-answer flow, parentheticals, certification framing.
- **Rendering** produces the single Render Model from which every output is a deterministic view.

---

## 5. The three classes of information

Every piece of information in the system is exactly one of three classes. This classification is not a convenience; it is load-bearing, because the laws apply differently to each.

### 5.1 Immutable — evidence

Never changes after it is admitted to the canonical model. If it were wrong, the remedy is an overlay (a correction), not an edit.

Examples: the audio; the recognized word tokens; timings; confidence values; the acoustic speaker clusters produced by recognition; verbal fillers and disfluencies as spoken.

### 5.2 Derived — regenerable

Computed deterministically from immutable facts and overlays. It is never authoritative and may be discarded at any time because it can always be recomputed identically.

Examples: the render tree; page numbers; line geometry; layout; word/page counts; any index.

### 5.3 Overlay — human or AI additions

Information layered on top of the facts, never inside them. Every overlay is attributable, reviewable, and reversible.

Examples: corrections; annotations; assigned speaker names and roles; exhibit links; editorial decisions; AI classifications and recommendations.

**The discipline this enforces:** to change what a transcript *shows*, you add or adjust a derivation or an overlay. You never reach into the evidence. Removing every overlay and discarding every derivation must always yield the original, untouched recognition.

---

## 6. The Canonical Transcript Model (architectural view)

The full object model is the CTS's job. Architecturally, three things are fixed here:

**6.1 The smallest immutable unit is the Word Token.** Not characters, not phonemes. The Word Token is the atom of evidence — a recognized word with its timing, confidence, and acoustic speaker. All higher structures are compositions of, or references to, Word Tokens.

**6.2 The recognition hierarchy.** Acoustic speakers own utterances; utterances own words.

```
Speaker (acoustic cluster)
   └── Utterance (a continuous recognized turn)
          └── Word Token (the atom of evidence)
```

**6.3 Utterance and Paragraph are different concepts, and must never be merged.**

- An **Utterance** is a unit of *Recognition* — a continuous turn of speech as heard. It is immutable evidence.
- A **Paragraph** is a unit of *Presentation* — a block a reader sees. It is derived/overlay, produced downstream, and may be reshaped without touching a single word.

Confusing the two is how presentation decisions leak into evidence. The wall between them is architectural.

---

## 7. The Architectural Laws

These twelve laws are binding. A change that violates a law is not permitted; it requires a DTAS amendment (§18), argued and versioned, before any implementation.

- **Law 1 — One canonical model.** There is exactly one authoritative model of a transcript. No subsystem may hold a competing representation of the same facts.
- **Law 2 — Recognition is immutable.** Once admitted, recognized words, timings, confidence, and acoustic speakers are never edited. They are corrected only by overlay.
- **Law 3 — Nothing is discarded at Recognition.** All recognized information is preserved, including verbal fillers, disfluencies, and low-confidence tokens. Discarding evidence at the point of capture is forbidden; removal is an Editorial overlay, not a recognition act.
- **Law 4 — Every fact exists exactly once.** Duplication of a fact is prohibited. Other appearances are references, derivations, or overlays.
- **Law 5 — Derived data is never authoritative.** Anything computed from facts is regenerable and disposable. It is never the source of truth and never the thing a correction targets.
- **Law 6 — Overlays never mutate evidence.** Corrections, annotations, names, roles, and editorial choices sit atop the immutable model. They are always removable to recover the original.
- **Law 7 — AI creates only metadata.** No AI operation may alter evidence. AI produces reviewable overlays and recommendations only (see §9).
- **Law 8 — There is exactly one Render Model.** All presentation — Workspace, DOCX, PDF, JSON — derives from a single Render Model. Competing formatting systems are prohibited.
- **Law 9 — Provenance is mandatory.** Every piece of information carries its origin: what produced it, by what method, when, and with what confidence and review state (see §11).
- **Law 10 — Determinism where the law requires it.** Every legally-significant transformation (canonicalization, merging, editorial rules, structural framing, rendering, export) is deterministic and reproducible. Probabilistic operations are permitted only as overlays subject to review (see §16).
- **Law 11 — Reversibility.** Every mutation in the system is an overlay or derivation that can be undone to restore the canonical truth. There is no irreversible edit to evidence.
- **Law 12 — Explicit, safe failure.** The system never silently corrupts, silently drops, or fabricates. Failures are surfaced with cause; partial states are explicit and recoverable from immutable sources (see §15).

---

## 7A. Architectural Principles

The twelve Laws (§7) are constitutional: they state timeless truths about the transcript itself — evidence is immutable, there is one canonical model, there is one Render Model. They depend on no framework, transport, or vendor, and they change only by amendment (§18).

**Architectural Principles are a second, distinct register.** They are durable engineering doctrine that *follows from* the Laws but is expressed against the realities of the current platform — the UI framework, the transport, the auth provider. A Principle is expected to outlive any particular implementation, but not necessarily the platform itself: when the platform changes, a Principle may be restated, while the Law it serves does not move. Principles are therefore revised more readily than Laws — a documentation change with a recorded rationale (and an ADR where a specific decision warrants one), not a constitutional amendment or a version increment.

The test is simple. If the statement would still be true were the codebase rewritten in a different framework, it is a Law. If it encodes *how* we honor a Law given today's tools, it is a Principle.

### Principle 1 — Reactive State Ownership

> Cross-cutting services publish state. Consumers subscribe to that state. A cross-cutting service must not reconstruct an unrelated application domain when its published state changes.

A cross-cutting concern — authentication, configuration, telemetry, logging, feature flags, localization — owns a slice of state that many parts of the application read. That state must be exposed as a **subscription** consumers observe, not **pushed** by rebuilding the parts that happen to depend on it. Reconstructing an unrelated domain because a cross-cutting value changed couples layers the architecture keeps separate, and (Law 1) risks a second, transient representation of state that already has one owner.

This is the Law 1 and Law 8 intent — single ownership, single authority, no competing representations — applied to *runtime state propagation* rather than to the transcript model.

**Worked example — authentication.** Authentication is owned by the auth gate and published as a reactive session store; the API layer reads a fresh token per request. An authentication event (token refresh, sign-in) therefore requires no reconstruction of the editor, the audio player, or the document model — those domains subscribe to what they need. Reconstructing the application root on every auth event violates this Principle. See [ADR-0007](./ADR-0007_REACTIVE_AUTHENTICATION_OWNERSHIP.md).

**Domains this Principle governs (non-exhaustive):** authentication, configuration, feature flags, telemetry, logging, localization. Each publishes; none reconstructs its consumers.

---

## 8. Ownership of transformations

Each transformation has exactly one owner. Ownership means: this party is responsible for the transformation's correctness, and no other party may perform it.

| Transformation | Owner | Mandate |
|---|---|---|
| Audio → recognized facts | **Recognition engine** (external) | Produce maximal structured recognition; preserve everything; interpret nothing |
| Facts → canonical model | **Canonicalization (Depo-Pro)** | Admit recognition, assign persistent identity, enforce model invariants, add no meaning |
| Meaning as metadata | **Semantic Interpretation (Depo-Pro; deterministic + reviewed AI)** | Classify objections/colloquy/proceeding; resolve roles — all as overlays |
| Presentation rules | **Editorial (Depo-Pro; deterministic)** | Apply reversible reading-view rules (fillers, punctuation, numbers) as overlays |
| Legal arrangement | **Legal Structure (Depo-Pro; deterministic + reviewed)** | Compose examinations, Q&A, parentheticals, certification framing |
| Presentation form | **Render Model engine (Depo-Pro; deterministic)** | Produce the one Render Model; all outputs are its views |

No stage may assume another's mandate. Recognition does not format. Rendering does not reinterpret meaning. Editorial does not touch evidence.

---

## 9. The AI Charter

AI is a first-class contributor and a strictly bounded one.

**9.1 AI never modifies evidence.** No AI operation edits a word, a timing, a confidence, or an acoustic speaker. (Law 7.)

**9.2 AI only creates metadata.** AI's outputs are overlays and recommendations: classifying an utterance as an objection or colloquy; identifying proceeding structure (on/off the record, examinations); proposing speaker identities and roles; assessing confidence; recommending corrections a human may accept or reject.

**9.3 Everything AI does is reviewable.** Every AI output carries provenance (model identity, method, confidence, timestamp) and a review state. Nothing an AI produces is authoritative until a human accepts it, and acceptance is itself a recorded, reversible overlay.

**9.4 AI is deterministic in its plumbing, probabilistic in its judgments.** The pipeline that invokes AI is deterministic and reproducible; the judgments AI returns are probabilistic and therefore always overlays (Law 10). A probabilistic judgment never silently becomes evidence.

**9.5 Absence of findings is a valid, first-class result.** "No objections," "no low-confidence words," "nothing to recommend" are correct outcomes, represented explicitly — never an error, never an empty gap that downstream stages misread.

---

## 10. The Render Model

**There is one Render Model (Law 8).** It is the single, authoritative presentation form of a transcript, derived deterministically from the canonical model plus its overlays. Workspace display, DOCX, PDF, and structured JSON are all **views** of this one model; none computes its own competing layout.

Architectural requirements of the Render Model:

- **Single authority.** All presentation geometry, pagination, labeling, and structure originate here. No output path re-derives them independently.
- **Fully derived.** The Render Model is a derivation (§5.2): regenerable from canonical facts and overlays, never a store of truth, disposable and rebuildable.
- **Deterministic.** The same canonical model and overlays always produce the same Render Model, and therefore the same paginated evidence across every output format (Law 10).
- **Convergent.** It unifies what were previously separate editor-side and export-side formatting systems into one, eliminating the drift between what a user sees and what is exported.

---

## 11. Provenance Specification

Provenance is not optional metadata; it is what makes the transcript legally defensible (Law 9). Every piece of information declares its origin.

Each class carries provenance appropriate to it:

- **Immutable evidence** traces to the audio and the recognition act: the source media, the recognition engine and its version, the moment of capture, and the confidence assigned.
- **Overlays** trace to their author and review: whether human or AI, which actor or model, the method, the time, the confidence (for probabilistic overlays), and the current review state (proposed, accepted, rejected).
- **Derivations** trace to their inputs and function: which deterministic operation produced them and from which facts and overlays, such that they can be regenerated and verified.

The invariant: **for any element a court might question, the system can state exactly where it came from, who or what produced it, and whether a human reviewed it.**

---

## 12. Identity Specification

An object may appear in several forms across the system without ceasing to be the same thing. Three kinds of identity are distinguished so that "sameness" is never accidental.

- **Persistent Identity.** A stable identifier that an object carries for its entire life, unchanged across corrections, reprocessing, and export. Persistent identity is assigned at canonicalization and never reused or reassigned. It is how references (§2) point at facts.
- **Logical Identity.** *What the object is*, independent of representation — this witness, this utterance, this exhibit — regardless of how it is displayed, labeled, or paginated. Overlays may change how a logical object is *named* (an acoustic speaker becomes "THE WITNESS") without changing *which* logical object it is.
- **Render Identity.** The object's identity *within a specific presentation* — its position, label, and page in one rendered view. Render identity is derived and disposable; it changes freely when the Render Model is regenerated and never flows back into persistent or logical identity.

Rule: persistent identity is immutable; logical identity is stable but may be *named* by overlay; render identity is derived. Lower kinds may never overwrite higher kinds.

---

## 13. Relationship Specification

The canonical model is a graph of related objects. Relationships, like facts, obey invariants (the exhaustive set lives in the CTS; the architectural rules are here):

- **Composition follows recognition.** Speakers contain utterances; utterances contain word tokens. These relationships are immutable once admitted.
- **Presentation references recognition; it never owns it.** Paragraphs, examinations, and rendered structures *reference* the utterances and words they present. Reshaping presentation re-points references; it never edits the referenced evidence.
- **Overlays attach by reference.** A correction references the word it corrects; an annotation references its target; an assigned name references an acoustic speaker; an exhibit link references the point in the record where it is introduced. The target is never modified by the attachment.
- **No orphans, no dangling references.** Every word belongs to an utterance and a speaker; every reference resolves to a live persistent identity. Integrity of the relationship graph is an enforced invariant, not a hope.

---

## 14. Information Lifecycle

Information moves through defined states, and its class determines what may happen to it in each.

1. **Capture.** Audio is recorded. Recognition produces facts. Nothing is interpreted or discarded.
2. **Canonicalization.** Facts are admitted to the single model, assigned persistent identity, and frozen as immutable evidence.
3. **Interpretation & correction.** Semantic meaning, editorial rules, legal structure, and human/AI corrections accumulate as overlays. The evidence beneath is untouched; every overlay is reversible.
4. **Presentation.** Derivations (the Render Model and its views) are generated on demand from evidence plus overlays, and regenerated whenever inputs change.
5. **Certification.** At certification the transcript is declared a legal record. From this point the *certified state* is frozen: further changes are recorded as explicit, attributable amendments layered above the certified baseline, never as edits to it.
6. **Archive & recovery.** Because evidence is immutable and derivations are regenerable, the transcript can be reconstructed at any time from its immutable sources plus its overlay history. Loss of a derivation is never loss of the transcript.

---

## 15. Failure Philosophy

Integrity outranks availability. A transcript that is unavailable can be recovered; a transcript that is silently wrong is a liability.

- **Never silent.** Every failure surfaces with its real cause. A stage that cannot complete says so; it does not hide the problem behind a partial or empty result.
- **Never fabricated.** The system never invents evidence to fill a gap. Missing recognition is reported as missing, not synthesized.
- **Partial states are explicit and recoverable.** An interrupted transformation leaves an explicit, inspectable state, and — because evidence is immutable and operations are idempotent — can be resumed or rebuilt from the immutable sources without re-capturing audio.
- **Fail toward evidence.** When forced to choose, the system preserves the immutable record and degrades presentation, never the reverse.

---

## 16. Deterministic vs Probabilistic Operations

The line between the two is a legal requirement, not a preference.

- **Deterministic operations** — canonicalization, merging of recognized segments, editorial rules, legal-structure composition, rendering, and export — **must** be reproducible: identical inputs yield identical outputs, every time. These produce the evidence and the paginated record a court relies on.
- **Probabilistic operations** — recognition itself, and AI judgments — are inherently non-reproducible at the token level. They are permitted, but their outputs are **always overlays** (Law 10), always carry confidence and review state (§11), and are **never** promoted to evidence without deterministic admission and, where judgment is involved, human acceptance.

The rule in one line: **anything a court relies on as fixed must be deterministic; anything uncertain must be an overlay.**

---

## 17. Performance Requirements

Architectural performance obligations (specific budgets belong to the Implementation Specification):

- **Scale to the real workload.** The canonical model must hold multi-hour depositions — tens of thousands of word tokens — without loss of integrity or the need to shard evidence across competing stores.
- **Derivations are cheap and disposable.** Regenerating the Render Model and its views must be fast enough to serve interactive editing and on-demand export, precisely because derivations are never stored as truth.
- **Recovery is always possible.** Reconstructing a transcript from its immutable sources plus overlays must be a supported, bounded operation, not a heroic one — no matter how large the proceeding.
- **Long-running work is resumable.** Because operations on evidence are deterministic and idempotent, expensive transformations can be checkpointed and resumed rather than restarted, and can never leave the model in an ambiguous state.

---

## 18. Governance and amendment

- **Constitutional authority.** DTAS governs every change to the transcript system. Any pull request that conflicts with a law in §7 is non-conformant and must not merge.
- **Amendment, not erosion.** The laws change only by explicit amendment to this document, with a version increment and a recorded rationale. They are never eroded silently by an implementation that finds them inconvenient — such an implementation is the thing that is wrong.
- **Conformance is reviewable.** Every design and PR states which stage it touches and affirms conformance to the relevant laws. Reviews check architecture before implementation.
- **Versioning.** This is DTAS v1.0. Backward-incompatible changes to a law increment the major version; clarifications increment the minor version. Companion documents (CTS, Implementation Specification, Migration Roadmap) reference the DTAS version they implement.
- **Two registers.** §7 **Laws** are constitutional and change only by versioned amendment. §7A **Architectural Principles** are durable engineering doctrine bound to the current platform; they are revised by documentation change with a recorded rationale (and an ADR where a specific decision warrants one), without a DTAS version increment. A Principle may never contradict a Law; if it appears to, the Principle is the thing that is wrong.

---

## 19. The Recognition-vendor boundary

The recognition engine's responsibility **ends at Recognition**. It converts audio into the richest possible set of word-level facts — words, timings, confidence, recognized utterances, acoustic speakers, and punctuation hints — and stops there.

Everything downstream — the canonical transcript, semantic interpretation, editorial, legal structure, and rendering — is owned by Depo-Pro. The recognition engine proposes recognition; **Depo-Pro decides how that recognition becomes a legally defensible transcript.**

A consequence worth stating: because recognition occupies a single, well-defined slot with a clear boundary, the recognition engine is **replaceable**. Any engine that supplies word-level facts with timings, confidence, and speaker clustering can fill the Recognition stage without disturbing a single downstream law. The architecture depends on the *role*, never on the vendor.

---

## 20. Glossary

- **Canonical Transcript Model** — the single, authoritative, immutable model of a transcript; the source of truth from which all else derives.
- **Word Token** — the smallest immutable unit of evidence: a recognized word with timing, confidence, and acoustic speaker.
- **Utterance** — a continuous recognized turn of speech; a unit of Recognition; immutable.
- **Paragraph** — a block of presented text; a unit of Presentation; derived/overlay.
- **Acoustic Speaker** — a speaker cluster produced by recognition, identified by the sound of the voice, before any human identity is assigned.
- **Speaker Map** — the overlay that assigns human identities and roles to acoustic speakers.
- **Immutable / Derived / Overlay** — the three classes of information (§5).
- **Provenance** — the recorded origin, method, confidence, and review state of a piece of information (§11).
- **Render Model** — the one authoritative presentation form from which all outputs are views (§10).
- **Persistent / Logical / Render Identity** — the three kinds of identity (§12).
- **Certification** — the point at which a transcript is declared a legal record and its certified state is frozen (§14).

---

*End of DTAS v1.0. The next document to author is the Canonical Transcript Specification (CTS), which defines each object's purpose, relationships, invariants, provenance, and allowed mutations — still with no schema or code.*
