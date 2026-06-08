Audit-only follow-up. No source or test files modified.

**Run Header**
Branch inspected: `feature/stage3-workspace-core`
HEAD inspected: `5e5ae7e`

**Dependency Map**
Verified participant data-flow chain from actual imports:

```text
contacts / contacts.details / contacts.firm_id / firms (Supabase DB)
  ↓  src/api/contactService.ts
     read: listContacts, searchContacts, getContact
     write: createContact, updateContact, upsertDirectoryContact, incrementUsage
contactService
  ↓  src/store/contactStore.ts
     read/write: reducer-backed load/search/create/update/save/upsertDirectory/useContact hook state
contactStore
  ↘
    src/components/IntakeScreen/ParticipantsPanel.tsx
    read: visibleContacts, search(), directory upsert
    write: upsertDirectory(), firm lookup/create
IntakeContext
  ↓  src/components/IntakeScreen/ParticipantsPanel.tsx
     read: record
     write: addAttorney/addInterpreter/addVideographer/addParticipant/remove* and reporter updateField()
ParticipantsPanel
  →  CaseRecord participant arrays in src/types/case.ts
     write: attorneys / interpreters / videographers / participants
  →  normalizeCaseRecord() in src/types/case.ts via src/lib/normalizeCaseRecord.ts
     read/write on load: coercion + collection dedupe/self-heal
CaseRecord + active provenance
  ↓  src/components/IntakeScreen/UfmPayloadPreview.tsx
     read: record, activeProvenance, reporter profile, directory contacts/firms
  ↓  src/lib/ufm/buildUfmMetadata.ts
     read-only pure projection into UFM envelope
CaseRecord.deepgram.keyterms
  ↓  src/components/DeepgramKeytermManager/DeepgramKeytermManager.tsx
     read/write: deriveKeytermsWithBudget(), mergeManagedDerivedKeyterms(), one-time auto-seed
  ↓  src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx
     read-only: buildDeepgramRequestFromStoredKeyterms()
Deepgram request
```

Import-graph deltas from the planned chain:
- `contactStore` does **not** flow through `IntakeContext`; `ParticipantsPanel.tsx` imports `useContactStore()` and `useIntake()` independently.
- `buildUfmMetadata.ts` does **not** feed the live Deepgram derivation path directly. The live path is `DeepgramKeytermManager.tsx` → `src/lib/keytermDerivation.ts`, with the derived/stored result persisted on `record.deepgram.keyterms`.
- `src/lib/parsing/keytermExtractor.ts` is confirmed legacy/parser-only. It is imported only by `src/lib/parsing/nodParser.ts` and `src/lib/parsing/reporterNotesParser.ts`, not by the live participant/keyterm UI path.

**Executive Summary**
Stage 0.5 is complete and green. The suite moved from `35` passing files / `172` passing tests at baseline to `41` passing files / `196` passing tests after the six characterization additions, with coverage now present at the four weak seams called out by the audit: `contactService`, `contactStore`, `IntakeContext`, and `ParticipantsPanel`. The tests also pin the two integrity-critical behaviors that were previously implicit: role preservation at `normalizeCaseRecord()` and provenance behavior for manual participant add/remove actions. The biggest risk uncovered is that same-name attorneys inside one collection are currently merged during normalization even when their role metadata differs. That makes Stage 1 a conditional no-go until the role-collapse behavior is resolved and re-characterized.

**Integrity Findings**
Finding A — Role preservation (`normalizeCaseRecord`, Task 5)
- Actual characterized behavior: same-name attorney entries inside `record.attorneys[]` are currently **merged/collapsed** during normalization, even when their `role` / `representing` metadata differs.
- The test in [src/types/case.rolePreservation.test.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.rolePreservation.test.ts:1) shows:
  - collection-local duplicates collapse to one attorney
  - the first non-empty role survives
  - later non-empty metadata like bar number, email, and time used can be merged into that survivor
  - the same name across *different* collections is still preserved
- Classification: **Stage 1 DECISION GATE**
- Required resolution before Stage 1: stop same-name/different-role attorney collapse inside the `attorneys[]` collection, add characterization for the new intended behavior, and rerun green.

Finding B — Participant provenance (Task 6)
- Actual characterized behavior: participant `ADD_PARTICIPANT` / `REMOVE_PARTICIPANT` reducer actions do **not** append `field_provenance` rows or any provenance-like state today.
- The test in [src/store/intakeReducer.participantProvenance.test.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.participantProvenance.test.ts:1) pins that absence explicitly.
- Classification: known auditability gap
- Disposition: deferred post-beta behavioral change; no runtime change made in Stage 0.5

**Stage 0.5 Test Inventory**
- [src/api/contactService.test.ts](/C:/Users/james/Projects/Depo-Pro/src/api/contactService.test.ts:1)
  - pins current Supabase query shapes, upsert insert/update paths, `firm_id` persistence, and RPC fallback
  - notable current quirk preserved: top-level `phone` is normalized on write, but `details.direct_phone` is not
- [src/store/contactStore.test.ts](/C:/Users/james/Projects/Depo-Pro/src/store/contactStore.test.ts:1)
  - pins load/search success/error handling and usage increment behavior
- [src/context/IntakeContext.test.ts](/C:/Users/james/Projects/Depo-Pro/src/context/IntakeContext.test.ts:1)
  - pins participant callback dispatch payloads and `applyExtraction` pass-through wiring
- [src/components/IntakeScreen/ParticipantsPanel.test.ts](/C:/Users/james/Projects/Depo-Pro/src/components/IntakeScreen/ParticipantsPanel.test.ts:1)
  - pins category-specific drawer fields, reporter profile fill, attorney directory + firm reuse, and generic participant role persistence
- [src/types/case.rolePreservation.test.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.rolePreservation.test.ts:1)
  - pins current normalization role-collapse behavior
- [src/store/intakeReducer.participantProvenance.test.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.participantProvenance.test.ts:1)
  - pins current no-provenance behavior for manual participant add/remove actions

**AUDIT NOTE Inventory**
- [src/types/case.rolePreservation.test.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.rolePreservation.test.ts:45)
  - `same-name/different-role collapse may violate role-preservation rule — confirm before Stage 1.`
- [src/store/intakeReducer.participantProvenance.test.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.participantProvenance.test.ts:39)
  - `manual participant entries are not provenance-tracked today — fix is post-beta, behavioral.`

**Stage 1 Go / No-Go**
- Recommendation: **NO-GO (conditional)**
- Rationale: the suite is green and all six Stage 0.5 commits are present, but Finding A shows same-name/different-role attorney entries are currently collapsed during normalization. Stage 1 (Attorney Directory) must not begin until that collapse is resolved, characterized, and re-run green.

**Verification**
- `git status --short`: clean before report creation
- six Stage 0.5 commits present in `git log`
- `npm test`: `41` passing files / `196` passing tests / `0` failures / `0` skips
