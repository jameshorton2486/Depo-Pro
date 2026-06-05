# BOUNDARY LOG

## 2026-06-05 — Prompt 2 Task 3 audio reducer seam

- Prompt/task assumption: Task 3 specifies writing the uploaded audio reference into `record.audio` via an "existing reducer action".
- Repo reality: no audio-specific action exists in [src/context/IntakeContext.tsx](/C:/Users/james/projects/depo-pro/src/context/IntakeContext.tsx:37) or [src/store/intakeReducer.ts](/C:/Users/james/projects/depo-pro/src/store/intakeReducer.ts:63). The current reducer only exposes generic extracted-field updates plus participant/exhibit collections.
- Smallest safe resolution: add a typed `setAudio` action that updates `record.audio` and marks the case dirty so the next save persists the metadata reference. This preserves the existing case shape and avoids inventing a parallel upload state store.
