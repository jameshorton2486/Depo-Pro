## Prompt 5C Report

### Commits

- `a34a401` `fix: deepgram preview renders the real request builder`
- `23c02d9` `feat: harvest keyterm suggestions from extraction results`
- current task commit: `feat: ufm metadata payload preview per §2.4`

### Task 1 — Deepgram request preview truthfulness

- The stale preview params lived in the old `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx` hardcoded `BASE_PARAMS` block and its companion `buildUrl()` / `buildStructuredPayload()` functions. That block advertised legacy `nova-2-legal`, `keywords=term:boost`, `paragraphs=false`, and `smart_format=false`, which contradicted both `docs/DATA_FIELD_REFERENCE.md` §3.1 and the real transcription service.
- The request now has one source of truth:
  - `src/lib/deepgram/buildDeepgramRequest.ts`
  - `src/api/transcriptionService.ts` consumes `buildDeepgramRequestFromStoredKeyterms(...)`
  - `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx` consumes `buildDeepgramRequest(...)`
- Grep proof around the request-builder seam:
  - `rg -n "nova-2-legal|keywords=|diarize_version|paragraphs:      false|smart_format:    false" src/components/DeepgramKeytermManager src/api/transcriptionService.ts src/lib/deepgram`
  - Result: no matches
- Wire-format rule implemented:
  - the preview envelope keeps `boost`, `category`, and `source` as manager metadata
  - the actual wire query appends only repeated `keyterm=<term>` params
  - the builder sorts by boost desc and caps at 100, emitting `keyterms_note` when the cut happens

### Task 2 — Harvest category / boost table implemented

Implemented in `src/lib/keyterms/harvestKeyterms.ts`, with rule tables translated from `reference/wave8/backend/services/keyterms.py`:

| Harvest category | Stored/UI category | Default boost |
|---|---|---|
| Person — witnesses / deponents | `proper_name` | 10 |
| Person — attorneys | `proper_name` | 9 |
| Person — regex-harvested caption names | `proper_name` | 8 |
| Law Firm | `company` | 7 |
| Organization | `company` | 6 |
| Case Identifier | `legal_term` | 5 |
| Geographic | `location` | 4 |
| Legal Term | `legal_term` | 3 |

Other Task 2 notes:

- Wave8-translated rule tables now live in `harvestKeyterms.ts`:
  - `NAME_PATTERN`
  - `FIRM_PATTERN`
  - `STRUCTURE_BLACKLIST`
  - `BOUNDARY_NOISE_WORDS`
  - `STOPWORDS`
  - `MULTIWORD_FIXES`
  - `MIN_TERM_LENGTH=4`
  - `MAX_KEYTERMS=100`
- Source mapping delta forced by the existing UI-layer types:
  - prompt/reference source codes are `nod_parser`, `job_sheet`, `manual`
  - the manager UI source column still uses existing labels `Notice`, `Scheduling Notes`, `Manual`
  - the mapping is explicit in `src/lib/keyterms/managedKeyterms.ts`
- Merge/preservation behavior:
  - new extracted suggestions are added enabled
  - case-insensitive duplicates are suppressed
  - existing user-set boost/category/selection/pin state is preserved on re-harvest
- Persistence seam:
  - manager state now round-trips through `record.deepgram.keyterms`
  - selection/pin/source metadata is encoded in the existing `notes` field to avoid a contract change
  - `transcriptionService` reads that metadata back before building the live Deepgram request

### Task 3 — §2.4 UFM field map vs envelope keys

Implemented in:

- `src/lib/ufm/buildUfmMetadata.ts`
- `src/components/IntakeScreen/UfmPayloadPreview.tsx`

Envelope keys populated:

| Envelope key | Current source in case payload |
|---|---|
| `cause_number` | `caption.case_number` |
| `caption` | `caption.case_style` fallback `caption.case_name` |
| `court` | `caption.court_name` |
| `county` | `caption.county` |
| `state` | `session.location_state` fallback `"Texas"` |
| `deponent` | joined `witnesses[].name` fallback caption/case name |
| `deposition_date` | `session.deposition_date` |
| `start_time` | `session.start_time` |
| `end_time` | `session.end_time` |
| `address` | composed from session address/city/state/zip |
| `csr_name` | `reporter.name` |
| `csr_license` | `reporter.cert_number` |
| `firm_registration` | `reporter.firm_registration_number` |
| `csr_cert_expiration` | `reporter.license_expiration` |
| `custodial_attorney` | `proceeding.ordering_contact` |
| `requesting_party` | currently `null` |
| `appearances` | projected from `attorneys[]` |
| `volume` | `"1"` placeholder |
| `proceedings_month/day/year` | computed from `deposition_date` |

Required-field set currently enforced for preview summary:

- Cause Number
- Court
- County
- State
- Deposition Date
- Reporter Name
- CSR License Number
- Custodial Attorney Name

Population / confirmation rules implemented:

- best-available values populate even if still unconfirmed
- confirmation truth is carried independently in `field_confirmations`
- missing required values are `null` in JSON and listed in `missing_required_fields`
- PROFILE-owned fields (`csr_license`, `firm_registration`, `csr_cert_expiration`) only populate from payload values already present

### Files touched

- `src/lib/deepgram/buildDeepgramRequest.ts`
- `src/lib/deepgram/buildDeepgramRequest.test.ts`
- `src/api/transcriptionService.ts`
- `src/lib/keyterms/harvestKeyterms.ts`
- `src/lib/keyterms/harvestKeyterms.test.ts`
- `src/lib/keyterms/managedKeyterms.ts`
- `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx`
- `src/components/DeepgramKeytermManager/keytermStore.tsx`
- `src/components/DepoEditor.tsx`
- `src/components/IntakeScreen/DocumentUploadPanel.tsx`
- `src/components/IntakeScreen/IntakeScreen.tsx`
- `src/components/IntakeScreen/UfmPayloadPreview.tsx`
- `src/context/IntakeContext.tsx`
- `src/store/intakeReducer.ts`
- `src/lib/ufm/buildUfmMetadata.ts`
- `src/lib/ufm/buildUfmMetadata.test.ts`

### Boundary log

- None
