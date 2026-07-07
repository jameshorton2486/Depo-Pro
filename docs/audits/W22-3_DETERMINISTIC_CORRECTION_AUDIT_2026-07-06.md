## W22-3 Deterministic Correction Audit
Date: 2026-07-06

### Executive Summary
W22-3 is `PARTIAL`, not `MISSING`.

The codebase already contains a meaningful deterministic correction substrate:
- token-level and phrase-level correction registries in `src/lib/transcript/correctionRegistry.ts`
- deterministic correction application functions in `src/lib/transcript/correctionEngines.ts`
- case-record auto-seeded keyterms in `src/lib/keyterms/autoSeedKeyterms.ts`
- broader keyterm derivation and tiering in `src/lib/keytermDerivation.ts`
- correction-report UI and tests

The correct implementation approach is to `EXTEND`, not `BUILD`, and to formalize
single-engine ownership so deterministic text normalization happens in one place,
upstream of punctuation and downstream of structure.

### Reuse Map
1. Deterministic token correction
   - Status: `EXISTS`
   - Files:
     - `src/lib/transcript/correctionRegistry.ts`
   - Notes:
     - already owns standalone token corrections like `C572224L -> C-5722-24-L`
     - already includes context-gated attorney-name garbles and medical garbles
   - Decision: `REUSE`

2. Deterministic phrase and multiword correction
   - Status: `EXISTS`
   - Files:
     - `src/lib/transcript/correctionRegistry.ts`
   - Notes:
     - already owns phrase and multiword rules like `remote storing -> remote swearing`
     - already contains procedural and reporter-name garbles
   - Decision: `REUSE`

3. Deterministic application engine
   - Status: `PARTIAL`
   - Files:
     - `src/lib/transcript/correctionEngines.ts`
   - Notes:
     - already applies metadata multiword corrections
     - already applies confirmed spellings
     - already applies legal phrase corrections
     - already applies medical phrase corrections
     - currently not clearly positioned as the authoritative pre-workspace deterministic layer
   - Decision: `EXTEND`

4. Confirmed spellings / metadata-backed correction
   - Status: `PARTIAL`
   - Files:
     - `src/lib/transcript/correctionEngines.ts`
     - `src/lib/keyterms/autoSeedKeyterms.ts`
     - `src/lib/keytermDerivation.ts`
   - Notes:
     - confirmed spelling support exists
     - case-record-derived terms exist
     - direct deterministic normalization of all audited transcript metadata misses is not complete
   - Decision: `EXTEND`

5. Legal / medical vocabulary suppression for noisy flags
   - Status: `PARTIAL`
   - Files:
     - `src/lib/format/cfe.ts`
     - `src/lib/transcript/correctionEngines.ts`
   - Notes:
     - legal and medical vocabulary awareness exists in multiple places
     - ownership is not centralized enough to guarantee low-noise scopist flagging
   - Decision: `EXTEND`

6. Structured correction reporting
   - Status: `EXISTS`
   - Files:
     - `src/components/CorrectionsPanel/*`
     - correction tests visible in search results
   - Decision: `REUSE`

### Ownership Gaps
The main W22-3 deficiencies are architectural rather than foundational:

1. Ownership is split
   - deterministic corrections live partly in registries, partly in correction engines,
     and partly in formatting paths
   - W22-3 should consolidate the deterministic lexical authority layer without
     changing ownership of punctuation or structure

2. Coverage is incomplete for audited misses
   - examples not obviously covered yet:
     - `Standing Steam -> Standing Seam`
     - `Koepke`-type company/proper-name corrections
     - deterministic metadata application for case-party spellings like
       `Rocio Laura Elizondo Vargas`
     - systematic title normalization where policy allows

3. Boundary to AI is not explicit enough
   - `applyAiContextualCorrections` already exists in `correctionEngines.ts`
   - W22-3 must keep deterministic ownership clear and defer only true ambiguity

### File-Level Findings
1. `src/lib/transcript/correctionRegistry.ts`
   - strong existing deterministic inventory
   - includes:
     - `DETERMINISTIC_TOKEN_CORRECTIONS`
     - `DETERMINISTIC_PHRASE_CORRECTIONS`
     - `METADATA_MULTIWORD_CORRECTIONS`
     - legal objection garble map
     - medical garble map
     - deterministic stutter handling
   - This should remain the rule inventory, not be duplicated elsewhere.

2. `src/lib/transcript/correctionEngines.ts`
   - already applies:
     - metadata multiword corrections
     - confirmed spellings
     - legal phrase corrections
     - medical phrase corrections
   - also includes AI-contextual correction entry points
   - This should become the clearly sequenced deterministic application layer.

3. `src/lib/keyterms/autoSeedKeyterms.ts`
   - already seeds witness, attorney, case number, and reporter terms from case data
   - good substrate for deterministic proper-name correction support

4. `src/lib/keytermDerivation.ts`
   - broader keyterm derivation exists beyond the simple auto-seed path
   - likely useful for case dictionary expansion and deterministic organization-name support

### Recommended W22-3 Scope Tightening
Implement W22-3 as an extension of the existing system, not a replacement.

Recommended commit slices:
1. Formalize deterministic correction sequencing
   - make `correctionEngines.ts` the explicit deterministic lexical pass
   - ensure it sits after structure ownership and before punctuation ownership

2. Extend deterministic metadata-backed correction coverage
   - add audited case/person/company correction fixtures
   - use case metadata and derived keyterms where deterministic

3. Reduce scopist-flag noise for common legal vocabulary
   - centralize vocabulary suppression ownership
   - verify that common legal words do not surface as review noise

### Explicit Deferrals
These should not be folded into W22-3:
- punctuation and spacing semantics: W22-4
- AI ambiguity resolution: W22-5
- render/export formatting ownership: W22-6
- speaker resolution and structure: W22-2

### Conclusion
W22-3 is ready for implementation as an `EXTEND` prompt.

The implementation should:
- reuse `correctionRegistry.ts`
- extend `correctionEngines.ts`
- leverage existing keyterm derivation
- add deterministic coverage for the audited metadata/proper-name/company misses
- keep deterministic and AI ownership boundaries explicit
