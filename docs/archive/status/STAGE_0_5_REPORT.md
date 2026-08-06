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
Stage 0.5 is complete and green. The suite moved from `35` passing files / `172` passing tests at baseline to `41` passing files / `196` passing tests after the six characterization additions, with coverage now present at the four weak seams called out by the audit: `contactService`, `contactStore`, `IntakeContext`, and `ParticipantsPanel`. The tests also pin the two integrity-critical behaviors that were previously implicit: role preservation at `normalizeCaseRecord()` and provenance behavior for manual participant add/remove actions. The original same-name attorney collapse inside one collection has now been resolved by `ea0e77d`, which changed load-time self-heal from name-only dedup to role-preserving composite-key dedup. Stage 1 is now clear to proceed from the integrity-gate perspective, with the provenance gap still explicitly deferred.

**Integrity Findings**
Finding A — Role preservation (`normalizeCaseRecord`, Task 5)
- Current characterized behavior after `ea0e77d`: same-name attorney entries inside `record.attorneys[]` are now **preserved as distinct entries** whenever their role-bearing fields differ (`representing`, `role`, `firm`), while true exact duplicates still collapse and merge enrichment fields.
- The updated test in [src/types/case.rolePreservation.test.ts](/C:/Users/james/Projects/Depo-Pro/src/types/case.rolePreservation.test.ts:1) now guards:
  - one name with three different attorney functions/roles surviving normalization as three entries
  - participant entries with the same name but differing `role_in_this_proceeding` surviving as distinct entries
  - a true exact duplicate still collapsing into one repaired survivor
- Classification: **resolved Stage 1 decision gate**
- Decision gate resolved note: before `ea0e77d`, dedup keyed on normalized name only; after `ea0e77d`, dedup keys on normalized name plus role-bearing fields, so cross-role entries no longer merge silently.

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
  - `RESOLVED 2026-06-08: role-preserving dedup; see fix commit.`
- [src/store/intakeReducer.participantProvenance.test.ts](/C:/Users/james/Projects/Depo-Pro/src/store/intakeReducer.participantProvenance.test.ts:39)
  - `manual participant entries are not provenance-tracked today — fix is post-beta, behavioral.`

**Stage 1 Go / No-Go**
- Recommendation: **GO** (updated 2026-06-08)
- Rationale: the suite is green, all six Stage 0.5 commits are present, and `ea0e77d` resolved the role-collapse bug by switching load-time self-heal to role-preserving composite-key dedup. The role-preservation test now guards the corrected behavior. The participant provenance gap remains documented and deferred, but it is not a Stage 1 blocker.

**Verification**
- `git status --short`: clean before report creation
- six Stage 0.5 commits present in `git log`
- `npm test`: `41` passing files / `196` passing tests / `0` failures / `0` skips
