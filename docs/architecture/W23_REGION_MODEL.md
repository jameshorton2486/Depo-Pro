# Wave 23 Region Model

## Purpose

This document defines the canonical region model for the Wave 23 Deposition
Production Engine.

Wave 22 established transcript semantics. Wave 23 uses those semantics to
author a legal deposition document.

The deposition runtime must classify content into document regions before
applying downstream production rules.

## Canonical Regions

### Caption

Caption content is document metadata, not transcript speech.

Examples:

- `CAUSE NO. C-5722-24-L`
- party names
- `VS.`
- court lines
- `APPEARANCES`

Authority:

- `CaseRecord`
- Stage 1 intake metadata

Caption content must never be inferred from audio when authoritative intake
metadata is available.

### Proceedings

Proceedings content is pre-testimony record administration.

Examples:

- `PROCEEDINGS`
- videographer opening
- reporter opening
- date and time on the record
- cause number stated on the record
- remote deposition language
- reporter license language
- agreement request

Authority:

- `CaseRecord` metadata
- structured transcript semantics

Proceedings content may combine metadata and transcript semantics, but it is
not testimony.

### Examination

Examination content is the transition into testimony.

Examples:

- `(The witness was sworn.)`
- `(Whereupon, the deposition commenced.)`
- witness preface
- `EXAMINATION`
- `BY MR. BENTLEY:`

Authority:

- structured transcript semantics
- future examination state machine rules

Examination is distinct from both proceedings and testimony.

### Testimony

Testimony content is substantive examination dialogue.

Examples:

- `Q.`
- `A.`
- attorney colloquy during examination
- objections
- witness answers

Authority:

- semantic producers
- examination state machine
- dialogue production rules

Testimony begins only after examination starts.

### Certification

Certification content is post-testimony back matter.

Examples:

- `CHANGES AND SIGNATURE`
- notary block
- witness signature page
- certificate language

Authority:

- certification metadata
- transcript closeout content

Certification content must never be processed as testimony.

## Region Invariants

### Region Isolation

No downstream producer may allow one document block to span multiple regions.

Allowed:

- `CAPTION -> CAPTION`
- `PROCEEDINGS -> PROCEEDINGS`

Forbidden:

- `CAPTION -> PROCEEDINGS`
- `PROCEEDINGS -> TESTIMONY`
- `TESTIMONY -> CERTIFICATION`

### Region Immutability

Once a line or paragraph is classified into a region, downstream producers may
enrich it but may not migrate it into another region without an explicit
architectural decision.

### Region Ordering

The canonical deposition order is:

1. Caption
2. Proceedings
3. Examination
4. Testimony
5. Certification

Not every transcript will contain every region, but downstream production must
preserve this ordering whenever the region is present.

## Production Responsibilities

- `TP-0` owns region classification.
- `TP-0.5A` owns caption production.
- `TP-0.75` owns proceedings metadata production.
- `TP-1` owns proceedings events.
- `TP-2` owns examination state transitions.
- `TP-3` owns dialogue production inside testimony.
- `TP-4` owns structural events.
- `TP-5` owns geometry only.

## Etminan Reference Mapping

The Etminan certified transcript demonstrates the intended region sequence:

1. Caption
   - cause number
   - parties
   - court
   - appearances
2. Proceedings
   - videographer opening
   - reporter opening
   - agreement request
3. Examination
   - witness sworn
   - deposition commenced
   - witness preface
   - examination heading
   - by-line
4. Testimony
   - questions
   - answers
   - objections
5. Certification
   - changes and signature
   - notary block

This document governs all remaining Wave 23 region-aware production work.
