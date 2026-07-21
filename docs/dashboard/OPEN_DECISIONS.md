# Open Decisions

Generated:
2026-07-13

| Decision | Status | Owner | Impact |
| --- | --- | --- | --- |
| Deepgram paragraphs | Awaiting Wave 21 benchmark | James | Medium |
| Normalized WAV benchmark adoption | Awaiting Wave 21 audio experiment | James | Medium |
| Wave renumbering: insert Wave 24 Reporter Productivity and shift Deterministic/Punctuation/AI to 25/26/27 | Proposed in review; conflicts with frozen compiler library (W24 Deterministic, W25 Punctuation, W26 AI Context) | James | High |
| Canonical branch / default branch | DONE: release/2026.1 cut from trunk; main preserved (archive/main-pre-wave23). Phase A (release->main) held until RC validated; default stays trunk until then | James | High |
| Repository visibility | DONE: repository set Private (2026-07-13) | James | Low |
| Branch protection requires GitHub Pro on a private repo | BLOCKED: GitHub Free allows no branch protection/rulesets on private repos. Options: upgrade to Pro, or rely on CI Verify + a local pre-push hook. CI still runs on push/PR | James | High |
| main reconciliation: preserve bucket-B/C unique features | VERIFIED: multi-file + copy-transcript superseded on trunk; Stage S + dev-auth drop; only case-reuse (05996ad) unique -> defer to backlog. Reconciliation de-risked; needs GO + Stage-S drop ack | James | High |
