# Supabase Migration Audit

Date: 2026-06-03

Scope: read-only architectural audit of current persistence and a minimal-change migration path to make Supabase the single system of record for DEPO-PRO transcript editing.

## Executive Summary

The codebase is not currently a mixed SQLite/Supabase application. There is no evidence of SQLite, MS SQL, Postgres client libraries other than Supabase, Prisma, Drizzle, TypeORM, Sequelize, Knex, `pg`, `mysql2`, or `tedious` in the application package manifest or source imports; the only live database client is `@supabase/supabase-js` at `^2.57.4`. `package.json` declares only that dependency, and the only client bootstrap is `src/lib/supabase.ts`. [package.json:14](../../package.json:14) [package.json:15](../../package.json:15) [src/lib/supabase.ts:1](../../src/lib/supabase.ts:1) [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3)

What exists today is a split between:

| Persistence layer | Actual usage now | Evidence |
| --- | --- | --- |
| Supabase Postgres | Shared `contacts` library and append-only `field_provenance` audit events | [src/api/contactService.ts:4](../../src/api/contactService.ts:4) [src/components/conflict/conflictStore.tsx:117](../../src/components/conflict/conflictStore.tsx:117) [supabase/migrations/20260602161010_create_contacts_table.sql:43](../../supabase/migrations/20260602161010_create_contacts_table.sql:43) [supabase/migrations/20260602163903_create_field_provenance_table.sql:44](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:44) |
| Mock HTTP + in-memory state | Transcript document, review state, suggestions, exhibits, certify status | [src/mocks/handlers.ts:240](../../src/mocks/handlers.ts:240) [src/mocks/handlers.ts:252](../../src/mocks/handlers.ts:252) [src/mocks/handlers.ts:263](../../src/mocks/handlers.ts:263) [src/mocks/handlers.ts:285](../../src/mocks/handlers.ts:285) [src/mocks/handlers.ts:311](../../src/mocks/handlers.ts:311) [src/mocks/handlers.ts:314](../../src/mocks/handlers.ts:314) |
| Browser `localStorage` | Mock working transcript bootstrap, reviewed-word ids, certification state | [src/mocks/handlers.ts:101](../../src/mocks/handlers.ts:101) [src/mocks/handlers.ts:104](../../src/mocks/handlers.ts:104) [src/mocks/handlers.ts:145](../../src/mocks/handlers.ts:145) [src/components/CertificationScreen/CertificationScreen.tsx:23](../../src/components/CertificationScreen/CertificationScreen.tsx:23) [src/components/CertificationScreen/CertificationScreen.tsx:27](../../src/components/CertificationScreen/CertificationScreen.tsx:27) [src/components/ExportScreen/ExportScreen.tsx:13](../../src/components/ExportScreen/ExportScreen.tsx:13) [src/components/ExportScreen/ExportScreen.tsx:34](../../src/components/ExportScreen/ExportScreen.tsx:34) |
| React memory only | Intake `CaseRecord`, transcript change log, upload slots, many stage states | [src/context/IntakeContext.tsx:100](../../src/context/IntakeContext.tsx:100) [src/store/intakeReducer.ts:218](../../src/store/intakeReducer.ts:218) [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88) [src/components/IntakeScreen/IntakeScreen.tsx:204](../../src/components/IntakeScreen/IntakeScreen.tsx:204) |
| Browser download only | TXT/JSON exports generated client-side with `Blob` URLs, not persisted anywhere | [src/components/ExportScreen/ExportScreen.tsx:17](../../src/components/ExportScreen/ExportScreen.tsx:17) [src/components/ExportScreen/ExportScreen.tsx:117](../../src/components/ExportScreen/ExportScreen.tsx:117) [src/components/ExportScreen/ExportScreen.tsx:144](../../src/components/ExportScreen/ExportScreen.tsx:144) |

Plainly: MS SQL is not present. The likely misidentification is the presence of Supabase Postgres migrations plus “SQL-like” mock adapter types such as `WorkingTranscriptFile`, `ReviewStateFile`, and `AuditLogFile`, which describe intended JSON artifacts rather than a live SQL store. [package.json:14](../../package.json:14) [src/adapters/types.ts:6](../../src/adapters/types.ts:6) [src/adapters/types.ts:24](../../src/adapters/types.ts:24) [src/adapters/types.ts:46](../../src/adapters/types.ts:46)

The migration problem is therefore not “swap SQLite for Supabase.” It is:

1. Replace mock/local transcript persistence with real async Supabase reads and writes.
2. Add first-class Supabase persistence for intake, transcript, review, exhibits, certification, exports, and audit events that are currently memory-only or browser-local.
3. Preserve domain guarantees already encoded in contract types: immutable `raw_text`, stable `word_id`, stable `speaker_id`, word-level timings/confidence, and auditable edits. [AGENTS.md:34](../../AGENTS.md:34) [AGENTS.md:37](../../AGENTS.md:37) [src/api/types.ts:8](../../src/api/types.ts:8) [src/api/types.ts:11](../../src/api/types.ts:11) [src/api/types.ts:14](../../src/api/types.ts:14) [src/api/types.ts:16](../../src/api/types.ts:16)

## Phase 1 — Current Persistence Inventory

### 1. Database technologies actually present

#### Supabase / Postgres

- Package: `@supabase/supabase-js` `^2.57.4`. [package.json:14](../../package.json:14) [package.json:15](../../package.json:15)
- Client bootstrap: `src/lib/supabase.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and creates a client if both are present; otherwise it exports `null`. [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3) [src/lib/supabase.ts:4](../../src/lib/supabase.ts:4) [src/lib/supabase.ts:6](../../src/lib/supabase.ts:6)
- Code using it:
  - `src/api/contactService.ts` for `contacts`. [src/api/contactService.ts:4](../../src/api/contactService.ts:4)
  - `src/components/conflict/conflictStore.tsx` for `field_provenance`. [src/components/conflict/conflictStore.tsx:117](../../src/components/conflict/conflictStore.tsx:117)
- Migrations:
  - `supabase/migrations/20260602161010_create_contacts_table.sql` [supabase/migrations/20260602161010_create_contacts_table.sql:43](../../supabase/migrations/20260602161010_create_contacts_table.sql:43)
  - `supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql` [supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16](../../supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16)
  - `supabase/migrations/20260602163903_create_field_provenance_table.sql` [supabase/migrations/20260602163903_create_field_provenance_table.sql:44](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:44)

#### SQLite / embedded DB

- No evidence found in `package.json`, source imports, or repository-level `.db` / `.sqlite` files. The manifest contains no `better-sqlite3`, `sqlite3`, or `sql.js`, and the repo-only database file sweep returned none. [package.json:14](../../package.json:14) [package.json:30](../../package.json:30)

#### MS SQL / other SQL clients

- No evidence found for `mssql`, `tedious`, `pg`, `mysql2`, `knex`, `prisma`, `drizzle`, `typeorm`, or `sequelize` in the manifest or application source. `@supabase/supabase-js` is the only database client dependency declared by the application. [package.json:14](../../package.json:14) [package.json:15](../../package.json:15)

### 2. Browser-local and file-based persistence actually present

#### `localStorage`

- Mock working transcript snapshot:
  - key `depo-pro.mock.working-document.v1`
  - stores serialized `EditorDocument`. [src/mocks/handlers.ts:101](../../src/mocks/handlers.ts:101) [src/mocks/handlers.ts:104](../../src/mocks/handlers.ts:104) [src/mocks/handlers.ts:116](../../src/mocks/handlers.ts:116)
- Mock reviewed-word ids:
  - key `depo-pro.mock.reviewed-word-ids.v1`
  - stores `string[]` of reviewed `word_id`s. [src/mocks/handlers.ts:102](../../src/mocks/handlers.ts:102) [src/mocks/handlers.ts:132](../../src/mocks/handlers.ts:132) [src/mocks/handlers.ts:145](../../src/mocks/handlers.ts:145)
- Certification state:
  - key `depo-pro.certification.${jobId}.v1`
  - stores certification date, statement, and checklist. [src/components/CertificationScreen/CertificationScreen.tsx:8](../../src/components/CertificationScreen/CertificationScreen.tsx:8) [src/components/CertificationScreen/CertificationScreen.tsx:23](../../src/components/CertificationScreen/CertificationScreen.tsx:23) [src/components/CertificationScreen/CertificationScreen.tsx:36](../../src/components/CertificationScreen/CertificationScreen.tsx:36)
- Export screen reads certification readiness from the same key. [src/components/ExportScreen/ExportScreen.tsx:13](../../src/components/ExportScreen/ExportScreen.tsx:13) [src/components/ExportScreen/ExportScreen.tsx:34](../../src/components/ExportScreen/ExportScreen.tsx:34)

#### JSON/file artifacts modeled in code but not currently persisted by the app

- `WorkingTranscriptFile`, `ReviewStateFile`, and `AuditLogFile` exist as explicit schema targets in adapter types, strongly implying planned JSON persistence. [src/adapters/types.ts:6](../../src/adapters/types.ts:6) [src/adapters/types.ts:24](../../src/adapters/types.ts:24) [src/adapters/types.ts:46](../../src/adapters/types.ts:46)
- The architecture docs and master architecture still describe local JSON outputs such as `case.json`, `raw_transcript.json`, `working_transcript.json`, `review_state.json`, and `audit_log.json`, but the current UI code does not save those files. [docs/architecture/MASTER_ARCHITECTURE.md:37](../architecture/MASTER_ARCHITECTURE.md:37) [docs/architecture/MASTER_ARCHITECTURE.md:52](../architecture/MASTER_ARCHITECTURE.md:52) [docs/architecture/MASTER_ARCHITECTURE.md:67](../architecture/MASTER_ARCHITECTURE.md:67)

#### Browser download only

- Stage 7 export uses `Blob`, `URL.createObjectURL`, and an `<a download>` click to create local TXT/JSON files, but nothing is uploaded or tracked server-side. [src/components/ExportScreen/ExportScreen.tsx:17](../../src/components/ExportScreen/ExportScreen.tsx:17) [src/components/ExportScreen/ExportScreen.tsx:22](../../src/components/ExportScreen/ExportScreen.tsx:22) [src/components/ExportScreen/ExportScreen.tsx:62](../../src/components/ExportScreen/ExportScreen.tsx:62)

### 3. What each technology stores

| Technology | Data currently stored |
| --- | --- |
| Supabase `contacts` | Shared intake contact library: attorneys, interpreters, videographers, participants, firms, plus usage count and notes. [supabase/migrations/20260602161010_create_contacts_table.sql:45](../../supabase/migrations/20260602161010_create_contacts_table.sql:45) [src/types/contact.ts:1](../../src/types/contact.ts:1) |
| Supabase `field_provenance` | Intake extracted-field provenance and conflict-resolution events, not transcript word edits. [supabase/migrations/20260602163903_create_field_provenance_table.sql:49](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:49) [src/components/conflict/conflictStore.tsx:216](../../src/components/conflict/conflictStore.tsx:216) |
| Mock `EditorDocument` | Transcript words, utterances, speakers, media URL, duration. [src/api/types.ts:36](../../src/api/types.ts:36) [src/mocks/fixtures.ts:114](../../src/mocks/fixtures.ts:114) |
| Mock review state | Reviewed/unreviewed word ids. [src/api/types.ts:85](../../src/api/types.ts:85) [src/mocks/handlers.ts:263](../../src/mocks/handlers.ts:263) |
| Mock suggestions | `AiSuggestion[]` with status changes. [src/api/types.ts:45](../../src/api/types.ts:45) [src/mocks/handlers.ts:88](../../src/mocks/handlers.ts:88) |
| Mock exhibits | `Exhibit[]` with labels/descriptions/file URLs. [src/api/types.ts:56](../../src/api/types.ts:56) [src/mocks/fixtures.ts:272](../../src/mocks/fixtures.ts:272) |
| Mock certify status | `CertifyChecklist`. [src/api/types.ts:63](../../src/api/types.ts:63) [src/mocks/fixtures.ts:278](../../src/mocks/fixtures.ts:278) |
| React memory only | `CaseRecord`, transcript change log, stage state, upload slots. [src/types/case.ts:282](../../src/types/case.ts:282) [src/context/IntakeContext.tsx:273](../../src/context/IntakeContext.tsx:273) [src/context/DocumentContext.tsx:33](../../src/context/DocumentContext.tsx:33) |

## Phase 2 — Data Model Extraction

### 1. Current explicit schema by persistence layer

#### Supabase `contacts`

DDL:

- `id uuid primary key default gen_random_uuid()`
- `type text not null` with check in `('attorney','interpreter','videographer','participant','firm')`
- `name`, `organization`, `phone`, `email`, `address`, `notes` as `text not null default ''`
- `times_used integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- indexes on `type`, `lower(name)`, and `times_used desc`
- trigger updates `updated_at`
- RLS enabled with select/insert/update policies for authenticated users. [supabase/migrations/20260602161010_create_contacts_table.sql:43](../../supabase/migrations/20260602161010_create_contacts_table.sql:43) [supabase/migrations/20260602161010_create_contacts_table.sql:58](../../supabase/migrations/20260602161010_create_contacts_table.sql:58) [supabase/migrations/20260602161010_create_contacts_table.sql:63](../../supabase/migrations/20260602161010_create_contacts_table.sql:63) [supabase/migrations/20260602161010_create_contacts_table.sql:83](../../supabase/migrations/20260602161010_create_contacts_table.sql:83)

Code shape matches the migration exactly. [src/types/contact.ts:3](../../src/types/contact.ts:3)

#### Supabase `field_provenance`

DDL:

- `id uuid primary key default gen_random_uuid()`
- `case_id text not null`
- `field_path text not null`
- `field_label text not null default ''`
- `event_type text not null` with check in `('extracted','conflict_detected','conflict_resolved','confirmed','manual_edit')`
- `value text not null default ''`
- `source text not null default ''`
- `winning_value text`
- `rejected_value text`
- `rejected_source text`
- `confidence_score float`
- `resolution_user text not null default 'reporter'`
- `resolved_at timestamptz not null default now()`
- indexes `(case_id, field_path, resolved_at desc)` and `(case_id, event_type, resolved_at desc)`
- RLS enabled with select/insert policies for authenticated users only. [supabase/migrations/20260602163903_create_field_provenance_table.sql:44](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:44) [supabase/migrations/20260602163903_create_field_provenance_table.sql:68](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:68) [supabase/migrations/20260602163903_create_field_provenance_table.sql:75](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:75)

The UI type claims it maps 1:1 to the table. [src/components/conflict/types.ts:2](../../src/components/conflict/types.ts:2)

#### RPC `increment_contact_usage`

- SQL function `increment_contact_usage(contact_id uuid)` runs `UPDATE contacts SET times_used = times_used + 1 WHERE id = contact_id;`. [supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16](../../supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16)

#### Transcript contract shape (`EditorDocument`)

- `job_id`, `media_url`, `duration`
- `speakers: Speaker[]`
- `utterances: Utterance[]`
- `words: Word[]`

Key word fields:

- `word_id`
- mutable `text`
- immutable `raw_text`
- `speaker_id`
- `utterance_id`
 - `start_time`, `end_time`
- `confidence`
- `reviewed`
- `edited` [src/api/types.ts:8](../../src/api/types.ts:8) [src/api/types.ts:21](../../src/api/types.ts:21) [src/api/types.ts:36](../../src/api/types.ts:36)

#### Review state target

- `ReviewStateFile` contains `case_id`, `updated_at`, `reviewed_word_ids`, `unreviewed_word_ids`, optional `review_complete` and `review_pct`. [src/adapters/types.ts:24](../../src/adapters/types.ts:24)

#### Audit log target

- `AuditLogFile` contains `case_id` and ordered entries with `change_id`, `timestamp`, `utterance_id`, `word_id`, `old_text`, `new_text`, `source`, `suggestion_id`. [src/adapters/types.ts:35](../../src/adapters/types.ts:35) [src/adapters/types.ts:46](../../src/adapters/types.ts:46)

#### Intake / case model

Top-level `CaseRecord` currently models:

- core case metadata and workflow state
- witnesses, attorneys, interpreters, videographers, participants
- audio metadata
- exhibits
- Deepgram config/keyterms
- certification
- notes. [src/types/case.ts:282](../../src/types/case.ts:282) [src/types/case.ts:304](../../src/types/case.ts:304) [src/types/case.ts:313](../../src/types/case.ts:313)

Important nested entities:

- `CaseAudio` includes `audio_id`, original filename, MIME type, duration, size, uploaded_at, `media_url`. [src/types/case.ts:227](../../src/types/case.ts:227)
- `CaseExhibit` includes `exhibit_id`, label, description, `filename`, `file_url`, marking/admission metadata, transcript page/line refs. [src/types/case.ts:198](../../src/types/case.ts:198)
- `CaseCertification` includes checklist, statement, date, `signature_hash`. [src/types/case.ts:212](../../src/types/case.ts:212)

### 2. Domain concept mapping

| Domain concept | Current representation | Persistence today |
| --- | --- | --- |
| Case | `CaseRecord` | Memory only; seeded from `mockCaseRecord` in Intake screen. [src/types/case.ts:282](../../src/types/case.ts:282) [src/components/IntakeScreen/IntakeScreen.tsx:638](../../src/components/IntakeScreen/IntakeScreen.tsx:638) |
| Deposition/workspace | `case_id` plus `job_id` runtime identity | Memory/mock only; `caseIdToJobId` is identity mapping. [src/adapters/caseToEditorDocument.ts:71](../../src/adapters/caseToEditorDocument.ts:71) |
| Transcript | `EditorDocument` / `WorkingTranscriptFile` | Mock HTTP + optional localStorage in dev. [src/api/types.ts:36](../../src/api/types.ts:36) [src/adapters/types.ts:6](../../src/adapters/types.ts:6) [src/mocks/handlers.ts:126](../../src/mocks/handlers.ts:126) |
| Speaker turn / utterance | `Utterance` | Embedded in transcript document only. [src/api/types.ts:21](../../src/api/types.ts:21) |
| Word | `Word` | Embedded in transcript document only. [src/api/types.ts:8](../../src/api/types.ts:8) |
| Speaker | `Speaker` | Embedded in transcript document only. [src/api/types.ts:29](../../src/api/types.ts:29) |
| Exhibit | `Exhibit` for workspace API, `CaseExhibit` for case model | Mock HTTP for workspace exhibits; memory only for case exhibits. [src/api/types.ts:56](../../src/api/types.ts:56) [src/types/case.ts:198](../../src/types/case.ts:198) [src/mocks/fixtures.ts:272](../../src/mocks/fixtures.ts:272) |
| AI suggestion | `AiSuggestion` | Mock HTTP only. [src/api/types.ts:45](../../src/api/types.ts:45) [src/mocks/fixtures.ts:209](../../src/mocks/fixtures.ts:209) |
| Edit/audit record | `ChangeLogEntry` in memory; `AuditLogFile` adapter target; `field_provenance` for intake conflicts | Transcript edits are memory only; intake field provenance is in Supabase. [src/types/index.ts:11](../../src/types/index.ts:11) [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88) [src/adapters/types.ts:35](../../src/adapters/types.ts:35) [src/components/conflict/conflictStore.tsx:117](../../src/components/conflict/conflictStore.tsx:117) |
| Review state | `ReviewPayload` / `ReviewStateFile` | Mock HTTP + localStorage in dev. [src/api/types.ts:85](../../src/api/types.ts:85) [src/adapters/types.ts:24](../../src/adapters/types.ts:24) [src/mocks/handlers.ts:263](../../src/mocks/handlers.ts:263) |
| Export | generated TXT/JSON artifacts | Download-only, not persisted. [src/components/ExportScreen/ExportScreen.tsx:117](../../src/components/ExportScreen/ExportScreen.tsx:117) |
| User/settings | no app user model; contacts are shared; reporter fields live in `CaseRecord` | No auth model in app code. [src/types/case.ts:144](../../src/types/case.ts:144) [supabase/migrations/20260602161010_create_contacts_table.sql:37](../../supabase/migrations/20260602161010_create_contacts_table.sql:37) |

### 3. Duplicated concepts and migration-risk hot spots

#### Transcript state duplicated across multiple places

- Base transcript fixture: `FIXTURE_DOCUMENT`. [src/mocks/fixtures.ts:114](../../src/mocks/fixtures.ts:114)
- Mutable mock server state: `workingDocumentState`. [src/mocks/handlers.ts:130](../../src/mocks/handlers.ts:130)
- Browser-local snapshot: `depo-pro.mock.working-document.v1`. [src/mocks/handlers.ts:101](../../src/mocks/handlers.ts:101)
- UI working text buffer + in-memory change log: `DocumentContext`. [src/context/DocumentContext.tsx:35](../../src/context/DocumentContext.tsx:35) [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88)

This is the highest-risk area because edited transcript truth is already split between fixture, mock runtime, localStorage, and React memory.

#### Review state duplicated

- `Word.reviewed` in document payload. [src/api/types.ts:17](../../src/api/types.ts:17)
- `reviewedWordIds` set in mock handlers. [src/mocks/handlers.ts:75](../../src/mocks/handlers.ts:75)
- `ReviewStateFile` adapter target with reviewed/unreviewed arrays. [src/adapters/types.ts:24](../../src/adapters/types.ts:24)
- confidence plugin state and `DocumentContext.wordMap` flags. [src/components/ConfidencePanel/ConfidencePanel.tsx:24](../../src/components/ConfidencePanel/ConfidencePanel.tsx:24) [src/context/DocumentContext.tsx:127](../../src/context/DocumentContext.tsx:127)

#### Certification duplicated

- stage-local `PersistedCertificationState` in `localStorage`. [src/components/CertificationScreen/CertificationScreen.tsx:8](../../src/components/CertificationScreen/CertificationScreen.tsx:8)
- `CaseCertification` in the domain model but not wired to storage. [src/types/case.ts:212](../../src/types/case.ts:212)

#### Exhibits duplicated

- `Exhibit[]` workspace API model. [src/api/types.ts:56](../../src/api/types.ts:56)
- `CaseExhibit[]` in case record. [src/types/case.ts:198](../../src/types/case.ts:198)
- mock workspace exhibit fixture only, with placeholder `file_url: "#"`. [src/mocks/fixtures.ts:272](../../src/mocks/fixtures.ts:272)

### 4. Stable ID schemes and Postgres survivability

Current stable IDs already use strings and would survive a move to Postgres if preserved verbatim:

- `word_id` string, e.g. `w_00001234`. [src/api/types.ts:4](../../src/api/types.ts:4) [src/mocks/fixtures.ts:19](../../src/mocks/fixtures.ts:19)
- `speaker_id` string, e.g. `spk_002`. [src/api/types.ts:5](../../src/api/types.ts:5)
- `utterance_id` string, e.g. `utt_0001`. [src/api/types.ts:6](../../src/api/types.ts:6)
- `suggestion_id`, `exhibit_id`, `case_id`, `audio_id` are also strings. [src/api/types.ts:46](../../src/api/types.ts:46) [src/api/types.ts:57](../../src/api/types.ts:57) [src/types/case.ts:284](../../src/types/case.ts:284) [src/types/case.ts:227](../../src/types/case.ts:227)

Risky/non-deterministic IDs:

- Intake reducer generates attorney/witness/interpreter/videographer/participant/exhibit IDs with `Date.now()` + `Math.random()`. Those are not deterministic across import/export or retries. [src/store/intakeReducer.ts:27](../../src/store/intakeReducer.ts:27) [src/store/intakeReducer.ts:397](../../src/store/intakeReducer.ts:397) [src/store/intakeReducer.ts:441](../../src/store/intakeReducer.ts:441) [src/store/intakeReducer.ts:485](../../src/store/intakeReducer.ts:485) [src/store/intakeReducer.ts:529](../../src/store/intakeReducer.ts:529) [src/store/intakeReducer.ts:573](../../src/store/intakeReducer.ts:573) [src/store/intakeReducer.ts:617](../../src/store/intakeReducer.ts:617)

Recommendation: preserve transcript `word_id`, `speaker_id`, `utterance_id`, and `case_id` as business keys in Postgres; introduce separate surrogate UUID row IDs only where operationally useful.

## Phase 3 — Data Access Audit

### 1. Persistent read/write modules by entity

#### Contacts

- Reads:
  - `listContacts`
  - `searchContacts`
  - `getContact` [src/api/contactService.ts:4](../../src/api/contactService.ts:4) [src/api/contactService.ts:20](../../src/api/contactService.ts:20) [src/api/contactService.ts:37](../../src/api/contactService.ts:37)
- Writes:
  - `createContact`
  - `updateContact`
  - `incrementUsage`
  - `saveContact` [src/api/contactService.ts:48](../../src/api/contactService.ts:48) [src/api/contactService.ts:59](../../src/api/contactService.ts:59) [src/api/contactService.ts:71](../../src/api/contactService.ts:71) [src/api/contactService.ts:85](../../src/api/contactService.ts:85)
- Consumed through `useContactStore`. [src/store/contactStore.ts:70](../../src/store/contactStore.ts:70)

#### Intake provenance / field audit

- Writes:
  - `persistEntry` called from `recordExtraction`, `detectConflict`, `resolveConflict`, `recordConfirm`. [src/components/conflict/conflictStore.tsx:117](../../src/components/conflict/conflictStore.tsx:117) [src/components/conflict/conflictStore.tsx:216](../../src/components/conflict/conflictStore.tsx:216) [src/components/conflict/conflictStore.tsx:246](../../src/components/conflict/conflictStore.tsx:246) [src/components/conflict/conflictStore.tsx:283](../../src/components/conflict/conflictStore.tsx:283) [src/components/conflict/conflictStore.tsx:312](../../src/components/conflict/conflictStore.tsx:312)
- Reads:
  - `fetchHistory`
  - `loadHistory` [src/components/conflict/conflictStore.tsx:135](../../src/components/conflict/conflictStore.tsx:135) [src/components/conflict/conflictStore.tsx:349](../../src/components/conflict/conflictStore.tsx:349)

#### Transcript document

- Reads:
  - `api.getDocument`
  - `DocumentContext.loadDocument` [src/api/client.ts:43](../../src/api/client.ts:43) [src/context/DocumentContext.tsx:204](../../src/context/DocumentContext.tsx:204)
- Writes:
  - `api.saveWorking`
  - autosave from `DocumentContext.saveNow` [src/api/client.ts:46](../../src/api/client.ts:46) [src/context/DocumentContext.tsx:255](../../src/context/DocumentContext.tsx:255)
- Actual backend today:
  - mock `http.get("*/:jobId/document")`
  - mock `http.put("*/:jobId/working")`. [src/mocks/handlers.ts:242](../../src/mocks/handlers.ts:242) [src/mocks/handlers.ts:253](../../src/mocks/handlers.ts:253)

#### Review state

- Writes:
  - `api.saveReview` from `ConfidencePanel.handleMarkReviewed` and `handleUnreview`. [src/api/client.ts:49](../../src/api/client.ts:49) [src/components/ConfidencePanel/ConfidencePanel.tsx:76](../../src/components/ConfidencePanel/ConfidencePanel.tsx:76) [src/components/ConfidencePanel/ConfidencePanel.tsx:113](../../src/components/ConfidencePanel/ConfidencePanel.tsx:113)
- Actual backend today:
  - mock `http.put("*/:jobId/review")` writing reviewed ids to a `Set` and localStorage. [src/mocks/handlers.ts:264](../../src/mocks/handlers.ts:264)

#### Speakers and utterance-speaker assignments

- Writes:
  - `api.saveSpeakers` from `SpeakerPanel.commitEdit` and `UtteranceReassignment.reassign`. [src/api/client.ts:52](../../src/api/client.ts:52) [src/components/SpeakerPanel/SpeakerPanel.tsx:79](../../src/components/SpeakerPanel/SpeakerPanel.tsx:79) [src/components/SpeakerPanel/SpeakerPanel.tsx:318](../../src/components/SpeakerPanel/SpeakerPanel.tsx:318)
- Actual backend today:
  - mock `http.put("*/:jobId/speakers")` that mutates speaker labels and utterance/word speaker ids, then persists mock working document. [src/mocks/handlers.ts:273](../../src/mocks/handlers.ts:273)

#### Suggestions

- Reads:
  - `api.getSuggestions` in `SuggestionsPanel`. [src/api/client.ts:55](../../src/api/client.ts:55) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:39](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:39)
- Writes:
  - `api.resolveSuggestion` for accept/reject/edit. [src/api/client.ts:58](../../src/api/client.ts:58) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:152](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:152) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:187](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:187) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:207](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:207)
- Actual backend today:
  - mock map `suggestionState`. [src/mocks/handlers.ts:88](../../src/mocks/handlers.ts:88) [src/mocks/handlers.ts:291](../../src/mocks/handlers.ts:291)

#### Exhibits

- Reads:
  - `api.getExhibits` from `ExhibitsPanel`. [src/api/client.ts:65](../../src/api/client.ts:65) [src/components/ExhibitsPanel/ExhibitsPanel.tsx:31](../../src/components/ExhibitsPanel/ExhibitsPanel.tsx:31)
- Actual backend today:
  - mock `FIXTURE_EXHIBITS`. [src/mocks/handlers.ts:311](../../src/mocks/handlers.ts:311)

#### Certification

- Reads:
  - `api.getCertifyStatus` from `CertificationScreen`. [src/api/client.ts:68](../../src/api/client.ts:68) [src/components/CertificationScreen/CertificationScreen.tsx:63](../../src/components/CertificationScreen/CertificationScreen.tsx:63)
- Writes:
  - none to server; only `localStorage`. [src/components/CertificationScreen/CertificationScreen.tsx:36](../../src/components/CertificationScreen/CertificationScreen.tsx:36)

#### Intake case record

- Reads/writes:
  - entirely reducer/context-based, no persistence integration.
  - `IntakeScreen` loads a hardcoded `mockCaseRecord` on mount and `handleSave` is a stub. [src/components/IntakeScreen/IntakeScreen.tsx:22](../../src/components/IntakeScreen/IntakeScreen.tsx:22) [src/components/IntakeScreen/IntakeScreen.tsx:638](../../src/components/IntakeScreen/IntakeScreen.tsx:638) [src/components/IntakeScreen/IntakeScreen.tsx:661](../../src/components/IntakeScreen/IntakeScreen.tsx:661)

### 2. Raw SQL needing dialect translation

There are no SQLite queries to translate because there is no SQLite layer in the current codebase.

Existing SQL is already Postgres/Supabase SQL in migrations and uses Postgres-specific features:

- `gen_random_uuid()` [supabase/migrations/20260602161010_create_contacts_table.sql:44](../../supabase/migrations/20260602161010_create_contacts_table.sql:44)
- `timestamptz` [supabase/migrations/20260602161010_create_contacts_table.sql:53](../../supabase/migrations/20260602161010_create_contacts_table.sql:53)
- `plpgsql` trigger function [supabase/migrations/20260602161010_create_contacts_table.sql:63](../../supabase/migrations/20260602161010_create_contacts_table.sql:63)
- RLS policies using `auth.uid()` [supabase/migrations/20260602163903_create_field_provenance_table.sql:82](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:82)

### 3. Transactions and sync-local assumptions

No explicit SQL transactions exist in the current app code.

The main async refactor burden comes from local/synchronous assumptions, not SQL dialect:

- `DocumentContext` assumes edit buffering in memory and a delayed autosave, with the server only receiving utterance text batches. [src/context/DocumentContext.tsx:255](../../src/context/DocumentContext.tsx:255) [src/context/DocumentContext.tsx:270](../../src/context/DocumentContext.tsx:270)
- `ConflictStore.persistEntry` is fire-and-forget and does not block UI or reconcile failures. [src/components/conflict/conflictStore.tsx:6](../../src/components/conflict/conflictStore.tsx:6) [src/components/conflict/conflictStore.tsx:241](../../src/components/conflict/conflictStore.tsx:241)
- `SpeakerPanel` updates TipTap immediately and treats persistence as best-effort. [src/components/SpeakerPanel/SpeakerPanel.tsx:97](../../src/components/SpeakerPanel/SpeakerPanel.tsx:97) [src/components/SpeakerPanel/SpeakerPanel.tsx:342](../../src/components/SpeakerPanel/SpeakerPanel.tsx:342)
- `ConfidencePanel` mutates editor/plugin state before awaiting review persistence and silently ignores failures. [src/components/ConfidencePanel/ConfidencePanel.tsx:80](../../src/components/ConfidencePanel/ConfidencePanel.tsx:80) [src/components/ConfidencePanel/ConfidencePanel.tsx:99](../../src/components/ConfidencePanel/ConfidencePanel.tsx:99)

These are the places that need durable async write strategy, retry semantics, and conflict handling once Supabase becomes authoritative.

### 4. Local file I/O that should map to Supabase Storage

Current code does not write files to a local server filesystem. It only:

- accepts uploaded files into component state via `<input type="file">`, including notice docs, supporting docs, and audio/video. [src/components/IntakeScreen/IntakeScreen.tsx:171](../../src/components/IntakeScreen/IntakeScreen.tsx:171) [src/components/IntakeScreen/IntakeScreen.tsx:207](../../src/components/IntakeScreen/IntakeScreen.tsx:207) [src/components/IntakeScreen/IntakeScreen.tsx:231](../../src/components/IntakeScreen/IntakeScreen.tsx:231)
- models `CaseAudio.media_url` and `CaseExhibit.filename` / `file_url` in domain types. [src/types/case.ts:202](../../src/types/case.ts:202) [src/types/case.ts:234](../../src/types/case.ts:234)
- downloads generated exports locally in the browser. [src/components/ExportScreen/ExportScreen.tsx:17](../../src/components/ExportScreen/ExportScreen.tsx:17)

These should become Storage-backed:

- audio/video recordings
- exhibit source files
- generated export artifacts
- optionally uploaded notice/intake support documents if provenance needs source-document retrieval later

## Phase 4 — Supabase Current Usage Audit

### 1. What Supabase is already used for

#### Tables present in migrations

- `contacts` [supabase/migrations/20260602161010_create_contacts_table.sql:43](../../supabase/migrations/20260602161010_create_contacts_table.sql:43)
- `field_provenance` [supabase/migrations/20260602163903_create_field_provenance_table.sql:44](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:44)

#### Functions

- `increment_contact_usage(uuid)` [supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16](../../supabase/migrations/20260602161100_add_increment_contact_usage_fn.sql:16)

#### Auth usage

- Migrations assume authenticated access via RLS policies.
- App code shows no Supabase auth usage, sign-in flow, session retrieval, or user propagation. The only env keys read are URL and anon key. [supabase/migrations/20260602161010_create_contacts_table.sql:85](../../supabase/migrations/20260602161010_create_contacts_table.sql:85) [supabase/migrations/20260602163903_create_field_provenance_table.sql:78](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:78) [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3)

#### Storage buckets

- No storage bucket usage or migrations found in the repo.

#### Edge functions

- No edge functions found in the repo.

### 2. Security issues

#### Auth/RLS mismatch

Both existing tables require authenticated users, but the frontend shows no auth integration. As written, `contacts` and `field_provenance` will only work in environments where some other host shell injects an authenticated Supabase session; otherwise RLS blocks access. [supabase/migrations/20260602161010_create_contacts_table.sql:85](../../supabase/migrations/20260602161010_create_contacts_table.sql:85) [supabase/migrations/20260602163903_create_field_provenance_table.sql:78](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:78) [src/lib/supabase.ts:6](../../src/lib/supabase.ts:6)

#### Null-client risk

`supabase` can be `null`, but `contactService` and `conflictStore` call `.from(...)` and `.rpc(...)` without null guards. That is both a runtime reliability risk and a migration readiness issue. [src/lib/supabase.ts:6](../../src/lib/supabase.ts:6) [src/api/contactService.ts:5](../../src/api/contactService.ts:5) [src/components/conflict/conflictStore.tsx:118](../../src/components/conflict/conflictStore.tsx:118)

#### No service-role leak found

No committed service-role key usage was found in source; only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are referenced. [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3) [src/lib/supabase.ts:4](../../src/lib/supabase.ts:4)

### 3. Drift between migrations and code expectations

Observed drift is not table-column drift; it is architectural drift:

- Supabase has only `contacts` and `field_provenance`, but the app domain expects durable cases, transcripts, review state, exhibits, certification, exports, and audit logs. [supabase/migrations/20260602161010_create_contacts_table.sql:43](../../supabase/migrations/20260602161010_create_contacts_table.sql:43) [supabase/migrations/20260602163903_create_field_provenance_table.sql:44](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:44) [src/types/case.ts:282](../../src/types/case.ts:282) [src/adapters/types.ts:6](../../src/adapters/types.ts:6)
- Stage 1 “Save Intake” is explicitly unwired. [src/components/IntakeScreen/IntakeScreen.tsx:661](../../src/components/IntakeScreen/IntakeScreen.tsx:661)
- Transcript edit audit exists only as in-memory `ChangeLogEntry[]`, despite a modeled `AuditLogFile`. [src/context/DocumentContext.tsx:33](../../src/context/DocumentContext.tsx:33) [src/adapters/types.ts:46](../../src/adapters/types.ts:46)
- Certification persists to browser local storage rather than the domain model or backend. [src/components/CertificationScreen/CertificationScreen.tsx:36](../../src/components/CertificationScreen/CertificationScreen.tsx:36) [src/types/case.ts:212](../../src/types/case.ts:212)

## Phase 5 — Gap Analysis and Migration Plan

### 1. Current State Summary

```text
React Memory
  |- Intake CaseRecord
  |- Transcript changeLog
  |- Upload slots / stage state
  v
Mock HTTP (MSW)
  |- GET/PUT document, working, review, speakers
  |- GET/POST suggestions
  |- GET exhibits, certify/status
  v
localStorage
  |- mock working document
  |- reviewed word ids
  |- certification state

Supabase
  |- contacts
  |- field_provenance
```

This means the migration is additive first: you need to introduce durable Supabase persistence for the entities that currently have none, then retire mocks and browser-local state.

### 2. Target Supabase Schema

Minimal-change principle: keep `src/api/types.ts` contract shapes intact, map current aggregate payloads to Postgres tables behind service modules, and preserve business IDs (`case_id`, `word_id`, `utterance_id`, `speaker_id`) exactly as they exist now. [AGENTS.md:63](../../AGENTS.md:63) [src/api/types.ts:1](../../src/api/types.ts:1)

#### Recommended relational model

```sql
create table cases (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique,
  version text not null default '1.0',
  proceeding_type text not null,
  stage text not null,
  notes text not null default '',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table case_audio (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  audio_id text not null,
  original_filename text not null,
  mime_type text not null,
  duration_seconds double precision,
  file_size_bytes bigint,
  uploaded_at timestamptz,
  storage_path text,
  media_url text,
  unique (case_id, audio_id)
);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null unique,
  case_id text not null references cases(case_id) on delete cascade,
  job_id text not null,
  media_url text,
  duration double precision,
  based_on text,
  deepgram_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table transcript_speakers (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  speaker_id text not null,
  display_name text not null,
  deepgram_speaker integer not null,
  role text,
  unique (transcript_id, speaker_id)
);

create table transcript_utterances (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  utterance_id text not null,
  speaker_id text not null,
  start_time double precision not null,
  end_time double precision not null,
  ordinal integer not null,
  unique (transcript_id, utterance_id)
);

create table transcript_words (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  utterance_id text not null,
  word_id text not null,
  speaker_id text not null,
  ordinal integer not null,
  text text not null,
  raw_text text not null,
  start_time double precision not null,
  end_time double precision not null,
  confidence real not null,
  reviewed boolean not null default false,
  edited boolean not null default false,
  unique (transcript_id, word_id),
  foreign key (transcript_id, utterance_id)
    references transcript_utterances(transcript_id, utterance_id)
);

create index transcript_words_transcript_time_idx
  on transcript_words (transcript_id, start_time);
create index transcript_words_transcript_utterance_idx
  on transcript_words (transcript_id, utterance_id, ordinal);
create index transcript_words_transcript_review_idx
  on transcript_words (transcript_id, reviewed);

create table transcript_audit_log (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  change_id text not null unique,
  utterance_id text not null,
  word_id text,
  old_text text not null,
  new_text text not null,
  source text not null,
  suggestion_id text,
  reviewer_user_id uuid,
  created_at timestamptz not null
);

create table transcript_review_state (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null unique references transcripts(transcript_id) on delete cascade,
  updated_at timestamptz,
  reviewed_word_ids jsonb not null default '[]'::jsonb,
  unreviewed_word_ids jsonb not null default '[]'::jsonb,
  review_complete boolean not null default false,
  review_pct integer
);

create table transcript_suggestions (
  id uuid primary key default gen_random_uuid(),
  transcript_id text not null references transcripts(transcript_id) on delete cascade,
  suggestion_id text not null unique,
  word_id text not null,
  utterance_id text not null,
  original_text text not null,
  suggested_text text not null,
  reason text not null,
  confidence real not null,
  status text not null
);

create table case_exhibits (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  exhibit_id text not null,
  label text not null,
  description text not null default '',
  filename text,
  storage_path text,
  file_url text,
  marked_by text,
  admitted boolean not null default false,
  page_reference integer,
  line_reference integer,
  unique (case_id, exhibit_id)
);

create table case_certifications (
  id uuid primary key default gen_random_uuid(),
  case_id text not null unique references cases(case_id) on delete cascade,
  certification_date date,
  certification_statement text not null,
  checklist jsonb not null,
  signature_hash text
);

create table exports (
  id uuid primary key default gen_random_uuid(),
  case_id text not null references cases(case_id) on delete cascade,
  export_id text not null unique,
  format text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb
);
```

#### JSONB vs relational for 30k+ words

Recommendation: relational `transcript_words`, relational `transcript_utterances`, relational `transcript_speakers`; keep `cases.payload` as JSONB for the highly nested intake form.

Why:

- The UI already queries words by `word_id`, `utterance_id`, `speaker_id`, review status, and audio time. Those are poor fit for a giant JSONB transcript blob and are natural fit for indexed rows. [src/api/types.ts:9](../../src/api/types.ts:9) [src/api/types.ts:13](../../src/api/types.ts:13) [src/api/types.ts:14](../../src/api/types.ts:14) [src/components/ConfidencePanel/ConfidencePanel.tsx:53](../../src/components/ConfidencePanel/ConfidencePanel.tsx:53)
- Audio sync needs efficient time-window lookup on `start_time` and probably nearest-word search by transcript. [AGENTS.md:45](../../AGENTS.md:45)
- Review progress and suggestion resolution operate on subsets of words, not whole-document replacement. [src/components/ConfidencePanel/ConfidencePanel.tsx:95](../../src/components/ConfidencePanel/ConfidencePanel.tsx:95) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:159](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:159)
- The intake case record is deeply nested and changes less frequently, so storing its full shape as JSONB preserves the existing reducer model and avoids a large normalization rewrite. [src/types/case.ts:282](../../src/types/case.ts:282) [src/context/IntakeContext.tsx:135](../../src/context/IntakeContext.tsx:135)

Query patterns driving this decision:

- load transcript document for editor by `case_id` / `job_id`
- fetch ordered utterances and ordered words
- find words around current playback time
- update a subset of words after utterance edit
- mark reviewed/unreviewed by `word_id`
- resolve AI suggestion for one `word_id`
- compute completion/quality metrics
- reconstruct append-only audit history

#### RLS recommendations

- `cases`, `transcripts`, `transcript_*`, `case_exhibits`, `case_certifications`, `exports`, `field_provenance`, `contacts` should all be owner- or org-scoped, not `USING (true)`.
- If the product remains single-user desktop-first short term, use one authenticated user per reporter and add `owner_user_id uuid not null default auth.uid()` or `organization_id uuid`.
- Disallow `UPDATE` / `DELETE` on append-only audit tables (`field_provenance`, `transcript_audit_log`).
- If transcript word rows are updated, enforce immutability of `raw_text` at the database layer with a trigger that rejects changes when `OLD.raw_text <> NEW.raw_text`.

#### Storage bucket structure

```text
audio/
  {case_id}/{audio_id}/{original_filename}

intake-documents/
  {case_id}/{document_type}/{original_filename}

exhibits/
  {case_id}/{exhibit_id}/{original_filename}

exports/
  {case_id}/{export_id}/{format}/{filename}
```

### 3. Migration Steps

#### Step 1. Stabilize identity and auth prerequisites

- Decide user/org tenancy model before broad RLS work.
- Make Supabase client initialization explicit and fail fast if required env vars or auth session are absent.
- Add a backend-facing persistence service layer for case, transcript, review, suggestion, exhibit, certification, export.

Verifiable outcome:

- App can connect to Supabase intentionally rather than opportunistically. [src/lib/supabase.ts:6](../../src/lib/supabase.ts:6)

#### Step 2. Create new Supabase schema beside existing tables

- Add migrations for `cases`, `case_audio`, `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`, `transcript_audit_log`, `transcript_review_state`, `transcript_suggestions`, `case_exhibits`, `case_certifications`, `exports`.
- Keep existing `contacts` and `field_provenance` and add ownership columns/RLS hardening if needed.

Dual-run:

- yes

#### Step 3. Persist Stage 1 `CaseRecord` with minimal UI change

- Add `saveCase(record: CaseRecord)` and `loadCase(caseId)` services that store the whole `CaseRecord` in `cases.payload` plus selected indexed columns.
- Replace `mockCaseRecord` bootstrap in `IntakeScreen` with real `loadCase`.
- Replace empty `handleSave` stub with async save and update `updated_at`. [src/components/IntakeScreen/IntakeScreen.tsx:638](../../src/components/IntakeScreen/IntakeScreen.tsx:638) [src/components/IntakeScreen/IntakeScreen.tsx:661](../../src/components/IntakeScreen/IntakeScreen.tsx:661)

Dual-run:

- yes; keep loading mock data behind a dev flag while wiring Supabase

#### Step 4. Migrate transcript read path from mock HTTP to Supabase-backed API

- Implement `getDocument(jobId)` from `cases` + `transcripts` + `transcript_speakers` + `transcript_utterances` + `transcript_words` + `transcript_review_state`.
- Preserve the `EditorDocument` contract exactly so the editor UI does not need a large rewrite. [src/api/types.ts:36](../../src/api/types.ts:36)

Dual-run:

- yes; `api.getDocument` can read Supabase first and fall back to MSW only in dev

#### Step 5. Migrate transcript writes

- Change `saveWorking` to:
  - compute which words changed for each utterance
  - update only `text` and `edited`
  - never write `raw_text`
  - append rows to `transcript_audit_log`
- Refactor `DocumentContext.saveNow` so success depends on durable Supabase commit and audit write, not just best-effort PUT. [src/context/DocumentContext.tsx:255](../../src/context/DocumentContext.tsx:255)

Hard point:

- this is the first real cutover from fake persistence to durable persistence

#### Step 6. Migrate review state

- Back `saveReview` with `transcript_review_state` and optionally update `transcript_words.reviewed` in the same transaction boundary on the server side.
- Remove localStorage reviewed-word persistence from mock handlers once real backend path is active. [src/mocks/handlers.ts:145](../../src/mocks/handlers.ts:145)

Dual-run:

- short dual-run possible if dev mock path remains behind `import.meta.env.DEV`

#### Step 7. Migrate suggestions

- Store `AiSuggestion` rows in `transcript_suggestions`.
- On accept/edit:
  - update suggestion status
  - update target word text
  - append transcript audit entry
- The current in-memory `logSuggestionEdit` shape maps directly to the proposed audit table. [src/types/index.ts:11](../../src/types/index.ts:11) [src/components/SuggestionsPanel/SuggestionsPanel.tsx:163](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:163)

#### Step 8. Migrate speakers and utterance reassignments

- Back `saveSpeakers` with transactional updates to `transcript_speakers`, `transcript_utterances.speaker_id`, and affected `transcript_words.speaker_id`.
- Preserve current UI behavior but stop treating reassignment as best-effort. [src/components/SpeakerPanel/SpeakerPanel.tsx:342](../../src/components/SpeakerPanel/SpeakerPanel.tsx:342)

#### Step 9. Migrate exhibits and files to Storage

- Persist `CaseExhibit` rows in Postgres.
- Upload exhibit files to `exhibits/` bucket and store `storage_path` plus signed/public delivery strategy.
- Replace placeholder exhibit fixture pathing. [src/mocks/fixtures.ts:272](../../src/mocks/fixtures.ts:272)

#### Step 10. Migrate certification and exports

- Persist `CaseCertification` in `case_certifications` instead of `localStorage`.
- Store export metadata in `exports` and upload generated artifacts to `exports/` bucket when business process requires durable archive.
- Keep local download UX, but generate from server-backed source of truth. [src/components/CertificationScreen/CertificationScreen.tsx:36](../../src/components/CertificationScreen/CertificationScreen.tsx:36) [src/components/ExportScreen/ExportScreen.tsx:17](../../src/components/ExportScreen/ExportScreen.tsx:17)

#### Step 11. Data import scripts

Needed importers:

- `mockCaseRecord` / any existing case JSON into `cases`
- `FIXTURE_DOCUMENT` or current JSON transcript artifacts into `transcripts`, `transcript_speakers`, `transcript_utterances`, `transcript_words`
- any `ReviewStateFile` JSON into `transcript_review_state`
- any `AuditLogFile` JSON into `transcript_audit_log`
- existing `localStorage` keys if browser-session state must be rescued during rollout:
  - `depo-pro.mock.working-document.v1`
  - `depo-pro.mock.reviewed-word-ids.v1`
  - `depo-pro.certification.${jobId}.v1` [src/mocks/handlers.ts:101](../../src/mocks/handlers.ts:101) [src/mocks/handlers.ts:102](../../src/mocks/handlers.ts:102) [src/components/CertificationScreen/CertificationScreen.tsx:24](../../src/components/CertificationScreen/CertificationScreen.tsx:24)

### 4. Risk Register

| Risk | Why it exists now | Mitigation |
| --- | --- | --- |
| Data loss during transcript cutover | transcript edits live in memory, mock state, and localStorage, not one durable store | export current mock/local state first; write importer; dual-read until parity is verified. [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88) [src/mocks/handlers.ts:116](../../src/mocks/handlers.ts:116) |
| `raw_text` accidentally mutated | current write path updates `Word.text` and `edited`, but no DB constraint yet | add DB trigger/check preventing `raw_text` updates; test importer and save path. [AGENTS.md:34](../../AGENTS.md:34) [src/mocks/handlers.ts:214](../../src/mocks/handlers.ts:214) |
| `word_id` instability | must remain stable for review state, suggestions, and audit joins | treat `word_id` as immutable business key; never regenerate on import; enforce unique `(transcript_id, word_id)`. [AGENTS.md:37](../../AGENTS.md:37) [src/api/types.ts:9](../../src/api/types.ts:9) |
| Missing transcript audit trail | current transcript change log is in memory only | persist every save/suggestion edit into `transcript_audit_log`; backfill from any available JSON logs. [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88) [src/adapters/types.ts:46](../../src/adapters/types.ts:46) |
| Intake provenance split from transcript audit | `field_provenance` covers extracted-field decisions only | keep `field_provenance` for intake, add separate transcript audit table for Stage 3 edits. [supabase/migrations/20260602163903_create_field_provenance_table.sql:5](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:5) |
| Auth/RLS rollout blocks app | current frontend does not show auth flow | decide auth model before cutover; provide session bootstrap for embedded widget host. [supabase/migrations/20260602163903_create_field_provenance_table.sql:78](../../supabase/migrations/20260602163903_create_field_provenance_table.sql:78) [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3) |
| Offline capability loss | architecture and MVP docs assume local execution/local filesystem; Supabase centralization adds network dependency | keep a local draft cache only for transient offline editing, not as source of truth; clearly define degraded offline mode. [docs/architecture/MASTER_ARCHITECTURE.md:23](../architecture/MASTER_ARCHITECTURE.md:23) [docs/architecture/MASTER_ARCHITECTURE.md:113](../architecture/MASTER_ARCHITECTURE.md:113) |
| Performance regression on 30k+ words | transcript currently loads as one large payload; naive Supabase row fetches can become slow | batch fetch ordered utterances/words, index `(transcript_id, start_time)`, and consider server-side assembly into the existing `EditorDocument` shape. [AGENTS.md:48](../../AGENTS.md:48) [src/mocks/fixtures.ts:149](../../src/mocks/fixtures.ts:149) |
| ID collisions in intake entities | reducer uses timestamp/random IDs | replace with deterministic or DB-issued IDs once cases become durable. [src/store/intakeReducer.ts:27](../../src/store/intakeReducer.ts:27) |
| Certification state divergence | UI writes to localStorage, domain model has separate certification object | move certification save/load to Postgres and deprecate localStorage key. [src/components/CertificationScreen/CertificationScreen.tsx:36](../../src/components/CertificationScreen/CertificationScreen.tsx:36) [src/types/case.ts:212](../../src/types/case.ts:212) |
| File/archive loss | exports are only browser downloads; exhibits have placeholder URLs | put exhibit and export artifacts in Storage with metadata rows in Postgres. [src/components/ExportScreen/ExportScreen.tsx:17](../../src/components/ExportScreen/ExportScreen.tsx:17) [src/mocks/fixtures.ts:273](../../src/mocks/fixtures.ts:273) |

#### Offline behavior explicitly lost by moving to Supabase

Today the app can function in a local/mock sense without a server because:

- transcript APIs are mocked in-browser via MSW [src/mocks/handlers.ts:240](../../src/mocks/handlers.ts:240)
- intake is memory-only [src/context/IntakeContext.tsx:100](../../src/context/IntakeContext.tsx:100)
- certification and some review state are browser-local [src/components/CertificationScreen/CertificationScreen.tsx:27](../../src/components/CertificationScreen/CertificationScreen.tsx:27)

If Supabase becomes the only source of truth, those offline behaviors disappear unless a local draft layer is intentionally retained.

Minimal-change recommendation:

- keep a local unsynced draft cache for Stage 3 edits only, clearly marked as temporary/offline
- sync to Supabase when connectivity/auth resumes
- do not rely on that cache as canonical persisted state

### 5. Open Questions

1. Where are existing non-mock case/transcript JSON files, if any, outside this repository? The architecture documents assume local JSON artifacts, but the UI code here does not save them. [docs/architecture/MASTER_ARCHITECTURE.md:37](../architecture/MASTER_ARCHITECTURE.md:37) [src/components/IntakeScreen/IntakeScreen.tsx:661](../../src/components/IntakeScreen/IntakeScreen.tsx:661)
2. Is the embedded host already responsible for Supabase authentication/session injection? The frontend code itself does not show auth usage, but RLS requires authenticated users. [src/lib/supabase.ts:3](../../src/lib/supabase.ts:3) [supabase/migrations/20260602161010_create_contacts_table.sql:85](../../supabase/migrations/20260602161010_create_contacts_table.sql:85)
3. Should the durable transcript source remain an aggregate JSON document at the API boundary, even if Postgres stores normalized words/utterances internally? That is the lowest-risk path for the existing UI. [src/api/types.ts:36](../../src/api/types.ts:36)
4. Are AI suggestions generated elsewhere and merely displayed here, or must suggestion generation itself move into Supabase-backed workflow? Current code only consumes and resolves suggestions. [src/components/SuggestionsPanel/SuggestionsPanel.tsx:39](../../src/components/SuggestionsPanel/SuggestionsPanel.tsx:39)
5. Does the product require hard offline editing after migration, or is “view cached transcript, block writes until online” acceptable? The answer changes whether a local queue/cache is mandatory.
6. Should contacts be per-user, per-reporter organization, or globally shared inside one tenant? Current migration comments explicitly leave this undecided. [supabase/migrations/20260602161010_create_contacts_table.sql:37](../../supabase/migrations/20260602161010_create_contacts_table.sql:37)
7. Do exhibits and intake documents need immutable source-document retention for legal defensibility, or is derived metadata sufficient?

### 6. Effort Estimate

Riskiest items first:

| Phase | Rough effort | Notes |
| --- | --- | --- |
| Transcript persistence + audit cutover | 5-8 developer-days | Highest risk because current source of truth is fragmented and Stage 3 is core workflow. |
| Auth/RLS tenancy design and implementation | 2-4 developer-days | Must be settled before full Supabase cutover. |
| Case/intake persistence | 3-5 developer-days | Lower UI complexity, but touches large nested `CaseRecord`. |
| Review/suggestions/speaker persistence migration | 3-4 developer-days | Mostly service-layer work if contract shape is preserved. |
| Exhibits + Storage integration | 3-5 developer-days | Depends on upload UX and signed URL policy. |
| Certification + export archival | 2-3 developer-days | Small scope, but needs Storage if durable exports are required. |
| Import/export scripts and cutover verification | 3-5 developer-days | Includes rescuing any existing local/mock/browser state. |
| Cleanup: remove mocks/localStorage persistence paths | 1-2 developer-days | Only after production parity is verified. |

Total rough effort: 19-36 developer-days, depending on whether offline draft support and host-driven auth already exist.

## Recommended Minimal-Change Path

1. Keep the existing `EditorDocument` API contract and build a Supabase-backed assembler/disassembler behind it. [src/api/types.ts:36](../../src/api/types.ts:36)
2. Persist transcript words relationally, not as one JSONB blob.
3. Persist `CaseRecord` initially as JSONB plus a few indexed columns, then normalize later only if needed.
4. Replace browser-local certification and mock transcript persistence first; those are the clearest architectural violations against the project rules. [AGENTS.md:40](../../AGENTS.md:40) [src/components/CertificationScreen/CertificationScreen.tsx:29](../../src/components/CertificationScreen/CertificationScreen.tsx:29) [src/mocks/handlers.ts:106](../../src/mocks/handlers.ts:106)
5. Add a real transcript audit table before any production cutover, because the current Stage 3 change log is not durable. [src/context/DocumentContext.tsx:88](../../src/context/DocumentContext.tsx:88)

