## Executive Summary

The current Notice of Deposition extraction flow is already durable and conflict-safe, but it is materially narrower than the UFM field model. The active extraction path is not `src/lib/parsing/nodParser.ts`; it is the Edge Function `supabase/functions/extract-nod/index.ts` invoked by `src/lib/parsing/aiExtract.ts`, normalized by `supabase/functions/extract-nod/normalization.js`, applied by `src/lib/parsing/applyExtraction.ts`, and persisted through `src/components/IntakeScreen/extractionPersistence.ts`.

That pipeline currently succeeds at a narrow intake core:
- case number
- case style
- court / district / division / county / state fragments
- deposition date / start / end
- location / remote platform hints
- one witness
- attorneys
- harvested keyterms

It does not yet populate the larger UFM case model implied by `docs/DATA_FIELD_REFERENCE.md`, and the current TypeScript UFM builder is still a reduced envelope in `src/lib/ufm/buildUfmMetadata.ts`.

## Active Extraction Architecture

### Live path

1. `src/components/IntakeScreen/DocumentUploadPanel.tsx`
   - extracts text from the uploaded file
   - calls `aiExtract(text, "nod")`
   - calls `applyExtraction(extraction.fields, record)`
   - passes the resulting application into `applyAndPersistExtraction(...)`
2. `src/lib/parsing/aiExtract.ts`
   - invokes Supabase function `extract-nod`
3. `supabase/functions/extract-nod/index.ts`
   - prompts Anthropic for a fixed JSON shape
4. `supabase/functions/extract-nod/normalization.js`
   - normalizes the model output to `ExtractedNODFields`
5. `src/lib/parsing/applyExtraction.ts`
   - maps the normalized fields into `CaseRecord`
6. `src/components/IntakeScreen/extractionPersistence.ts`
   - records provenance
   - records conflicts
   - saves the case record

### Important non-live path

`src/lib/parsing/nodParser.ts` is explicitly a fallback parser and is no longer the active Notice extraction engine. Expanding Notice extraction now means expanding:
- `src/lib/parsing/aiExtractionTypes.ts`
- `supabase/functions/extract-nod/index.ts`
- `supabase/functions/extract-nod/normalization.js`
- `src/lib/parsing/applyExtraction.ts`

Not rewriting `nodParser.ts`.

## 1. Fields Already Extracted

The active extractor currently emits `ExtractedNODFields` from `src/lib/parsing/aiExtractionTypes.ts`:

### Caption and court
- `cause_number`
- `case_style`
- `plaintiff`
- `defendants`
- `court_name`
- `district`
- `division`
- `county`
- `state`

### Scheduling and proceeding
- `deposition_date`
- `start_time`
- `end_time`
- `location.address`
- `location.city`
- `location.state`
- `location.zip`
- `remote.is_remote`
- `remote.platform`
- `reporting_method`

### People
- `witness.name`
- `witness.party_affiliation`
- `attorneys[]`
  - `name`
  - `firm`
  - `representing`
  - `address`
  - `city`
  - `state`
  - `zip`
  - `phone`
  - `email`
  - `bar_number`
  - `side`
- `other_participants[]`
  - `name`
  - `role`

### Actually applied into `CaseRecord`

`src/lib/parsing/applyExtraction.ts` currently writes only:

- `caption.case_number`
- `caption.case_style`
- `caption.case_name` if still blank
- `caption.court_name` from `court_name + district + division`
- `caption.county`
- `caption.venue`
- `session.deposition_date`
- `session.start_time`
- `session.end_time`
- `session.location_address`
- `session.location_city`
- `session.location_state`
- `session.location_zip`
- `session.location_county`
- `session.reporting_method`
- `witnesses[0].name`
- `witnesses[0].party_affiliation`
- attorney add / patch operations
- harvested keyterms

So there is already a gap between what the model returns and what the app persists.

## 2. Fields That Exist in `CaseRecord` but Are Never Populated by Notice Extraction

The following existing `CaseRecord` fields are present in `src/types/case.ts` but are not populated by `applyExtraction.ts` from a Notice:

### Caption
- `caption.department`
- `caption.judge_name`

### Session
- `session.location_type`
- `session.remote_platform`

### Reporter
- `reporter.*` entire section

### Witness
- `witnesses[].role`
- `witnesses[].title`
- `witnesses[].employer`
- `witnesses[].read_and_sign`
- `witnesses[].email`
- `witnesses[].phone`
- `witnesses[].is_corporate_rep`
- `witnesses[].corporate_entity`

### Other people already modeled
- `interpreters[]`
- `videographers[]`
- `participants[]` is not populated from Notice today, even though `other_participants[]` is returned by the extractor

### Proceeding and job metadata already modeled
- `proceeding.ordering_firm`
- `proceeding.ordering_contact`

### Deepgram configuration already durable
- `deepgram.keyterms` is currently fed by harvested suggestions, but not by a richer Notice-specific metadata map

## 3. UFM Sections Still Requiring Manual Entry

The current UFM envelope in `src/lib/ufm/buildUfmMetadata.ts` is much smaller than the field-reference target. The live builder currently produces:

- cause number
- caption
- court
- county
- state
- deponent
- deposition date
- start / end time
- address
- reporter core profile fields
- custodial attorney
- requesting party placeholder
- appearances from attorneys
- volume and date parts

The following UFM-oriented sections still depend on manual entry or are not represented at all in the current app-level metadata:

### Caption details
- jurisdiction type
- explicit judicial district / division
- federal vs state routing
- case number label

### Parties
- structured party rows
- role modifiers
- entity type
- DBA / FKA fragments

### Counsel / appearance structure
- party-represented link as structured relation rather than free text
- noticing party / custodial role flags
- law-firm entity grouping
- fax

### Session / proceeding
- location type
- noticing party
- service type
- witness type
- interpreter required
- videographer required
- remote platform split from general reporting method
- time zone

### Reporter / firm / certificate
- reporter request flags
- expedited / rush / rough draft / daily copy
- audiovisual / realtime / stenographic requirements

### Service metadata
- certificate of service
- service date
- served parties
- service emails

## 4. Structured Values Present in Real NODs but Currently Ignored

Based on the current extractor schema, the field-reference contract in `docs/DATA_FIELD_REFERENCE.md`, and the live `applyExtraction.ts` mapper, the following structured values appear in real Notices but are ignored or only partially used:

### Caption structure
- explicit `division` is returned but only concatenated into `caption.court_name`
- `state` is returned but not stored as a first-class caption / jurisdiction value
- `district` is returned but only concatenated
- plaintiff / defendants are returned but not persisted as structured party records

### Witness metadata
- `read_and_sign`
- witness type
- deponent / party / expert classification
- interpreter required
- videographer required
- signature waived

### Proceeding metadata
- oral / video / remote deposition type
- Zoom / Teams / WebEx / Telephone platform
- hybrid vs pure remote

### Scheduling metadata
- noticing party
- ordered by / scheduling contact
- service type
- time zone
- remote location vs physical situs

### Counsel and firm structure
- per-party counsel relationships as a durable structured relation
- law-firm entities separate from attorney rows
- fax numbers

### Service metadata
- certificate-of-service block
- service date
- served parties
- service emails

## 5. Gaps Between Field Reference and Current App Model

`docs/DATA_FIELD_REFERENCE.md` defines a richer target data domain than the current `CaseRecord`. The largest app-model gaps for this expansion are:

1. No `parties` collection in `CaseRecord`
2. No structured `law_firms` collection
3. No `service` metadata section
4. No scheduling metadata section beyond date/time/location
5. No explicit reporter-request flags section
6. No first-class caption fields for jurisdiction / judicial district / division

These are additive payload gaps, not API-contract gaps, because `CaseRecord` is a UI/domain model and persists as `cases.payload` JSON.

## 6. UFM Generator Reality Check

The requested targets mention:
- `generateCaption()`
- `generateAppearances()`
- `generateCertificate()`
- `generateExhibitIndex()`
- `generateExaminationIndex()`

No TypeScript implementations with those names currently exist under `src/`. The live Stage 5 seam in this repo is:
- `src/lib/ufm/buildUfmMetadata.ts`
- `src/components/IntakeScreen/UfmPayloadPreview.tsx`

So the practical expansion target in this codebase is to enlarge:
- `CaseRecord`
- extraction mappings
- Intake review projection
- UFM metadata envelope

That is how manual UFM entry is reduced in the current architecture.

## 7. Conflict / Provenance Safety Already Exists

The existing extraction write path already has the correct integrity rules:

- `src/lib/parsing/applyExtraction.ts` uses `queueField(...)`
- if a field is confirmed and non-empty, the incoming extracted value becomes a conflict
- `src/components/IntakeScreen/extractionPersistence.ts` persists both field updates and conflicts
- `src/components/conflict/conflictStore.tsx` and provenance rehydration keep those conflicts durable

This means the expansion should reuse the current architecture rather than invent a second extraction flow.

## 8. Implementation Direction

The safest additive expansion path is:

1. Extend `ExtractedNODFields`
   - parties
   - law firms
   - witness flags
   - proceeding / platform / service metadata
   - service block
   - court reporter request flags
2. Extend the Edge Function prompt and normalization
   - keep the existing response format discipline
   - add only additive keys
3. Extend `CaseRecord`
   - additive payload-only sections for parties / firms / service / scheduling / reporter requests
4. Extend `applyExtraction.ts`
   - keep `queueField(...)` for conflict-safe field updates
   - add collection add / patch behavior parallel to the existing attorney / witness seams
5. Extend Intake review projection
   - add rows/categories for the newly populated metadata
6. Extend `buildUfmMetadata.ts`
   - consume the new structured data
   - identify which UFM fields are now auto-populated vs still manual

## 9. Coverage Baseline Before This Expansion

Current Notice extraction coverage is roughly:

- strong for basic caption and attorney intake
- partial for witness and scheduling
- minimal for UFM-specific package metadata beyond caption/date/address/appearances

The current repo does not yet approach the field-reference target of “roughly 50 parsed fields plus computed page references and post-proceeding data” described in `docs/DATA_FIELD_REFERENCE.md`.

That is the expansion target for the implementation phase that follows.
