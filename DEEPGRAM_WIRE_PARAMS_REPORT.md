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

