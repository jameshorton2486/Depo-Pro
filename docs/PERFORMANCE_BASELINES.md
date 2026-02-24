# Performance Baselines — Depo-Pro Beta

Measurement template for establishing production baselines.
Run after each deploy to `main` using Chrome DevTools + Vercel Dashboard.

## How to Measure

1. Open Chrome DevTools → Network tab (disable cache)
2. Log in as a beta test user
3. Record each metric below — enter actual value + timestamp

---

## API Route Thresholds

Route slow-warning thresholds are enforced in code via `[perf:slow]` console warnings.
These are the **maximum acceptable** p95 values:

| Route | Slow Warning | Target p95 |
|---|---|---|
| `PATCH /api/jobs/[id]/review` | > 1 000 ms | < 400 ms |
| `POST /api/jobs/[id]/review/submit` | > 2 000 ms | < 800 ms |
| `GET /api/transcripts/[id]/export` | > 5 000 ms | < 3 000 ms |
| `GET /api/jobs` (dashboard list) | — | < 500 ms |
| `GET /api/health` | — | < 200 ms |

---

## Client-Side Baselines

| Metric | Target | How to Measure |
|---|---|---|
| Review page time-to-interactive | < 3 s | Lighthouse > Performance |
| First flagged word rendered | < 1.5 s | Network tab (after auth) |
| Correction save (optimistic) | < 100 ms | Network tab: PATCH latency |
| Export button → file download | < 10 s | Network tab: GET export |
| Audio seek → transcript sync | < 80 ms | Manual: click waveform, observe highlight |

---

## Baseline Recording

| Date | Deploy SHA | Review PATCH p95 | Export GET p95 | Notes |
|---|---|---|---|---|
| (fill in) | | | | Initial beta deploy |

---

## Vercel Dashboard Checks

- Function duration: Vercel → Functions tab → sort by duration (p95)
- Edge cache hit rate: should be > 0% for GET routes with `Cache-Control`
- Cold start frequency: `[perf:slow]` log filter in Vercel log search

---

## Regression Policy

If any route exceeds its **Target p95** for 3 consecutive deploys, open a performance
investigation issue before shipping any new feature work.
