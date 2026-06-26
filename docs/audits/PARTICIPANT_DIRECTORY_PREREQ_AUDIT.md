# Participant Directory — Pre-Flight Audit

Date: 2026-06-26
Branch: feature/stage3-workspace-core
Auditor: Codex

## Schema findings

- `supabase/migrations/20260603210000_create_core_schema.sql` defines `transcript_speakers.deepgram_speaker` as `integer not null`.
- There are no indexes on `deepgram_speaker`.
- There are no unique constraints including `deepgram_speaker`.
- There are no check constraints on `deepgram_speaker`.
- There are no foreign keys referencing `deepgram_speaker`.
- The only unique constraint on `transcript_speakers` in this migration is `unique (transcript_id, speaker_id)`. It does not include `deepgram_speaker`, so synthetic speakers with `deepgram_speaker = null` would still be uniquely keyed by `speaker_id`.

## Edge Function findings

- `supabase/functions/editor-api/index.ts` reads `transcript_speakers` in `loadSpeakers()` with:
  - `select("speaker_id, display_name, deepgram_speaker, role, speaker_index, speaker_label, assigned_name, speaker_role")`
  - `.order("speaker_index", { ascending: true })`
  - `.order("deepgram_speaker", { ascending: true })`
- The Edge Function does select `deepgram_speaker`, and it does order by `deepgram_speaker`.
- `TranscriptSpeakerRow` in the Edge Function is typed as `deepgram_speaker: number`, with `speaker_index?: number | null`.
- `mapSpeakerRow()` returns `deepgram_speaker: row.speaker_index ?? row.deepgram_speaker`.
  - If both are null at runtime, the expression yields `null`, not `undefined`, because `??` only falls through to the right-hand side and the right-hand side value would still be `null`.
  - The returned object is annotated as `Speaker`, but there is no explicit runtime validation before returning it to the client.
  - Because the contract type currently says `Speaker.deepgram_speaker: number`, this would become a type-contract mismatch if nullable rows are returned.
- `handlePutSpeakers()` does not write `deepgram_speaker` on update. It only updates:
  - `display_name`
  - `assigned_name`
  - `speaker_label`
  - `role`
  - `speaker_role`
- No Edge Function query filters on `deepgram_speaker`. There is no `WHERE deepgram_speaker = ...` path in this file.

## Contract findings

- In `src/api/types.ts`, `Speaker.deepgram_speaker` is currently `number`, not `number | null`.
- `SpeakersPayload` uses `Pick<Speaker, "speaker_id" | "display_name" | "role">[]`.
  - That means `SpeakersPayload` does not directly include `deepgram_speaker`.
  - Changing `Speaker.deepgram_speaker` to nullable would not mechanically alter the request payload shape for `saveSpeakers`.
- Under the repo rules, `src/api/types.ts` is a frozen contract file. Making `Speaker.deepgram_speaker` nullable would be a contract change and would need to be treated as a contract-version / freeze decision, not a casual internal refactor.
- `deepgram_speaker` is not referenced anywhere else inside `SpeakersPayload`.

## Client code findings

- `src/api/transcriptRepository.ts:49` defines `TranscriptSpeakerRow.deepgram_speaker: number`.
  - Risk: `NEEDS CHANGE`
  - If the column becomes nullable, this local row type must become `number | null`.
- `src/api/transcriptRepository.ts:334` writes `deepgram_speaker: speaker.speaker_index` during normalized transcript ingestion.
  - Risk: `SAFE` for Deepgram ingestion only
  - `speaker_index` comes from normalized Deepgram data and is always a number in the current normalization pipeline.
  - There is no existing synthetic-speaker insert path using this code.
- `src/api/workspaceService.ts:94` maps `deepgram_speaker: speaker.speaker_index ?? speaker.deepgram_speaker`.
  - Risk: `WILL BREAK` against the current contract if both become null
  - If both values are null, runtime output becomes `null`, while `Speaker.deepgram_speaker` is typed as `number`.
  - This path does not send the value back to the Edge Function in `SpeakersPayload`, but it does construct the client-side `EditorDocument`.
- `src/components/SpeakerPanel/SpeakerPanel.tsx:282` renders `SPK {spk.deepgram_speaker}`.
  - Risk: `NEEDS CHANGE`
  - React would not crash, but a nullable value would render as `SPK ` for `null` or `undefined` because React suppresses nullish children in text position.
  - That is still a broken badge for synthetic speakers because the label would be visually incomplete.
- `src/lib/transcript/workspacePresentation.ts:177` falls back to ``SPEAKER ${speaker.deepgram_speaker}`` when the display name is generic.
  - Risk: `WILL BREAK`
  - A synthetic speaker with generic label and null diarization index would produce `SPEAKER null`.
- `src/lib/transcript/workspacePresentation.ts:190` stores `speakerIndex: speaker.deepgram_speaker` in `SpeakerView`.
  - Risk: `NEEDS CHANGE`
  - The field is currently typed as `number`; nullable rows would violate that local type even though the value is not heavily used later.
- `src/mocks/fixtures.ts` uses only integer `deepgram_speaker` values.
  - Risk: `SAFE`
  - The mocks themselves do not need to change for the migration.
  - The `rg` inventory shows many tests instantiate `Speaker` with numeric `deepgram_speaker`, but the fixture file itself contains no assertion that the field must always be numeric.
- `src/types/database.ts` currently models `public.transcript_speakers` as:
  - `Row.deepgram_speaker: number`
  - `Insert.deepgram_speaker: number`
  - `Update.deepgram_speaker?: number`
  - Risk: `NEEDS CHANGE`
  - Generated DB types must be regenerated or edited after the schema migration, or the app will keep assuming non-null speakers at the DB boundary.

## Ingestion path findings

- `src/lib/transcript/normalize.ts` defines:
  - `CanonicalSpeakerRow.speaker_index: number`
  - `CanonicalUtteranceRow.speaker_index: number`
  - `CanonicalWordRow.speaker_index: number`
- `normalizeTranscriptResponse()` always materializes speaker rows from observed diarization clusters and assigns numeric `speaker_index` values.
- In the current ingestion path, `speaker_index` is always present on normalized speakers from Deepgram normalization.
- `src/api/transcriptRepository.ts:327-342` inserts speaker rows only from `normalized.speakers`.
  - That means the existing insert path assumes all inserted speakers come from Deepgram normalization.
- There is no separate INSERT path for user-created speakers in:
  - `src/api/transcriptRepository.ts`
  - `src/api/workspaceService.ts`
  - `supabase/functions/editor-api/index.ts`
- The current workspace speaker flow only updates existing rows by `speaker_id`; it does not create new rows.
- Conclusion: a user-created synthetic speaker insert path does not exist today and would need to be built.

## workspacePresentation findings

- `buildSpeakerViews()` does access `deepgram_speaker` directly.
  - It uses it to build the generic fallback label `SPEAKER {n}`.
  - It stores it as `speakerIndex` in the `SpeakerView`.
- `buildDisplayDocument()` does not fundamentally require a valid diarization integer for attorney/reporter/witness inference logic.
  - Most inference is driven by `speaker_id`, `display_name`, utterance text, and case metadata.
  - But the generic-label fallback path currently assumes `deepgram_speaker` is a valid number.
- Conclusion: the structuring layer does not intrinsically depend on a non-null diarization cluster, but the current fallback labeling logic does.

## Migration verdict

- Making `transcript_speakers.deepgram_speaker` nullable is necessary but not sufficient.
- Schema-only nullable migration would leave multiple code layers still typed and rendered as if the field were always numeric.
- The minimal safe sequence is:
  1. Migrate the database column to nullable.
  2. Regenerate or update DB-facing types in `src/types/database.ts`.
  3. Update local repository and Edge Function row types to `number | null`.
  4. Decide contract policy for `src/api/types.ts`:
     - Either allow `Speaker.deepgram_speaker: number | null`, which is a contract change.
     - Or introduce a separate local UI/database type for nullable speakers and keep the frozen contract unchanged until a deliberate contract revision is approved.
  5. Update `workspaceService` and `editor-api` mapping code so null speaker indices are handled intentionally instead of flowing through accidentally.
  6. Update UI rendering in `SpeakerPanel` and inference fallback labeling in `workspacePresentation.ts` so synthetic participants display cleanly.
  7. Build a new speaker-row insert path for user-created synthetic participants, because none exists today.

## Risks

- Immediate schema migration without code changes would create type drift in:
  - `src/types/database.ts`
  - `src/api/transcriptRepository.ts`
  - `supabase/functions/editor-api/index.ts`
  - `src/api/workspaceService.ts`
  - `src/lib/transcript/workspacePresentation.ts`
- If nullable rows are returned through the current contract, `Speaker.deepgram_speaker: number` becomes false at runtime.
- Synthetic speakers with generic labels would display as `SPEAKER null`.
- Speaker badges in the workspace would render as `SPK ` with no usable identifier.
- Even after nullability is allowed, the feature still cannot work end-to-end until an insert/create path exists for new synthetic participants.
- `loadSpeakers()` currently orders by `speaker_index` then `deepgram_speaker`; nullable values may sort first or last depending on PostgREST/Postgres defaults, so participant ordering should be reviewed explicitly when synthetic speakers are added.

## Recommended migration scope

- Schema:
  - Alter `transcript_speakers.deepgram_speaker` to allow null.
- Generated / DB-facing types:
  - `src/types/database.ts`
  - `src/api/transcriptRepository.ts`
  - `supabase/functions/editor-api/index.ts`
- Client mapping and display:
  - `src/api/workspaceService.ts`
  - `src/components/SpeakerPanel/SpeakerPanel.tsx`
  - `src/lib/transcript/workspacePresentation.ts`
- Feature plumbing still required after nullability:
  - Add a speaker-row creation path for synthetic participants in the Edge Function and/or repository layer.
  - Keep `saveSpeakers` update behavior for existing rows, but add explicit insert semantics for new `speaker_id` values.
- Recommended implementation order:
  1. Schema migration
  2. DB type regeneration
  3. Internal server/repository nullability fixes
  4. UI/rendering fallback fixes
  5. New synthetic speaker insert path
  6. Contract decision for frozen `Speaker` type
