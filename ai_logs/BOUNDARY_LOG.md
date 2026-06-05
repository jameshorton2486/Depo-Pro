# BOUNDARY LOG

## 2026-06-05 — Prompt 2 Task 3 audio reducer seam

- Prompt/task assumption: Task 3 specifies writing the uploaded audio reference into `record.audio` via an "existing reducer action".
- Repo reality: no audio-specific action exists in [src/context/IntakeContext.tsx](/C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:37) or [src/store/intakeReducer.ts](/C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:63). The current reducer only exposes generic extracted-field updates plus participant/exhibit collections.
- Smallest safe resolution: add a typed `setAudio` action that updates `record.audio` and marks the case dirty so the next save persists the metadata reference. This preserves the existing case shape and avoids inventing a parallel upload state store.

## 2026-06-05 — Prompt 5 Task 2 resumable audio upload dependency boundary

- Prompt/task goal: switch audio uploads to Supabase resumable TUS uploads for files over ~6 MB without adding new dependencies.
- Repo reality: the installed `@supabase/supabase-js` package does not expose a resumable upload helper. Supabase's current official Storage docs route resumable uploads through `tus-js-client` against the `/storage/v1/upload/resumable` endpoint.
- Locked scope constraint: Prompt 5 explicitly forbids adding a new dependency if resumable upload requires one.
- Smallest safe resolution: keep the existing single-shot upload path, add truthful client-side size rejection and friendly mapping of the server's "maximum allowed size" error, and leave the audio slot retryable on failure. Resumable/TUS remains deferred until the dependency rule changes or the installed Supabase client exposes first-party support.
