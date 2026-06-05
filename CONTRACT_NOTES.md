# CONTRACT_NOTES — API Contract Deviations Log

Contract types live in `src/api/types.ts`. Never rename or reshape them.
Log every deviation here with date, field, and reason.

**An empty deviations list means the contract is pristine.**

---

## Deviations

_None._

---

## UI-only additions (not deviations — these are separate local types)

| Type | Location | Note |
|---|---|---|
| `ChangeLogEntry` | `src/types/index.ts` | Append-only client-side edit history. Not sent to server. |
| `DepoEditorConfig` | `src/types/index.ts` | Mount config injected by the host page. Not an API shape. |
| `workingTexts` | `DocumentContext` state | `Record<UtteranceId, string>` — unsaved edits until `PUT /{jobId}/working`. |
| `CaseBundle` | `src/api/caseLoadService.ts` | Central restoration seam for Intake and future workspace/exhibits/export hydration. |
| `CaseFileRecord` | `src/api/fileService.ts` | Local metadata type for `case_files` table added in migration before generated DB types are refreshed. |
| `IntakeFileState` | `src/validation/intakeValidation.ts` | Bundle-derived validation input so Gate 1 grades durable uploads without changing the API contract. |
