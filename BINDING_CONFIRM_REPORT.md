# Binding Confirm Report

## Files changed

- `.env.example` — 7 total lines, `+2/-0` for the new `VITE_REQUIRE_BINDING_CONFIRM` flag.
- `src/components/TranscriptCreationScreen.tsx` — 311 total lines, `+58/-2` to add the confirmation gate, request preview reuse, and dialog wiring.
- `src/components/PreTranscriptionConfirmDialog.tsx` — new file, 145 lines.
- `src/components/PreTranscriptionConfirmDialog.test.tsx` — new file, 128 lines.

## Envelope fields reused from `DeepgramPayloadPreview.tsx`

I reused the same envelope fields already read by `DeepgramPayloadPreview.tsx`:

- `request.envelope.keyterms.length` for the count. Source: `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:78`, `src/components/TranscriptCreationScreen.tsx:40-44`.
- `request.envelope.estimated_token_usage` for the token estimate. Source: `src/components/DeepgramKeytermManager/DeepgramPayloadPreview.tsx:202`, `src/components/TranscriptCreationScreen.tsx:40-44`.
- `request.envelope.keyterms[].term` for the preview sample. The screen takes the first 12 terms from the same envelope array. Source: `src/lib/deepgram/buildDeepgramRequest.ts:121-143`, `src/components/TranscriptCreationScreen.tsx:40-44`.

## Case identity fields used

The screen already had the required record data in scope through `useIntake()`. I used:

- `record.case_id`
- `record.caption.case_name.value`
- `record.caption.case_style.value`
- `record.witnesses[0]?.name.value`

Sources: `src/components/TranscriptCreationScreen.tsx:17-44`, `src/types/case.ts:385-413`.

Any empty string or missing value is normalized to `null` in the screen and rendered by the dialog as `—`. Source: `src/components/TranscriptCreationScreen.tsx:33-38`, `src/components/PreTranscriptionConfirmDialog.tsx:23-25`, `src/components/PreTranscriptionConfirmDialog.tsx:63-78`.

## Gate behavior matrix

| Flag state | Trigger behavior |
|---|---|
| Default / unset | Gate ON. Clicking the button opens `PreTranscriptionConfirmDialog`; `startTranscription()` is not reachable until `onConfirm`. Sources: `src/components/TranscriptCreationScreen.tsx:15`, `src/components/TranscriptCreationScreen.tsx:150-167`, `src/components/TranscriptCreationScreen.tsx:218-220`, `src/components/TranscriptCreationScreen.tsx:297-307`. |
| `VITE_REQUIRE_BINDING_CONFIRM="false"` | Gate OFF. Clicking the button calls `runTranscription()` directly, which preserves today’s path. Sources: `src/components/TranscriptCreationScreen.tsx:156-158`. |

## Dialog behavior

- The dialog is presentational and controlled by props only; it performs no fetches, no local persistence, and no data derivation beyond rendering props. Source: `src/components/PreTranscriptionConfirmDialog.tsx:1-145`.
- Confirm is disabled when `audio` is `null`. Source: `src/components/PreTranscriptionConfirmDialog.tsx:130-138`.
- Backdrop click and Cancel both close the dialog through `onCancel`. Source: `src/components/PreTranscriptionConfirmDialog.tsx:46-50`, `src/components/PreTranscriptionConfirmDialog.tsx:121-129`.

## Acceptance gates

### 1. `npm run typecheck`

Pass.

```text
> vite-react-typescript-starter@0.0.0 typecheck
> tsc --noEmit -p tsconfig.app.json
```

### 2. `npm run lint`

The full-project lint gate does **not** pass, but the failures are pre-existing and outside this scope. The blocking errors are in unrelated files such as `Audit/runAudit.ts`, `src/api/intakeDesktopService.ts`, `src/lib/parsing/nodParser.ts`, `src/lib/parsing/reporterNotesParser.ts`, `src/mocks/fixtures.ts`, `src/types/database.ts`, and `supabase/functions/transcribe-callback/index.ts`.

Relevant result:

```text
✖ 71 problems (44 errors, 27 warnings)
```

To confirm this change did not add lint debt, I ran targeted lint on the touched files:

```text
npx eslint src/components/TranscriptCreationScreen.tsx src/components/PreTranscriptionConfirmDialog.tsx src/components/PreTranscriptionConfirmDialog.test.tsx
```

That targeted lint pass returned clean.

### 3. `npx vitest run`

Pass.

Before this change, the suite would have contained 52 test files / 256 tests. This change adds 1 file and 3 tests. After the change, the full suite reports:

```text
Test Files  53 passed (53)
Tests       259 passed (259)
```

The new dialog test covers:

- rendering of the three blocks from props
- disabled confirm when `audio` is null
- `onConfirm` and `onCancel` firing from the primary and secondary buttons

Sources: `src/components/PreTranscriptionConfirmDialog.test.tsx:41-127`.

### 4. Manual reasoning check

With the gate ON, the button no longer invokes `runTranscription()` directly. It calls `handleTriggerTranscription()`, which:

- preserves the existing no-audio error behavior
- branches to `setConfirmOpen(true)` when the flag is ON
- only calls `runTranscription()` directly when the flag is OFF

`startTranscription()` remains encapsulated inside `runTranscription()`, and the ON-path reaches `runTranscription()` only through the dialog’s `onConfirm` handler. Sources: `src/components/TranscriptCreationScreen.tsx:112-130`, `src/components/TranscriptCreationScreen.tsx:150-167`, `src/components/TranscriptCreationScreen.tsx:297-307`.

## Confirmed no out-of-scope change

- No file under `supabase/` was modified.
- No schema or migration change.
- No `package.json` or dependency change.
- No `src/api/types.ts` or contract change.
- No `src/api/*Service.ts` change.
- No new `fetch()` call site.
- No `localStorage` or `sessionStorage`.
- `runTranscription()` keeps the same body; only the caller path changed. Source: `src/components/TranscriptCreationScreen.tsx:112-130`.

## Status

Implementation is complete and scoped correctly. The only acceptance caveat is the pre-existing project-wide lint baseline, which remains outside this diff.
