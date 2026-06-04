# Codex CLI Prompt — Phase 1: CaseRecord Expansion (Texas UFM Fields)

Copy everything below the line into Codex CLI from the root of the repository.

**Prerequisite:** `docs/architecture/UFM_TEXAS_REQUIREMENTS.md` must be committed to the repo before running this. It is the authoritative field source for this phase.

---

Implement the CaseRecord model expansion required by Texas UFM transcript production, per `docs/architecture/UFM_TEXAS_REQUIREMENTS.md` and the gap findings in `INTAKE_SCREEN_AUDIT.md` / `INTAKE_SCREEN_OWNERSHIP_REPORT.md`. This phase is MODEL + REDUCER + REVIEW-SURFACE VISIBILITY only. The seven-section UI redesign is a later phase — do not build new screen sections. All payload changes are schema-free (JSONB `cases.payload`); no database migration.

## Scope rules

- Follow the existing field convention: extracted/reviewable values use the `{value, source, confirmed, confidence_score}` shape (see `src/types/case.ts` caption/session fields); plain entity attributes (e.g., contact-backed people fields) stay plain, matching existing attorney/interpreter shapes.
- Every new field must be: (1) in the type, (2) in the factory defaults, (3) supported by reducer actions, (4) included in the saved payload (automatic via full-record save), and (5) **visible and editable somewhere** — via the ExtractedFieldsTable projection (preferred for case/session/reporter/witness scalar fields) or the existing entity-card patterns (for person-attached fields). No new field may ship as EXISTS-UNWIRED.
- Texas captions and certificates are the consumers; field names below are binding.

## 1. Type additions (`src/types/case.ts`)

**Caption (`CaseCaption`):**
- `case_style` (reviewable field) — party names as styled; distinct from `case_name`
- `county` (reviewable field)
- `venue` (reviewable field) — jurisdiction line

**Session (`CaseSession`):**
- `location_county` (reviewable field)
- `reporting_method` (reviewable field; value one of: `"machine_shorthand" | "zoom" | "in_person" | "audio_recording"`)
- (`is_remote`, `remote_platform`, `start_time`, `end_time` already exist — they gain projection visibility below)

**Witness (`CaseWitness`):**
- `prefix_suffix: string | null`
- `party_affiliation: "plaintiff" | "defendant" | "third_party" | null`
- `is_corporate_rep: boolean`
- `corporate_entity: string | null`
- `read_and_sign: "read_and_sign" | "waived" | null` — the witness's stated election on the record (COLLECTED here; finalization stays in Certification per the ownership report)
- `spelling_corrections: Array<{ original: string; corrected: string; noted_on_record: boolean }>` — default `[]`

**Attorney (`CaseAttorney`):**
- `address: string | null`, `city: string | null`, `state: string | null`, `zip: string | null`
- `time_used: string | null` — default null; NOT edited at Intake (post-record workflow per ownership ruling); include in type now so the certificate generator has a home for it. Add a code comment to that effect.
- (`bar_number` already exists — treat it as the SBOT number; rename only if trivially safe, otherwise alias via comment)

**Interpreter (`CaseInterpreter`):**
- `oath_administered: boolean | null` — drives the sworn-through-interpreter parenthetical and the Interpreted Transcript Certificate swap
- (`language_from`/`language_to` already exist — `language_from` is the UFM "source language")

**Videographer (`CaseVideographer`):**
- `role_title: string | null` — for ALSO PRESENT

**Reporter (`CaseReporter`):**
- `license_expiration: string | null` (ISO date)
- `firm_registration_number: string | null`
- `firm_address: string | null`

## 2. Factory + mock updates

- Extend `createEmptyCaseRecord` (src/types/case.ts ~365) with defaults for every new field (nulls, `[]`, `false` as appropriate).
- Update `mockCaseRecord` to seed the new fields — and **re-seed the mock as a Texas case**: Texas district court (e.g., "193rd Judicial District Court"), Texas county (e.g., "Dallas County"), `cert_state: "TX"`, Texas-style CSR number. The audit flagged the California seeds as a jurisdiction mismatch; keep `confirmed: false` on extracted values per Phase 0.
- Loaded legacy rows (e.g., job_demo_001) will lack the new keys: ensure hydration tolerates missing fields. Add a `normalizeCaseRecord(record)` step in `loadCase` or post-load that fills missing new fields with factory defaults without touching existing values.

## 3. Reducer support (`src/store/intakeReducer.ts`)

- Confirm `UPDATE_FIELD` / `CONFIRM_FIELD` / `RESOLVE_CONFLICT` path resolution (`resolveExtractedPath`) covers the new reviewable dot-paths (`caption.case_style`, `caption.county`, `caption.venue`, `session.location_county`, `session.reporting_method`); extend the resolver if paths are whitelisted.
- Extend `UPDATE_WITNESS`, `UPDATE_ATTORNEY`, `UPDATE_INTERPRETER`, `UPDATE_VIDEOGRAPHER` payload types to accept the new attributes (these are generic partial-update actions — verify, and widen types only).
- Do NOT change `validateRecord` requirements in this phase — validation tiers are Phase 2. Add a `// Phase 2: validation tiers per UFM_TEXAS_REQUIREMENTS.md §9` comment at the validation function.

## 4. Review-surface visibility (`src/components/ExtractedFieldsTable/fieldProjection.ts` + table)

- Add projection rows for: `caption.case_style`, `caption.county`, `caption.venue`, `session.location_county`, `session.reporting_method`, `session.start_time`, `session.end_time`, `session.is_remote`, `session.remote_platform`, `reporter.license_expiration`, `reporter.firm_registration_number`, `reporter.firm_address`, `witnesses[*].party_affiliation`, `witnesses[*].read_and_sign`.
- **Minimal inline edit:** the audit found `UPDATE_FIELD` has no UI entry point, and no parser exists in this repo — without an edit affordance, new fields can never be populated. Add a minimal inline edit control to ExtractedFieldsTable rows (pencil icon → text input → save dispatches the existing `UPDATE_FIELD` with `source: "manual"`, `confirmed: true`). Reuse existing table styling; keep it simple — a text input is sufficient even for enum-ish fields in this phase.
- Person-attached new fields (witness election, interpreter oath, videographer role, attorney address block): where an entity card already exists (interpreter/videographer/attorney cards), add the field to the card's display when present. Editing person-attached fields beyond what cards already support may be deferred to the UI redesign — but interpreter `oath_administered` MUST be editable now (a simple toggle on the interpreter card), since it changes which certificate downstream phases generate.

## 5. Constraints & verification

- No new dependencies. No database migrations. Follow the ref pattern for async/event state reads.
- `npm run build` must pass.
- Verification to perform and report:
  1. Fresh DEV boot: new projection rows appear unconfirmed; inline edit on `caption.county` works and marks it confirmed/manual.
  2. Save → query live `cases` row → payload contains the new keys with edited values.
  3. Reload → hydration of the legacy row backfills missing new fields with defaults and does not clobber existing values (interpreters/attorneys intact).
  4. Toggle interpreter `oath_administered` → save → verify in payload.
- Report: files changed, any spec deviations and why, and a list of any UFM_TEXAS_REQUIREMENTS.md §1–8 fields you determined were already EXISTS+WIRED and therefore untouched.
