# Deepgram Wire Params Report

## Task 0 — Verification gate

- Date: 2026-06-09
- Starting HEAD: `1e5384f`
- Branch: `release/stage3-rc`

### 0.1 Baseline

- `git status`: clean
- `npm run typecheck`: passed
- `npm run test`: passed
- Test count: `228/228`

### 0.2 Defect location confirmation

Confirmed in `src/lib/deepgram/buildDeepgramRequest.ts` that `DEEPGRAM_REQUEST_PARAMS` currently contains both `diarize: "true"` and `diarize_model: "latest"`, and contains neither `mip_opt_out` nor `numerals`.

Exact current constant:

```ts
export const DEEPGRAM_REQUEST_PARAMS = {
  model: "nova-3",
  punctuate: "true",
  paragraphs: "true",
  diarize: "true",
  diarize_model: "latest",
  filler_words: "true",
  utterances: "true",
  smart_format: "true",
} as const;
```

### 0.3 Live Deepgram check

Live Deepgram verification BLOCKED — no `DEEPGRAM_API_KEY` in env.

No live request was sent.

### 0.4 Classification

- Classification: `unverified`
- Human interpretation: live rejection status could not be empirically confirmed in this environment because `DEEPGRAM_API_KEY` was unavailable.

## Final Summary

### Before / after `DEEPGRAM_REQUEST_PARAMS`

Before:

```ts
export const DEEPGRAM_REQUEST_PARAMS = {
  model: "nova-3",
  punctuate: "true",
  paragraphs: "true",
  diarize: "true",
  diarize_model: "latest",
  filler_words: "true",
  utterances: "true",
  smart_format: "true",
} as const;
```

After Task 2:

```ts
export const DEEPGRAM_REQUEST_PARAMS = {
  model: "nova-3",
  punctuate: "true",
  paragraphs: "true",
  diarize: "true",
  filler_words: "true",
  utterances: "true",
  smart_format: "true",
  mip_opt_out: "true",
} as const;
```

### Live-verification classification

- Final classification: `unverified`
- Reason: live Deepgram verification remained blocked because `DEEPGRAM_API_KEY` was not available in the environment.

### Commits completed

- Task 0: `1024850` — `docs(deepgram): record wire-parameter verification gate`
- Task 1: `bfce58e` — `fix(deepgram): drop conflicting diarize_model param, keep diarize=true`
- Task 2: `8f21b7d` — `feat(deepgram): send mip_opt_out=true for privileged deposition audio`

### Held pending validation

- Task 3 (`numerals=true`) was not shipped.
- Reason: no local evidence of the required gold-set validation by the court reporter; per prompt, this remains pending human validation.

### Scope confirmation

- No schema changes were made.
- No migrations were added.
- No dependencies were added.
- No architecture changes were made.
- Behavioral edits were limited to:
  - `src/lib/deepgram/buildDeepgramRequest.ts`
  - `src/lib/deepgram/buildDeepgramRequest.test.ts`
