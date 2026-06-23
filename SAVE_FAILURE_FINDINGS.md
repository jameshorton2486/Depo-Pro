# SAVE_FAILURE_FINDINGS

## Verdict

The save failure is a **new regression in the Workspace change-detection path, not the auth-session fix**: `dirty` only flips when `TranscriptEditor` dispatches `EDIT_UTTERANCE`, and the save path is fully gated behind that flag, so when the editor never marks the doc dirty the Save button stays disabled, autosave never runs, and persistence is never invoked. The stable save/auth code predates this; the regression surface is the turn-grouping/CFE render refactor sequence (`770e386`, then `a0951fa` / `18c73b7`), not `supabase.ts`. Evidence: `src/context/DocumentContext.tsx:114-145,319-347`, `src/components/TranscriptEditor/TranscriptEditor.tsx:77-151`, `src/lib/buildEditorContent.ts:164-217`, `git log -- src/components/TranscriptEditor/TranscriptEditor.tsx src/lib/format/editorFragments.ts src/context/DocumentContext.tsx src/extensions/UtteranceNode.ts src/lib/buildEditorContent.ts`.

## 1. Change-detection trace: why the header still says "No changes"

The toolbar reads directly from `DocumentContext.state.dirty`:

- `"Unsaved changes"` only appears when `state.dirty` is true. `src/components/Toolbar/Toolbar.tsx:88`
- `"No changes"` appears when `!state.dirty && !state.saveError && !state.lastSavedAt && !state.loading`. `src/components/Toolbar/Toolbar.tsx:102`
- The Save button is disabled when `!state.dirty || state.saving`. `src/components/Toolbar/Toolbar.tsx:116-119`

`dirty` is set only inside the reducer’s `EDIT_UTTERANCE` case:

- `EDIT_UTTERANCE` writes `workingTexts[utterance_id]`, sets `dirty: true`, and increments `editSeq`. `src/context/DocumentContext.tsx:114-135`

Nothing in `DocumentContext` marks text edits dirty on its own. The only live path that dispatches `EDIT_UTTERANCE` for editor typing is `TranscriptEditor`:

- Initial snapshot: `prevTextsRef.current = extractUtteranceTexts(editor);` after `setContent(..., { emitUpdate: false })`. `src/components/TranscriptEditor/TranscriptEditor.tsx:126-132`
- On every TipTap update, `handleUpdate()` extracts the new utterance text map and dispatches `editUtteranceRef.current(uttId, prev, newText)` only if `prev !== newText`. `src/components/TranscriptEditor/TranscriptEditor.tsx:139-147`
- The update listener is wired with `editor.on("update", handleUpdate)`. `src/components/TranscriptEditor/TranscriptEditor.tsx:150-151`

So if the editor reports `"No changes"` after a real edit, the broken link is upstream of save: the update listener is either not seeing a changed text map or is not dispatching `EDIT_UTTERANCE`.

## 2. What changed, and when

The reducer/save/auth code on the persistence side is older and unchanged by Phase 1:

- `saveNow()` and its `dirty` guard predate the CFE work. `src/context/DocumentContext.tsx:319-347`
- `workspaceApi.saveWorking()` predated the CFE work and still routes to the same contract API / RPC. `src/api/workspaceService.ts:625-632`
- `client.request()` still only throws `AuthRequiredError` if there is no token at request time. `src/api/client.ts:22-40`
- `getSupabaseAccessToken()` and the validated-session bootstrap live in `supabase.ts`; they were touched by the auth-session work, not by the save/change-detection path. `src/lib/supabase.ts:16-208`

History on the change-detection path:

- `TranscriptEditor` originally extracted utterance text directly from the ProseMirror utterance nodes. The refactor in `770e386` replaced that with `extractUtteranceTextsFromDoc()`. Evidence: `git show 770e386 -- src/components/TranscriptEditor/TranscriptEditor.tsx`
- `770e386` also introduced `src/lib/format/editorFragments.ts`, which reassembles utterance text by collecting all `utterance` nodes and `parts.join(" ")`. `src/lib/format/editorFragments.ts:17-56`
- `a0951fa` switched `buildEditorContent()` from the old direct-utterance builder to `cfe(...)`, so the editor’s source content changed from raw utterance word joins to formatter output with `line.words` and `trailing_space`. Evidence: `git show a0951fa -- src/lib/buildEditorContent.ts src/lib/format/cfe.ts`
- `18c73b7` added `prefix_text` to the utterance node render path and applied canonical spacing through the same formatter path. Evidence: `git show 18c73b7 -- src/lib/buildEditorContent.ts src/extensions/UtteranceNode.ts`

Plainly:

- **Not pre-existing** in the original save/auth implementation.
- **Not introduced by the auth-session fix** (`add15a8`, `e7f9394`) because that code does not participate in dirty tracking.
- **Introduced by the render/grouping refactor path**, with `770e386` changing the editor’s diff extractor and `a0951fa` making the editor consume CFE-built content.

## 3. Save-invocation trace: does persistence ever fire?

The save path is hard-gated by `dirty`:

- `saveNow()` returns immediately if `state.saving || !state.dirty || !state.document`. `src/context/DocumentContext.tsx:319-320`
- It also returns if `changes.length === 0`. `src/context/DocumentContext.tsx:321-324`
- Autosave is likewise gated by `state.dirty`; if `dirty` never flips, the timer never runs. `src/context/DocumentContext.tsx:337-347`

Only after those guards does the app invoke persistence:

- `workspaceApi.saveWorking(jobId, { changes, source: "editor" }, { lastKnownUpdatedAt })`. `src/context/DocumentContext.tsx:327-331`
- In real mode, `workspaceApi.saveWorking()` resolves the current transcript and calls `contractApi.saveWorking(target.transcript_id, payload)`. `src/api/workspaceService.ts:625-632`
- `contractApi.saveWorking()` issues the authenticated `PUT /:jobId/working` request. `src/api/client.ts:97-99`
- The edge function calls `editor_apply_working_changes`. `supabase/functions/editor-api/index.ts:394-411`

Because the toolbar stays on `"No changes"` and the Save control is disabled, the persistence call is **not firing at all**. The failure is before `workspaceApi.saveWorking()`.

## 4. Working-text mapping: would the RPC accept the payload if called?

Yes. The RPC expects an array of `{ utterance_id, working_text }` and tokenizes `working_text` by whitespace:

- `v_working_text := coalesce(v_change ->> 'working_text', '');`
- `v_tokens := regexp_split_to_array(btrim(v_working_text), '\s+');`
- It updates `transcript_words.text`, `working_text`, and `edited`, and writes a `transcript_audit_log` row. `supabase/migrations/20260606113000_editor_api_working_rpc.sql:17-130`

That means the current symptom is not “save fires but the RPC rejects the formatter-shaped utterance text.” The save call is being prevented before the RPC boundary.

## 5. Auth interaction

The auth-session fix is not the root cause here.

- `request()` only throws `AuthRequiredError` when there is no access token in real API mode. `src/api/client.ts:25-33`
- `getSupabaseAccessToken()` comes from `ensureSupabaseSession()` and the validated session path. `src/lib/supabase.ts:127-193`
- If auth were failing at save time, the visible symptom would be a save attempt ending in `SAVE_ERR` / `"Save failed"`, not the toolbar staying at `"No changes"` and the Save button remaining disabled.

So the auth path may still matter for actual persistence once dirty is fixed, but it is **not** what explains the current browser symptom.

## 6. AbortError classification

The wavesurfer/media error path is **benign with respect to save**.

- `AudioPlayer` routes media failures into `handleRecoverableError()`. `src/components/AudioPlayer/AudioPlayer.tsx:201-249`
- That recovery path only refreshes the media URL via `refreshMediaUrlRef.current(...)`, then reloads the current WaveSurfer instance. `src/components/AudioPlayer/AudioPlayer.tsx:225-247`
- `refreshMediaUrl()` in `DocumentContext` dispatches only `UPDATE_MEDIA_URL`; it does **not** dispatch `LOAD_OK`, clear `workingTexts`, or reset `dirty`. `src/context/DocumentContext.tsx:96-108,276-280`
- The component installs a media-element error listener and then calls `ws.load(resolvedMediaUrl)`. `src/components/AudioPlayer/AudioPlayer.tsx:349-351`

Classification: **benign / separate audio reload churn**, not the blocking save defect.

## 7. Minimal fix surface

The minimal fix surface is the editor change-detection seam:

1. Repair or instrument `TranscriptEditor.handleUpdate()` / `extractUtteranceTextsFromDoc()` so real typing against CFE-built utterance nodes reliably dispatches `EDIT_UTTERANCE`. Relevant files: `src/components/TranscriptEditor/TranscriptEditor.tsx`, `src/lib/format/editorFragments.ts`, `src/lib/buildEditorContent.ts`.
2. Add a regression test that simulates a real editor edit after `buildEditorContent()` loads CFE output and asserts:
   - `DocumentContext.state.dirty` becomes `true`
   - the toolbar leaves `"No changes"`
   - `saveNow()` reaches `workspaceApi.saveWorking()`

Schema impact: **none**.
